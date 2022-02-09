# oracle-provider-node

# ⚠️ DEPRECATED: Please use the newer FPO node: https://github.com/fluxprotocol/fpo-node

Provider node for pushing and settling data requests for first-party price feeds on EVM chains

## Usage

### Pre-requisites

You must have node.js installed. We are using `v14.18.1`.

## For providing data on an EVM chain
First, deploy a `FluxPriceFeed.sol` contract by [cloning the `price-feeds-evm` repository and following the README](https://github.com/fluxprotocol/price-feeds-evm), saving your contract address to use here. Alternatively, leave the default `appconfig.json` contract address to test your API sources without deploying a new contract, using a contract we deployed to Aurora with access control removed. 
You must deploy a new contract for each pair you provide on an EVM chain.

## For providing data on NEAR

To support the NEAR network, the `near-cli` package needs to be installed. (`npm i -g near-cli`)

### General Set-up

```bash
git clone https://github.com/fluxprotocol/oracle-provider-node
cd oracle-provider-node/
npm install
cp .env.example .env # add private key
nano appconfig.json # populate with contract address, API sources, network, and interval
```

To improve the project and receive better support please consider setting the `DISABLE_ANALYTICS` to `false`. No private keys will be submitted. 

In `appconfig.json`, each price pair is mapped to a single contract and can have any number of sources. The node will push the result of the last source that returns an answer, throwing out sources that do not respond.

## NEAR Setup

First login using the near-cli by doing `NEAR_ENV=testnet near login` (`NEAR_ENV=mainnet` for mainnet). This will store private keys inside the `~/.near-credentials/testnet` (or `/mainnet` for mainnet). If for some reason the data is not in those folders please manually copy the private key over from `~/.near-credentials/default` over to the desired network folder.


In the `appconfig.json` Make sure if you are using NEAR to change the accountId (containing `{{YOUR_ACCOUNT_ID}}`) with your accountId that you just used to login with. Also if you want to deploy for mainnet make sure the `networkType` is set to mainnet and `rpc` is set to `https://rpc.testnet.near.org`.

In the `.env` file you just created change the `NEAR_CREDENTIALS_STORE_PATH` to the root of the `near-credentials` folder. (For example `/home/myname/.near-credentials/`).

Near does not require a new contract deployment for each pair. Each pair is generated automaticly when you push a new pair. See [Contract addresses for NEAR](#contract-addresses) 
Near is also the only one to support batching of transactions, making it cheaper for you to push data on chain. Please see [Batching](#batching)  

# EVM Setup

Change in the `appconfig.json` the `chainId` and `rpc` to the desired EVM chain. Currently it's configured to use the Aurora EVM chain. 

Change in the `.env` the `AURORA_PRIVATE_KEY` to your private key (Not a mnemonic but the key that starts with 0x)


### Running

To run:

```bash
npm run start
```

## Configuring `appconfig.json`

|Key|Type|Description|
|---|---|---|
|networks|Network[]|An array of network configuration. (Explained below)
|pairs|Pair[]|An array of pricing pairs with there sources (Explained below)

### Network

Configuration for a specific network. Currently two types are supported. `evm` and `near`. You can use each network type multiple types to combine for example Avalanche, Polygon and Ethereum.

### evm

|Key|Type|Description|
|---|---|---|
|type|"evm"|Lets the node know this is an EVM type chain|
|networkId|string|A custom ID that you fill in. This will be used to connect pairs to a specific network configuration. Can be anything you want to identify the configuration|
|privateKeyEnvKey|string|The name of the env variable where the private key is stored. (can be set in the `.env` file)|
|chainId|number|The chain id of the EVM chain. (1 = Ethereum)|
|rpc|string|The URL to the Ethereum compatible RPC|

Example:

```JSON
{
    "networks": [
        {
            "type": "evm",
            "networkId": "aurora",
            "privateKeyEnvKey": "AURORA_PRIVATE_KEY",
            "chainId": 1313161554,
            "rpc": "https://mainnet.aurora.dev"
        }
    ]
}
```

### near

#### accessing / generating NEAR private keys
There's multiple ways to go about this. The simplest method would be to create, or sign in to, a NEAR account using the [near web wallet](https://wallet.near.org). And then calling `NEAR_ENV={NETWORK} near login` and following the steps provided by the CLI. This will generate a access keys in `~/.near-credentials/{NETWORK}/{MY_ACCOUNT}.near.json` which can then be copied into any environment.
We would also recommend for you to check out batching of transactions, this makes pushing data on chain be done 1 transaction instead of multiple saving you gas. See [Batching](#batching) for more information.

#### contract addresses
|Network|Contract address|
|---|---|
|testnet|fpo3.franklinwaller2.testnet|
|mainnet|fpo-v1.fluxoracle.near|


#### configuration

|Key|Type|Description|
|---|---|---|
|type|"near"|Lets the node know this is an EVM type chain|
|networkId|string|A custom ID that you fill in. This will be used to connect pairs to a specific network configuration. Can be anything you want to identify the configuration|
|credentialsStorePathEnvKey|string|The name of the env variable where the credentials are stored. Not required if you are using `privateKeyEnvKey`|
|privateKeyEnvKey|string|The name of the env variable where the private key is stored (can be set in the `.env` file). Not required if you are using `credentialsStorePathEnvKey`|
|networkType|string|Whether this network is "testnet" or "mainnet"|
|rpc|string|The URL to the Ethereum compatible RPC|
|accountId|string|The accountId coupled with the privateKey/credentials|

Example:

```JSON
{
    "networks": [
        {
            "type": "near",
            "networkId": "near-testnet",
            "credentialsStorePathEnvKey": "NEAR_CREDENTIALS_STORE_PATH",
            "networkType": "testnet",
            "rpc": "https://rpc.testnet.near.org",
            "maxGas": "300000000000000",
            "accountId": "franklinwaller2.testnet",
            "storageDeposit": "300800000000000000000000"
        }
    ]
}
```

## Pairs

Pairs include information for a specific pair such as which sources to fetch from, how often and where to post them.

|Key|Type|Description|
|---|---|---|
|description|string | undefined| Optional description tag in other to identify what pair this is.|
|pair|string|Info about the pair. Should be something like "ETH / USD". This info will also be posted on chain depending on the network.
|contractAddress|string| Which address to post the answers to. Mainnet can use `fpo-v1.fluxoracle.near`
|sources|Source[]|An array of sources. More on that below.
|interval|number|Interval between updates.|
|networkId|string|The id of the network in your `"networks"` configuration.|
|defaultDecimals|number|If there are no decimals configured, the node will use and submit a number containing this many decimals. Defaults to `6`|

## Batching

Batching allows you to push multiple price pushes in one transaction. This is only supported by the NEAR network. We recommend to only put around 20 price pairs in one batch. This has to do with the gaslimit of NEAR. More could be fit in but this should be tested on your own.

|Key|Type|Description|
|---|---|---|
|description|string|Allows you to identify which batch is currently processing. Required|
|interval|number|The interval the batch should be triggered at|
|networkId|string|The id of the network in your `"networks"` configuration.|
|pairs|`Pair[]`|An array of `Pair`. See above what kind of settings are required for those. Notice that settings like `interval` are ignored, since they are part of the batch.

Example:

```JSON
{
    "batches": [
        {
            "description": "Price data for NEAR",
            "contractAddress": "fpo3.franklinwaller2.testnet",
            "interval": 60000,
            "networkId": "near-testnet",
            "pairs": [
                {
                    "description": "ETH / USD for NEAR",
                    "pair": "ETH / USD",
                    "sources": [
                        {
                            "source_path": "market_data.current_price.usd",
                            "end_point": "https://api.coingecko.com/api/v3/coins/ethereum"
                        }
                    ],
                    "defaultDecimals": 6
                },
                {
                    "description": "NEAR / USD for NEAR",
                    "pair": "NEAR / USD",
                    "sources": [
                        {
                            "source_path": "market_data.current_price.usd",
                            "end_point": "https://api.coingecko.com/api/v3/coins/near"
                        }
                    ],
                    "defaultDecimals": 6
                }
            ]
        }
    ]
}

```

### Source

Information containing where to fetch data. Uses the [jsonpath-rust](https://github.com/besok/jsonpath-rust) package for finding values using keys.

|Key|Type|Description|
|---|---|---|
|source_path|string|Path to the number value. Uses [jsonpath-rust](https://github.com/besok/jsonpath-rust) for finding values.|
|end_point|string|The URL to a JSON API|
|multiplier|string / undefined|The result value will be multiplied against this value. Can be useful to normalize decimals. Defaults to not being used.|
|http_method|string|HTTP Method (GET, POST, etc)|
|http_body|string|Body to sent along http request|
|http_headers| { [key: string]: string }| Key -> Value pair of headers to attach to the request|

Example:

```JSON
{
    "pairs": [
        {
            "description": "ETH / USD for NEAR",
            "pair": "ETH / USD",
            "contractAddress": "fpo3.franklinwaller2.testnet",
            "sources": [
                {
                    "source_path": "market_data.current_price.usd",
                    "end_point": "https://api.coingecko.com/api/v3/coins/ethereum"
                }
            ],
            "interval": 5000,
            "networkId": "near-testnet",
            "defaultDecimals": 6
        }
    ]
}
```
