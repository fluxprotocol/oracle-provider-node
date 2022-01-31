import { Network } from "../../models/AppConfig";
import { BridgeChainId } from "../../models/BridgeChainId";

const PROVIDER_NAME = 'evm';

export interface EvmConfig {
    privateKey: string;
    rpc: string;
    chainId: number;
    blockPollingInterval: number;
    bridgeChainId: BridgeChainId;
    wssRpc?: string;
}

export function validateEvmConfig(networkConfig: Network, env: NodeJS.ProcessEnv = {}) {
    if (networkConfig.type !== 'evm') {
        throw new Error('type should be evm');
    }

    if (!env[networkConfig.privateKeyEnvKey ?? '']) {
        throw new Error(`privateKeyEnvKey option "${networkConfig.privateKeyEnvKey}" is required for ${PROVIDER_NAME}`);
    }

    if (!networkConfig.chainId) {
        throw new Error(`option "chainId" is required for ${PROVIDER_NAME}`);
    }

    if (!networkConfig.rpc) {
        throw new Error(`option "rpc" is required for ${PROVIDER_NAME}"`);
    }
}

export function parseEvmConfig(networkConfig: Network, env: NodeJS.ProcessEnv = {}): EvmConfig {
    if (networkConfig.type !== 'evm') {
        throw new Error('Type should be evm');
    }

    return {
        privateKey: env[networkConfig.privateKeyEnvKey ?? ''] ?? '',
        chainId: Number(networkConfig.chainId ?? 0),
        rpc: networkConfig.rpc ?? '',
        blockPollingInterval: networkConfig.blockPollingInterval ?? 5_000,
        bridgeChainId: networkConfig.bridgeChainId ?? 0,
        wssRpc: networkConfig.wssRpc,
    };
}
