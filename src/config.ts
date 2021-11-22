import { config } from 'dotenv';
import EvmProvider from "./providers/evm/EvmProvider";

config();

export const AVAILABLE_PROVIDERS = [EvmProvider];
export const MAX_LOG_LIFETIME = '14d';
export const APP_CONFIG_LOCATION = process.env.APP_CONFIG_LOCATION ?? './appconfig.json'
export const DEBUG = process.env.DEBUG === 'true';
