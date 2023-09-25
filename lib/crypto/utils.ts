// See https://github.com/paulmillr/noble-hashes/issues/25 for why this is needed
export function toRealUint8Array(data: ArrayLike<number>): Uint8Array {
  if (data instanceof Uint8Array) return data;
  else return Uint8Array.from(data);
}

// https://stackoverflow.com/a/63144348
const big0 = BigInt(0)
const big1 = BigInt(1)
const big8 = BigInt(8)
export function bigIntToUint8Array(big: bigint) {
  if (big < big0) {
    const bits: bigint = (BigInt(big.toString(2).length) / big8 + big1) * big8
    const prefix1: bigint = big1 << bits
    big += prefix1
  }
  let hex = big.toString(16)
  if (hex.length % 2) {
    hex = '0' + hex
  }
  const len = hex.length / 2
  const u8 = new Uint8Array(len)
  var i = 0
  var j = 0
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16)
    i += 1
    j += 2
  }
  return u8
}
