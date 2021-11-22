export interface SourceInfo {
    source_path: string;
    end_point: string;
}

export interface Pair {
    description: string;
    contractAddress: string;
    sources: SourceInfo[];
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

export type Network = EvmNetwork;

export default interface AppConfig {
    pairs: Pair[];
    networks: Network[];
}
