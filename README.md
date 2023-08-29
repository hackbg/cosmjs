This is a fork of [`cosmos/cosmjs`](https://github.com/cosmos/cosmjs)
and [`confio/cosmjs-types`](https://github.com/confio/cosmjs-types),
with the following differences:

* All of the packages from the `@cosmjs/` namespace, as well as the `cosmjs-types`
  library, are unified into a single package, `@hackbg/cosmjs-esm`.

* Various cases of invalid imports have been fixed. Namely (1) types are now imported
  using `import type`, and (2) directories are now imported with `./directory/index`.
  This means that, unlike mainline `@cosmjs`, usage of this library will not slow you
  down by forcing you to use a bundler or build system that paper over some of the
  unacknowledged pitfalls of TypeScript.

* Versioning starts from `1.0.0`, and SemVer will be applied. Breaking changes
  to the API will be tracked - even if they don't actually break anything.

This library is intended to be used by [`@hackbg/fadroma`](https://github.com/hackbg/fadroma).
Contact us at `hello at fadroma dot tech` if you need a hand with CosmWasm development.

Distributed as a Derivative Work under the Apache License 2.0.
