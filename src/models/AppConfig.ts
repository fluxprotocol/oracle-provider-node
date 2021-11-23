export interface SourceInfo {
    source_path: string;
    end_point: string;
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
    pairs: Pair[];
    networks: Network[];
}
