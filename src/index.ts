import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SmartFillService } from './SmartFillService';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

function readExportJson() {
  const desktopPath = path.join(os.homedir(), 'Desktop');
  const exportPath = path.resolve(desktopPath, 'export.json');
  if (fs.existsSync(exportPath)) {
    return JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  }
  const localPath = path.resolve(process.cwd(), 'export.json');
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  }
  throw new Error('export.json not found on desktop or project root.');
}

app.get('/api/web/user-data', async (_req, res) => {
  try {
    const data = readExportJson();
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/smart-fill', async (req, res) => {
  const fieldCount = req.body?.formStructure?.length || 0;
  const deepseekMode = req.body?.deepseekMode || 'expert';
  console.log(`smart-fill request fields=${fieldCount} mode=${deepseekMode}`);

  try {
    let { formStructure, userData } = req.body;

    if (!Array.isArray(formStructure) || formStructure.length === 0) {
      return res.status(400).json({ error: 'formStructure must be a non-empty array.' });
    }

    if (!userData || !Array.isArray(userData.fields) || userData.fields.length === 0) {
      userData = readExportJson();
    }

    const result = await SmartFillService.getMapping(formStructure, userData, deepseekMode);
    console.log('mapping done total=' + result.meta.totalCount);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('smart-fill error', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

app.get('/', (_req, res) => {
  res.send('Teletalk Smart Fill AI Engine is Running');
});

const PORT = 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('Smart Fill Server running on 0.0.0.0:' + PORT);
});

server.timeout = 300000;
