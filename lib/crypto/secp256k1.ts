import { fromHex, toHex } from "../encoding/index";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToNumberBE, numberToBytesBE, hexToBytes } from "@noble/curves/abstract/utils";

import { ExtendedSecp256k1Signature, Secp256k1Signature } from "./secp256k1signature";

const secp256k1N = bytesToNumberBE(
  hexToBytes("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141")
)

export interface Secp256k1Keypair {
  /** A 32 byte private key */
  readonly pubkey: Uint8Array;
  /**
   * A raw secp256k1 public key.
   *
   * The type itself does not give you any guarantee if this is
   * compressed or uncompressed. If you are unsure where the data
   * is coming from, use `Secp256k1.compressPubkey` or
   * `Secp256k1.uncompressPubkey` (both idempotent) before processing it.
   */
  readonly privkey: Uint8Array;
}

export class Secp256k1 {
  /**
   * Takes a 32 byte private key and returns a privkey/pubkey pair.
   *
   * The resulting pubkey is uncompressed. For the use in Cosmos it should
   * be compressed first using `Secp256k1.compressPubkey`.
   */
  public static async makeKeypair(privkey: Uint8Array): Promise<Secp256k1Keypair> {
    if (privkey.length !== 32) {
      // is this check missing in secp256k1.validatePrivateKey?
      // https://github.com/bitjson/bitcoin-ts/issues/4
      throw new Error("input data is not a valid secp256k1 private key");
    }

    // range test that is not part of the elliptic implementation
    const privkeyAsBigInteger = bytesToNumberBE(privkey);
    if (privkeyAsBigInteger >= secp256k1N) {
      // not strictly smaller than N
      throw new Error("input data is not a valid secp256k1 private key");
    }

    // encodes uncompressed as
    // - 1-byte prefix "04"
    // - 32-byte x coordinate
    // - 32-byte y coordinate
    let pubkey
    try {
      pubkey = secp256k1.getPublicKey(privkey)
    } catch (reason: any) {
      throw Object.assign(new Error(
        `failed to recover secp256k1 public key from private key: ${reason.message}`
      ), { reason })
    }

    const out: Secp256k1Keypair = { privkey, pubkey };
    return out;
  }

  /**
   * Creates a signature that is
   * - deterministic (RFC 6979)
   * - lowS signature
   * - DER encoded
   */
  public static async createSignature(
    messageHash: Uint8Array,
    privkey: Uint8Array,
  ): Promise<ExtendedSecp256k1Signature> {
    if (messageHash.length === 0) {
      throw new Error("Message hash must not be empty");
    }
    if (messageHash.length > 32) {
      throw new Error("Message hash length must not exceed 32 bytes");
    }
    const { r, s, recovery } = secp256k1.sign(messageHash, privkey);
    if (typeof recovery !== "number") throw new Error("Recovery param missing");
    return new ExtendedSecp256k1Signature(
      numberToBytesBE(r, 32),
      numberToBytesBE(s, 32),
      recovery,
    );
  }

  public static async verifySignature(
    signature: Secp256k1Signature,
    messageHash: Uint8Array,
    pubkey: Uint8Array,
  ): Promise<boolean> {
    if (messageHash.length === 0) {
      throw new Error("Message hash must not be empty");
    }
    if (messageHash.length > 32) {
      throw new Error("Message hash length must not exceed 32 bytes");
    }
    try {
      return secp256k1.verify(signature.toDer(), messageHash, pubkey);
    } catch (error) {
      return false;
    }
  }

  public static recoverPubkey(signature: ExtendedSecp256k1Signature, messageHash: Uint8Array): Uint8Array {
    const signatureForElliptic = new secp256k1.Signature(
      bytesToNumberBE(signature.r()),
      bytesToNumberBE(signature.s()),
    );
    Object.assign(signatureForElliptic, { recovery: signature.recovery })
    const pubkey = signatureForElliptic.recoverPublicKey(messageHash)
    return pubkey.toRawBytes()
  }

  /**
   * Takes a compressed or uncompressed pubkey and return a compressed one.
   *
   * This function is idempotent.
   */
  public static compressPubkey(pubkey: Uint8Array): Uint8Array {
    switch (pubkey.length) {
      case 33:
        return pubkey;
      case 65:
        throw new Error("compressPubkey: not implemented");
        //return Uint8Array.from(secp256k1.keyFromPublic(pubkey).getPublic(true, "array"));
      default:
        throw new Error("Invalid pubkey length");
    }
  }

  /**
   * Takes a compressed or uncompressed pubkey and returns an uncompressed one.
   *
   * This function is idempotent.
   */
  public static uncompressPubkey(pubkey: Uint8Array): Uint8Array {
    switch (pubkey.length) {
      case 33:
        throw new Error("uncompressPubkey: not implemented");
        //return Uint8Array.from(secp256k1.keyFromPublic(pubkey).getPublic(false, "array"));
      case 65:
        return pubkey;
      default:
        throw new Error("Invalid pubkey length");
    }
  }

  public static trimRecoveryByte(signature: Uint8Array): Uint8Array {
    switch (signature.length) {
      case 64:
        return signature;
      case 65:
        return signature.slice(0, 64);
      default:
        throw new Error("Invalid signature length");
    }
  }
}
