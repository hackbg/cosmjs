/* eslint-disable */
import * as ___m0 from "@hackbg/protobufjs-esm/minimal";
import type * as __m0 from "@hackbg/protobufjs-esm/minimal"
//@ts-ignore
const _m0 = ___m0['default']
import { isSet, bytesFromBase64, base64FromBytes } from "../../helpers";
import type { DeepPartial, Exact } from "../../helpers";
export const protobufPackage = "tendermint.crypto";
/** PublicKey defines the keys available for use with Validators */
export interface PublicKey {
  ed25519?: Uint8Array;
  secp256k1?: Uint8Array;
}
function createBasePublicKey(): PublicKey {
  return {
    ed25519: undefined,
    secp256k1: undefined,
  };
}
export const PublicKey = {
  encode(message: PublicKey, writer: __m0.Writer = _m0.Writer.create()): __m0.Writer {
    if (message.ed25519 !== undefined) {
      writer.uint32(10).bytes(message.ed25519);
    }
    if (message.secp256k1 !== undefined) {
      writer.uint32(18).bytes(message.secp256k1);
    }
    return writer;
  },
  decode(input: __m0.Reader | Uint8Array, length?: number): PublicKey {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePublicKey();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ed25519 = reader.bytes();
          break;
        case 2:
          message.secp256k1 = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PublicKey {
    return {
      ed25519: isSet(object.ed25519) ? bytesFromBase64(object.ed25519) : undefined,
      secp256k1: isSet(object.secp256k1) ? bytesFromBase64(object.secp256k1) : undefined,
    };
  },
  toJSON(message: PublicKey): unknown {
    const obj: any = {};
    message.ed25519 !== undefined &&
      (obj.ed25519 = message.ed25519 !== undefined ? base64FromBytes(message.ed25519) : undefined);
    message.secp256k1 !== undefined &&
      (obj.secp256k1 = message.secp256k1 !== undefined ? base64FromBytes(message.secp256k1) : undefined);
    return obj;
  },
  fromPartial<I extends Exact<DeepPartial<PublicKey>, I>>(object: I): PublicKey {
    const message = createBasePublicKey();
    message.ed25519 = object.ed25519 ?? undefined;
    message.secp256k1 = object.secp256k1 ?? undefined;
    return message;
  },
};
