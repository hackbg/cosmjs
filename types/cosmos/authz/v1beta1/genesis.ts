/* eslint-disable */
import { GrantAuthorization } from "./authz";
import * as ___m0 from "@hackbg/protobufjs-esm/minimal";
import type * as __m0 from "@hackbg/protobufjs-esm/minimal"
//@ts-ignore
const _m0 = ___m0['default']
import type { DeepPartial, Exact } from "../../../helpers";
export const protobufPackage = "cosmos.authz.v1beta1";
/** GenesisState defines the authz module's genesis state. */
export interface GenesisState {
  authorization: GrantAuthorization[];
}
function createBaseGenesisState(): GenesisState {
  return {
    authorization: [],
  };
}
export const GenesisState = {
  encode(message: GenesisState, writer: __m0.Writer = _m0.Writer.create()): __m0.Writer {
    for (const v of message.authorization) {
      GrantAuthorization.encode(v!, writer.uint32(10).fork()).ldelim();
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
          message.authorization.push(GrantAuthorization.decode(reader, reader.uint32()));
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
      authorization: Array.isArray(object?.authorization)
        ? object.authorization.map((e: any) => GrantAuthorization.fromJSON(e))
        : [],
    };
  },
  toJSON(message: GenesisState): unknown {
    const obj: any = {};
    if (message.authorization) {
      obj.authorization = message.authorization.map((e) => (e ? GrantAuthorization.toJSON(e) : undefined));
    } else {
      obj.authorization = [];
    }
    return obj;
  },
  fromPartial<I extends Exact<DeepPartial<GenesisState>, I>>(object: I): GenesisState {
    const message = createBaseGenesisState();
    message.authorization = object.authorization?.map((e) => GrantAuthorization.fromPartial(e)) || [];
    return message;
  },
};
