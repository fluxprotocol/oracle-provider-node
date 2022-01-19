export interface SourceInfo {
    source_path: string;
    end_point: string;
    multiplier: string;
}

export interface Pair {
    description: string;
    pair: string;
    contractAddress: string;
    sources: SourceInfo[];
    interval: number;
    networkId: string;
    defaultDecimals?: number;
}

export interface Batch {
    pairs: Pair[];
    contractAddress: string;
    description: string;
    interval: number;
    networkId: string;
}

export interface EvmNetwork {
    type: "evm";
    networkId?: string;
    privateKeyEnvKey?: string;
    chainId?: number;
    rpc?: string;
}

export interface NearNetwork {
    type: "near";
    networkId?: string;
    credentialsStorePathEnvKey?: string;
    privateKeyEnvKey?: string;
    networkType?: string;
    rpc?: string;
    accountId?: string;
    maxGas?: string;
    storageDeposit?: string;
}

export type Network = EvmNetwork | NearNetwork;

export default interface AppConfig {
    pairs?: Pair[];
    batches?: Batch[];
    networks?: Network[];
}

export function isBatch(pair: Pair | Batch): pair is Batch {
    return pair.hasOwnProperty('pairs');
}

export function createPairId(pair: Pair | Batch) {
    if (isBatch(pair)) {
        return `${pair.networkId}-${pair.description}-${pair.pairs[0].pair}-${pair.interval}`;
    }

    return `${pair.networkId}-${pair.pair}-${pair.contractAddress}`;
}
