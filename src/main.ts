import death from 'death';
import { APP_CONFIG_LOCATION, AVAILABLE_PROVIDERS, DEBUG } from "./config";
import logger from './services/LoggerService';
import { readFile } from 'fs/promises';
import AppConfig, { Batch } from "./models/AppConfig";
import NetworkQueue from './services/NetworkQueue';

async function main() {
    try {
        logger.info('🚀 Starting provider validator for the Flux Oracle');
        logger.transports.forEach((transport) => {
            // @ts-ignore
            if (transport.name === 'console') {
                transport.level = DEBUG ? 'debug' : 'info';
            }
        });

        const appConfig: AppConfig = JSON.parse((await readFile(APP_CONFIG_LOCATION)).toString('utf-8'));

        if (!appConfig.networks) {
            console.error('No networks configured');
            process.exit(1);
            return;
        }

        const providers = appConfig.networks?.map(network => {
            const provider = AVAILABLE_PROVIDERS.find(p => p.type === network.type);
            if (!provider) throw new Error(`Could not find provider ${network.type}`);

            return new provider(network);
        });

        await Promise.all(providers.map(p => p.init()));

        const queues = providers.map(provider => new NetworkQueue(provider));
        const batches: Batch[] = appConfig.batches ?? [];

        // Convert everything to batches to make the project less error-prone
        appConfig.pairs?.forEach((pair) => {
            batches.push({
                description: pair.description,
                interval: pair.interval,
                networkId: pair.networkId,
                pairs: [pair],
                contractAddress: pair.contractAddress,
            });
        });

        const timers = batches.map((batch) => {
            const queue = queues.find(queue => queue.id === batch.networkId);
            if (!queue) {
                throw new Error(`Could not find provider for ${batch.networkId}`);
            }

            if (queue.provider.networkConfig.type !== 'near') {
                // Near can handle more than 1 pair. EVM chains cannot
                // But since we try to unify everything 1 pair in a batch is allowed
                if (batch.pairs.length > 1) {
                    logger.error('Only NEAR supports batching multiple transactions');
                    process.exit(1);
                }
            }

            // Making sure all pairs contain a contract address, used for debugging
            batch.pairs = batch.pairs.map((pair) => ({
                ...pair,
                contractAddress: batch.contractAddress,
            }));

            return setInterval(async () => {
                queue.add(batch);
            }, batch.interval);
        });

        queues.forEach(queue => queue.start());
        logger.info('🚀 Booted');

        death(() => {
            timers.forEach(t => clearInterval(t));
            queues.forEach(q => q.stop());
            process.exit(0);
        });
    } catch (error: any) {
        logger.error(`[main] ${error.toString()}`);
        process.exit(1);
    }
}

main();
