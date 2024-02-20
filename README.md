# CosmJS-ESM

## About this package

This library powers [`@fadroma/cw`](https://www.npmjs.com/package/@fadroma/cw),
the generic Cosmos client library.

It is part of [`@hackbg/fadroma`](https://fadroma.tech), the portable
full-stack groundwork for decentralized applications that is maintained
by [Hack.bg](https://hack.bg).

Contact us at `hello at fadroma dot tech` if you need a hand with CosmWasm development!

This package contains a fork of [`cosmos/cosmjs`](https://github.com/cosmos/cosmjs)
and [`confio/cosmjs-types`](https://github.com/confio/cosmjs-types).

It is distributed as a Derivative Work under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.html),
and differs from `@cosmjs/stargate` in the following ways:

* All of the packages from the `@cosmjs/` namespace, as well as the `cosmjs-types`
  library, are unified into a single package, `@hackbg/cosmjs-esm`.

* Versioning is planned to start from `1.0.0` once a project depending on this library
  reaches production. SemVer will be applied, and breaking changes to the API
  will be tracked rigorously.

* As the name suggests, this is an ESM-first package. Any CommonJS vestiges
  are removed. See [`@hackbg/ubik`](https://www.npmjs.com/package/@hackbg/ubik)
  if you would like to try a modern VanillaJS workflow based on browsers' native
  support for ES Modules and [Import Maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).

* All type imports are now correctly marked as `import type`, and directories
  now have `index` files. This way, you don't have to rely on backwards compatibility
  solutions that paper over some of the unacknowled pitfalls of TypeScript.

## Example query

The `@fadroma/cw` package implements the [Fadroma Agent API](https://www.npmjs.com/package/@hackbg/ubik),
which provides easy access for the `bank` and `compute` modules, and enables
easy deployment of smart contracts.

For chain features that are currently not covered by the Agent API,
you can use the following approach:

```javascript
import { CWConnection, CosmJS } from '@fadroma/cw'

const Staking = CosmJS.Proto.Cosmos.Staking.v1beta1;

const client = await new CWConnection({
  url: '...' // RPC URL
  chainId: '...',
}).qClient

const { value } = await client.queryAbci(
  '/cosmos.staking.v1beta1.Query/Validator',
  Staking.Query.QueryValidatorRequest.encode({
    validatorAddr: address
  }).finish()
)

const result = Staking.Query.QueryValidatorResponse.decode(
  value
)
```
