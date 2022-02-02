# Block bridging

Bridges over a block hash and receipt root to a specific destination chain.
This is an extension on the README.md. Please refer to the README for configuring the node.

## Pre-requisites

You should deploy the `FluxLayerZeroOracle.sol` that you can find on our [Github Repository](https://github.com/fluxprotocol/price-feeds-evm/tree/feat/layer-zero).

If you would like an unrestricted access version you can use one of the following:

|Network|Address|
|---|----|
|Aurora Mainnet|`0xFd6956a74ED7fF3E53Edc8b17168260905a8f407`|
|Ethereum Gorli|`0x19f3E5340d5b0B9E5E1B076e11C9C1572d55349c`|

## Configuring the appconfig.json

The following options are required (aside from the usual required options defined in the README) in the networks config in order to make bridging work.

### `"networks"`

|Key|Type|Description|
|---|---|---|
|wssRpc|string|The Websocket RPC URL from the specific chain. This is to listen to any events happening on that chain|
|bridgeChainId|number|Id you want to assign this network to. This is used to identify to which network the request should be bridged to. In layerzero this is defined as "chainId"|
|oracleContractAddress|string| The address of the deployed `FluxLayerZeroOracle.sol` contract.

Example:

```JSON
{
    "networks": [
        {
            "type": "evm",
            "networkId": "aurora",
            "privateKeyEnvKey": "AURORA_PRIVATE_KEY",
            "chainId": 1313161554,
            "rpc": "https://mainnet.aurora.dev",
            "wssRpc": "wss://1a67ac2cb6d7.relayer.mainnet.partners.aurora.dev",
            "bridgeChainId": 3,
            "oracleContractAddress": "0xFd6956a74ED7fF3E53Edc8b17168260905a8f407"
        }
    ]
}
```

### `"requestListeners"`

This will use the websocket RPC to listen to any block notify events and act accordingly. 
`"requestListeners"` is an array in the root of the appconfig.json

|Key|Type|Description|
|---|---|---|
|contractAddress|string|The address of the deployed `FluxLayerZeroOracle.sol` contract.
|networkId|string|The network id that matches the `networkId` in your `networks` configuration
|bridgeChainId|number|The bridge chain id. Must match the `bridgeChainId` in your `networks` configuration

Example:

```JSON
{
    "requestListeners": [
        {
            "contractAddress": "0xFd6956a74ED7fF3E53Edc8b17168260905a8f407",
            "networkId": "aurora",
            "bridgeChainId": 3
        }
    ]
}
```

