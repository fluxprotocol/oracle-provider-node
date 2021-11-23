import path from 'path';
import { connect, keyStores, Near, utils, Account, providers } from "near-api-js";
import { NearNetwork, Network } from '../../models/AppConfig';
import cache from '../../services/CacheUtils';

export function validateNearConfig(networkConfig: Network) {
    if (networkConfig.type !== 'near') {
        throw new Error('Config is not a near config');
    }

    if (!networkConfig.accountId) {
        throw new Error(`'accountId' should be set`);
    }

    if (!networkConfig.credentialsStorePathEnvKey && !networkConfig.privateKeyEnvKey) {
        throw new Error(`Either 'credentialsStorePathEnvKey' or 'privateKeyEnvKey' needs to be filled in`);
    }

    if (networkConfig.privateKeyEnvKey && !process.env[networkConfig.privateKeyEnvKey]) {
        throw new Error(`'privateKeyEnvKey' was set but it did not exist in the env`);
    }

    if (!networkConfig.networkType) {
        throw new Error(`'networkType' is not set. Should be testnet/mainnet`);
    }

    if (!networkConfig.rpc) {
        throw new Error(`'rpc' is not set`);
    }
}

export async function connectToNear(networkConfig: NearNetwork): Promise<Near> {
    let keyStore: keyStores.KeyStore | undefined;
    const networkId = networkConfig.networkType ?? 'testnet';
    const credentialsStore = process.env[networkConfig.credentialsStorePathEnvKey ?? ''] ?? '';

    if (credentialsStore) {
        const credentialsStorePath = path.resolve(credentialsStore) + path.sep;
        keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsStorePath);
    } else if (networkConfig.privateKeyEnvKey) {
        const privateKey = process.env[networkConfig.privateKeyEnvKey] ?? '';
        const keyPair = utils.KeyPair.fromString(privateKey);
        keyStore = new keyStores.InMemoryKeyStore();
        keyStore.setKey(networkId, networkConfig.accountId ?? '', keyPair);
    }

    if (!keyStore) throw new Error('Key store could not be created due lack of private key');

    return connect({
        networkId,
        nodeUrl: networkConfig.rpc ?? '',
        deps: {
            keyStore,
        }
    });
}

export function getAccount(near: Near, accountId: string): Promise<Account> {
    return cache(`near_account_${accountId}`, async () => {
        return near.account(accountId);
    });
}

export function isTransactionFailure(executionOutcome: providers.FinalExecutionOutcome) {
    return executionOutcome.receipts_outcome.some((receipt) => {
        if (typeof receipt.outcome.status === 'string') {
            return false;
        }

        if (receipt.outcome.status?.Failure) {
            return true;
        }

        return false;
    });
}
