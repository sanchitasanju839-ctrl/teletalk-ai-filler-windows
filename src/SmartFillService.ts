import { DeepSeekAPI } from './services/DeepSeek';

type AnyObj = Record<string, any>;

type MappingResult = {
  mapping: Record<string, any>;
  meta: {
    directCount: number;
    aiCount: number;
    totalCount: number;
    aiError?: string;
  };
};

export class SmartFillService {
  static async getMapping(formStructure: AnyObj[], userData: AnyObj): Promise<MappingResult> {
    const direct = this.buildDirectMapping(formStructure, userData);

    const unmatched = formStructure.filter((f) => {
      const selector = this.selectorForField(f);
      return !selector || direct[selector] === undefined;
    });

    let aiMapping: Record<string, any> = {};
    let aiError: string | undefined;

    if (unmatched.length > 0) {
      try {
        aiMapping = await this.getAiMapping(unmatched, userData);
      } catch (error: any) {
        aiError = error?.message || 'AI mapping failed';
        console.warn(`[SmartFillService] AI fallback skipped: ${aiError}`);
      }
    }

    // Direct mapping has priority because it's exact export.json data.
    for (const [k, v] of Object.entries(aiMapping)) {
      if (direct[k] === undefined && v !== undefined && v !== null) {
        direct[k] = v;
      }
    }

    return {
      mapping: direct,
      meta: {
        directCount: Object.keys(this.buildDirectMapping(formStructure, userData)).length,
        aiCount: Object.keys(aiMapping).length,
        totalCount: Object.keys(direct).length,
        aiError
      }
    };
  }

  private static selectorForField(field: AnyObj): string | null {
    if (field?.name) return `[name="${String(field.name)}"]`;
    if (field?.id) return `#${String(field.id)}`;
    return null;
  }

  private static normalizeSelectorKey(key: string): string {
    return key.replace(/\s+/g, '').replace(/'/g, '"').toLowerCase();
  }

  private static extractNameFromSelector(key: string): string | null {
    const m = key.match(/\[name=['\"]?([^'\"\]]+)['\"]?\]/i);
    return m ? m[1].trim().toLowerCase() : null;
  }

  private static extractIdFromSelector(key: string): string | null {
    const m = key.match(/^#([A-Za-z0-9_-]+)/);
    return m ? m[1].trim().toLowerCase() : null;
  }

  private static fieldEntries(userData: AnyObj): Array<{ key: string; value: any }> {
    const fields = Array.isArray(userData?.fields) ? userData.fields : [];
    return fields
      .filter((f: any) => f && typeof f.key === 'string')
      .map((f: any) => ({ key: f.key, value: f.value }));
  }

  private static buildDirectMapping(formStructure: AnyObj[], userData: AnyObj): Record<string, any> {
    const entries = this.fieldEntries(userData);

    const byExact = new Map<string, any>();
    const byName = new Map<string, any>();
    const byId = new Map<string, any>();

    for (const e of entries) {
      byExact.set(this.normalizeSelectorKey(e.key), e.value);
      const n = this.extractNameFromSelector(e.key);
      const i = this.extractIdFromSelector(e.key);
      if (n) byName.set(n, e.value);
      if (i) byId.set(i, e.value);
    }

    const mapping: Record<string, any> = {};

    for (const field of formStructure) {
      const selector = this.selectorForField(field);
      if (!selector) continue;

      const name = field?.name ? String(field.name).toLowerCase() : '';
      const id = field?.id ? String(field.id).toLowerCase() : '';

      const exactValue = byExact.get(this.normalizeSelectorKey(selector));
      const nameValue = name ? byName.get(name) : undefined;
      const idValue = id ? byId.get(id) : undefined;

      const value = exactValue ?? nameValue ?? idValue;
      if (value !== undefined && value !== null && String(value).length > 0) {
        mapping[selector] = value;
      }
    }

    return mapping;
  }

  private static async getAiMapping(formStructure: AnyObj[], userData: AnyObj): Promise<Record<string, any>> {
    const api = new DeepSeekAPI();
    await api.init();

    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[SmartFillService] AI attempt ${attempt}/3...`);
        const sessionId = await api.createSession();

        const prompt = `
You map Teletalk form fields to user data.
Return ONLY a JSON object where keys are CSS selectors and values are field values.

Form Structure:
${JSON.stringify(formStructure, null, 2)}

User Data:
${JSON.stringify(userData, null, 2)}
`;

        let responseText = '';
        const iterator = api.chatCompletion(sessionId, prompt, false);
        for await (const chunk of iterator) {
          if (chunk.content) responseText += chunk.content;
        }

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return JSON.parse(responseText);
      } catch (error: any) {
        lastError = error;
        const msg = error?.message || '';
        if (msg.includes('parallel_chat_limit') || msg.includes('try again later')) {
          await new Promise((resolve) => setTimeout(resolve, 8000));
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('AI mapping failed');
  }
}
