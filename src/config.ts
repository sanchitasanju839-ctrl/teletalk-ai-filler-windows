import dotenv from 'dotenv';
import os from 'os';
import { getRuntimeTokens } from './utils/tokens';
dotenv.config();

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function parsePositiveInt(value: string | undefined, fallback: number, min: number = 1) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

const parsedTokens = getRuntimeTokens();
const defaultPowWorkerPoolSize = Math.max(2, Math.min(8, Math.floor(Math.max(1, os.cpus().length) / 2)));

export const config = {
  // Credentials
  DEEPSEEK_TOKEN: parsedTokens[0] || '',
  DEEPSEEK_TOKENS: parsedTokens,

  // Config Toggles
  ENABLE_WEB_SEARCH: false,
  MAX_RETRIES: 3,

  // Worker Runtime Controls
  POW_WORKER_POOL_ENABLED: true,
  POW_WORKER_POOL_SIZE: defaultPowWorkerPoolSize,
  POW_WORKER_READY_TIMEOUT_MS: 15000,
  POW_WORKER_RESTART_DELAY_MS: 1500,
  API_REQUEST_TIMEOUT_MS: 60000,
  UPLOAD_REQUEST_TIMEOUT_MS: 150000,
  STREAM_REQUEST_TIMEOUT_MS: 180000,
  POW_MAX_RETRIES: 5,
  POW_RETRY_BASE_DELAY_MS: 1200,
  POW_RETRY_MAX_DELAY_MS: 10000,
  POW_PENDING_CHALLENGE_DELAY_MS: 2000,
  POW_PENDING_CHALLENGE_MAX_WAIT_MS: 30000,
  SERIALIZE_POW_SOLVE: true,
  SERIALIZE_UPLOAD_PIPELINE: false,
  FILE_METADATA_MISSING_GRACE_MS: 300000,
  
  // Paths
  WASM_PATH: process.env.WASM_PATH || 'src/wasm/sha3_wasm_bg.wasm'
};
