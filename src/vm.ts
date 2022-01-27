import logger from './services/LoggerService';
import toPath from 'lodash.topath';
import { readFile } from 'fs/promises'
import PairInfo, { convertPairInfoToString } from './models/PairInfo';
import { execute, InMemoryCache } from '@fluxprotocol/oracle-vm';
import { createPairId } from './models/AppConfig';

export function convertOldSourcePath(sourcePath: string): string {
    // Keep support for more functions
    if (sourcePath.startsWith('$')) {
        return sourcePath;
    }

    const pathCrumbs = toPath(sourcePath);
    let result = '$';

    pathCrumbs.forEach((crumb) => {
        // Is an array path
        if (!isNaN(Number(crumb))) {
            result += `[${crumb}]`;
        } else if (crumb === '$$last') {
            result += '[-1:]';
        } else {
            result += `.${crumb}`;
        }
    });

    return result;
}

let cachedDefaultBinary: Buffer;

export const WASM_LOCATION = process.env.WASM_LOCATION ?? './basic-fetch.wasm';

async function loadBinary() {
    try {
        if (cachedDefaultBinary) {
            return cachedDefaultBinary;
        }

        cachedDefaultBinary = await readFile(WASM_LOCATION);
        return cachedDefaultBinary;
    } catch (error) {
        logger.error(`Could not load binary at ${WASM_LOCATION}: ${error}`);
        process.exit(1);
    }
}

loadBinary();

const vmCache = new InMemoryCache();

export async function resolveSources(pair: PairInfo): Promise<string | null> {
    try {
        const binary = await loadBinary();
        const args: string[] = [
            '0x0000000000000000000000000000000000000001', // id of the wasm file
            JSON.stringify(pair.sources.map((source) => ({
                ...source,
                source_path: convertOldSourcePath(source.source_path),
            }))),
            'number',
            (10 ** pair.decimals).toString(),
        ];

        const executeResult = await execute({
            args,
            env: {},
            gasLimit: (300_000_000_000_000).toString(),
            randomSeed: '0x0001',
            timestamp: 1,
            binary,
        }, vmCache);

        if (executeResult.code !== 0) {
            if (executeResult.code === 3) {
                logger.warn(`[vm] One or more sources could not be resolved for ${createPairId(pair)}`, {
                    logs: executeResult.logs,
                    pair: convertPairInfoToString(pair),
                });
            } else {
                logger.error(`[vm] Exited with code ${executeResult.code} ${executeResult.logs} ${convertPairInfoToString(pair)}`);
                return null;
            }
        }

        const lastLog = executeResult.logs.pop();

        if (!lastLog) {
            logger.error(`[vm] No logs outputted ${executeResult.code} ${executeResult.logs}`);
            return null;
        }

        const logResult = JSON.parse(lastLog);

        if (logResult.type !== 'Valid') {
            logger.error(`[vm] Invalid request ${executeResult.code} ${executeResult.logs}`);
            return null;
        }

        logger.debug(`[vm] ${createPairId(pair)}: \n${executeResult.logs.join('\n')}`);

        return logResult.value;
    } catch (error: any) {
        logger.error(`[vm] ${error.toString()}`)
        return null;
    }
}
