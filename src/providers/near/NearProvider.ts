import { Account } from "near-api-js";
import { NearNetwork, Network, Pair } from "../../models/AppConfig";
import IProvider from "../IProvider";
import logger from '../../services/LoggerService';
import { connectToNear, getAccount, isTransactionFailure, validateNearConfig } from "./NearConnectService";
import { resolveSources } from "../../vm";
import { BN } from "bn.js";
import { getDecimalsForPair, pushDataOnPair } from "./NearPairService";

export default class NearProvider extends IProvider {
    static type = 'near';
    account?: Account;
    nearConfig: NearNetwork;

    constructor(networkConfig: Network) {
        super(networkConfig);

        validateNearConfig(networkConfig);

        this.nearConfig = networkConfig as NearNetwork;
    }

    async init() {
        if (this.networkConfig.type !== 'near') {
            throw new Error('Type should be near');
        }

        const near = await connectToNear(this.networkConfig);
        this.account = await getAccount(near, this.networkConfig.accountId ?? '');
    }

    async resolvePair(pair: Pair): Promise<string | null> {
        try {
            // TODO: Resolve decimals
            if (!this.account) {
                logger.error(`[${pair.networkId}] No logged in account found`);
                return null;
            }

            const info = await getDecimalsForPair(pair, this.account);
            const answer = await resolveSources({
                ...pair,
                decimals: info.decimals,
            });

            if (!answer) return null;

            await pushDataOnPair({
                ...pair,
                decimals: info.decimals,
            }, answer, info.pairExists, this.nearConfig, this.account);

            return answer;
        } catch (error: any) {
            logger.error(`[${pair.networkId}] Could not resolve ${pair.pair} - ${error.toString()}`);
            return null;
        }
    }
}
