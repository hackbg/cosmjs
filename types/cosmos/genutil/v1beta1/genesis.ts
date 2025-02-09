/* eslint-disable */
import * as ___m0 from "@hackbg/protobufjs-esm/minimal";
import type * as __m0 from "@hackbg/protobufjs-esm/minimal"
//@ts-ignore
const _m0 = ___m0['default']
import { bytesFromBase64, base64FromBytes } from "../../../helpers";
import type { DeepPartial, Exact } from "../../../helpers";
export const protobufPackage = "cosmos.genutil.v1beta1";
/** GenesisState defines the raw genesis transaction in JSON. */
export interface GenesisState {
  /** gen_txs defines the genesis transactions. */
  genTxs: Uint8Array[];
}
function createBaseGenesisState(): GenesisState {
  return {
    genTxs: [],
  };
}
export const GenesisState = {
  encode(message: GenesisState, writer: __m0.Writer = _m0.Writer.create()): __m0.Writer {
    for (const v of message.genTxs) {
      writer.uint32(10).bytes(v!);
    }
    return writer;
  },
  decode(input: __m0.Reader | Uint8Array, length?: number): GenesisState {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.genTxs.push(reader.bytes());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisState {
    return {
      genTxs: Array.isArray(object?.genTxs) ? object.genTxs.map((e: any) => bytesFromBase64(e)) : [],
    };
  },
  toJSON(message: GenesisState): unknown {
    const obj: any = {};
    if (message.genTxs) {
      obj.genTxs = message.genTxs.map((e) => base64FromBytes(e !== undefined ? e : new Uint8Array()));
    } else {
      obj.genTxs = [];
    }
    return obj;
  },
  fromPartial<I extends Exact<DeepPartial<GenesisState>, I>>(object: I): GenesisState {
    const message = createBaseGenesisState();
    message.genTxs = object.genTxs?.map((e) => e) || [];
    return message;
  },
};
