# @cosmjs/cosmwasm-stargate

[![npm version](https://img.shields.io/npm/v/@cosmjs/cosmwasm-stargate.svg)](https://www.npmjs.com/package/@cosmjs/cosmwasm-stargate)

An SDK to build CosmWasm clients.

## Compatibility

| CosmWasm        | x/wasm    | @cosmjs/cosmwasm-stargate |
| --------------- | --------- | ------------------------- |
| 0.16-1.0.0-beta | 0.21-0.23 | `^0.28.0`                 |
| 0.16-1.0.0-beta | 0.21-0.23 | `^0.27.0`                 |
| 0.16-1.0.0-beta | 0.18-0.20 | `^0.26.0`                 |
| 0.14            | 0.16      | `^0.25.0`                 |
| 0.13            | 0.14-0.15 | `^0.24.0`                 |

## Development

Updating Hackatom development contract in `src/testdata/contract.json`:

```sh
cd packages/cosmwasm-stargate
export HACKATOM_URL=https://github.com/CosmWasm/cosmwasm/releases/download/v1.0.0-beta/hackatom.wasm
echo "{\"// source\": \"$HACKATOM_URL\", \"data\": \"$(curl -sS  --location $HACKATOM_URL | base64 | tr -d '[:space:]')\" }" | jq > src/testdata/contract.json
```

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/stargate

[![npm version](https://img.shields.io/npm/v/@cosmjs/stargate.svg)](https://www.npmjs.com/package/@cosmjs/stargate)

A client library for the Cosmos SDK 0.40+.

## Supported Cosmos SDK versions

| CosmJS version                  | Supported Cosmos SDK version(s) |
| ------------------------------- | ------------------------------- |
| ^0.29.0                         | 0.44.x, 0.45.x, 0.46.x          |
| ^0.28.0                         | 0.42.x, 0.44.x, 0.45.x          |
| ^0.27.0                         | 0.42.x, 0.44.x, 0.45.x          |
| ^0.26.0                         | 0.42.x                          |
| ^0.25.0                         | 0.42.x                          |
| ^0.24.0                         | 0.40.x, 0.41.x, 0.42.x          |
| ^0.24.0-alpha.14                | 0.40.0                          |
| ^0.24.0-alpha.8                 | 0.40.0-rc3                      |
| 0.24.0-alpha.2 – 0.24.0-alpha.7 | 0.40.0-rc2                      |
| 0.24.0-alpha.1                  | 0.40.0-rc1                      |

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/amino

[![npm version](https://img.shields.io/npm/v/@cosmjs/amino.svg)](https://www.npmjs.com/package/@cosmjs/amino)

Helpers for Amino for @cosmjs/stargate.

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/crypto

[![npm version](https://img.shields.io/npm/v/@cosmjs/crypto.svg)](https://www.npmjs.com/package/@cosmjs/crypto)

This package contains low-level cryptographic functionality used in other
@cosmjs libraries. Little of it is implemented here, but mainly it is a curation
of external libraries along with correctness tests. We add type safety, some
more checks, and a simple API to these libraries. This can also be freely
imported outside of CosmJS based applications.

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/encoding

[![npm version](https://img.shields.io/npm/v/@cosmjs/encoding.svg)](https://www.npmjs.com/package/@cosmjs/encoding)

This package is an extension to the JavaScript standard library that is not
bound to blockchain products. It provides basic hex/base64/ascii encoding to
Uint8Array that doesn't rely on Buffer and also provides better error messages
on invalid input.

## Convert between bech32 and hex addresses

```
>> toBech32("tiov", fromHex("1234ABCD0000AA0000FFFF0000AA00001234ABCD"))
'tiov1zg62hngqqz4qqq8lluqqp2sqqqfrf27dzrrmea'
>> toHex(fromBech32("tiov1zg62hngqqz4qqq8lluqqp2sqqqfrf27dzrrmea").data)
'1234abcd0000aa0000ffff0000aa00001234abcd'
```

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/json-rpc

[![npm version](https://img.shields.io/npm/v/@cosmjs/json-rpc.svg)](https://www.npmjs.com/package/@cosmjs/json-rpc)

This package provides a light framework for implementing a
[JSON-RPC 2.0 API](https://www.jsonrpc.org/specification).

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/math

[![npm version](https://img.shields.io/npm/v/@cosmjs/math.svg)](https://www.npmjs.com/package/@cosmjs/math)

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/proto-signing

[![npm version](https://img.shields.io/npm/v/@cosmjs/proto-signing.svg)](https://www.npmjs.com/package/@cosmjs/proto-signing)

Utilities for protobuf based signing (for Cosmos SDK 0.40+) as documented in
[ADR-020](https://github.com/cosmos/cosmos-sdk/blob/66c5798cec/docs/architecture/adr-020-protobuf-transaction-encoding.md)
and
[The 3 levels of proto encoding](https://warta.it/blog/cosmos-sdk-protobuf-signing).

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/socket

[![npm version](https://img.shields.io/npm/v/@cosmjs/socket.svg)](https://www.npmjs.com/package/@cosmjs/socket)

@cosmjs/socket is a collection of helper methods and classes for working with
WebSockets.

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/stream

[![npm version](https://img.shields.io/npm/v/@cosmjs/stream.svg)](https://www.npmjs.com/package/@cosmjs/stream)

@cosmjs/stream are some helper methods and classes to help with stream
processing.

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/tendermint-rpc

[![npm version](https://img.shields.io/npm/v/@cosmjs/tendermint-rpc.svg)](https://www.npmjs.com/package/@cosmjs/tendermint-rpc)

This package provides a type-safe wrapper around
[Tendermint RPC](https://docs.tendermint.com/master/rpc/). Notably, all binary
data is passed in and out as `Uint8Array`, and this module is reponsible for the
hex/base64 encoding/decoding depending on the field and version of Tendermint.
Also handles converting numbers to and from strings.

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
# @cosmjs/utils

[![npm version](https://img.shields.io/npm/v/@cosmjs/utils.svg)](https://www.npmjs.com/package/@cosmjs/utils)

Utility functions independent of blockchain applications. Primarily used for
testing but stuff like `sleep` can also be useful at runtime.

## License

This package is part of the cosmjs repository, licensed under the Apache License
2.0 (see [NOTICE](https://github.com/cosmos/cosmjs/blob/main/NOTICE) and
[LICENSE](https://github.com/cosmos/cosmjs/blob/main/LICENSE)).
