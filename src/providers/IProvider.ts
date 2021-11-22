import { Network, Pair } from "../models/AppConfig";
export default class IProvider {
    static type = "iprovider";
    networkId: string;

    constructor(public networkConfig: Network) {
        this.networkId = networkConfig.networkId ?? 'iprovider';
    }

    init(): Promise<void> { return Promise.resolve() };
    resolvePair(pair: Pair): Promise<string | null> { return Promise.resolve(null) }
}
