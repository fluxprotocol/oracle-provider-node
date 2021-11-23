import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { Network, Pair } from "../../models/AppConfig";
import IProvider from "../IProvider";
import { EvmConfig, parseEvmConfig, validateEvmConfig } from "./EvmConfig";
import { EvmPairInfo, createPriceFeedContract } from "./EvmContract";
import logger from '../../services/LoggerService';
import { resolveSources } from '../../vm';


class EvmProvider extends IProvider {
    static type = 'evm';

    wallet: Wallet;
    config: EvmConfig;
    pairInfo: Map<string, EvmPairInfo> = new Map();

    constructor(networkConfig: Network) {
        super(networkConfig);
        validateEvmConfig(networkConfig, process.env);

        this.config = parseEvmConfig(networkConfig, process.env);
        this.wallet = new Wallet(this.config.privateKey, new JsonRpcProvider(this.config.rpc));
        logger.info(`[${networkConfig.networkId}] Using address: ${this.wallet.address}`);
    }

    async init() {}

    async resolvePair(pair: Pair): Promise<string | null> {
        try {
            let pairInfo = this.pairInfo.get(pair.contractAddress);

            if (!pairInfo) {
                pairInfo = await createPriceFeedContract(pair, this.wallet);
                this.pairInfo.set(pair.contractAddress, pairInfo);
            }

            const answer = await resolveSources(pairInfo);
            if (!answer) return null;

            await pairInfo.contract.transmit(answer);

            return answer;
        } catch (error: any) {
            logger.error(`[${pair.networkId}] Could not resolve ${pair.pair} - ${error.toString()}`);
            return null;
        }
    }
}

export default EvmProvider;
