import { bech32 } from "@scure/base";

export function toBech32(prefix: string, data: Uint8Array, limit?: number): string {
  const address = bech32.encode(prefix, bech32.toWords(data), limit);
  return address;
}

export function fromBech32(
  address: string,
  limit = Infinity,
): { readonly prefix: string; readonly data: Uint8Array } {
  const decodedAddress = bech32.decode(address, limit);
  return {
    prefix: decodedAddress.prefix,
    data: new Uint8Array(bech32.fromWords(decodedAddress.words)),
  };
}

/**
 * Takes a bech32 address and returns a normalized (i.e. lower case) representation of it.
 *
 * The input is validated along the way, which makes this significantly safer than
 * using `address.toLowerCase()`.
 */
export function normalizeBech32(address: string): string {
  const { prefix, data } = fromBech32(address);
  return toBech32(prefix, data);
}
