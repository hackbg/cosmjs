/* eslint-disable */
import * as ___m0 from "@hackbg/protobufjs-esm/minimal";
import type * as __m0 from "@hackbg/protobufjs-esm/minimal"
//@ts-ignore
const _m0 = ___m0['default']
import { isSet } from "../../../../../helpers";
import type { DeepPartial, Exact } from "../../../../../helpers";
export const protobufPackage = "ibc.applications.interchain_accounts.controller.v1";
/**
 * Params defines the set of on-chain interchain accounts parameters.
 * The following parameters may be used to disable the controller submodule.
 */
export interface Params {
  /** controller_enabled enables or disables the controller submodule. */
  controllerEnabled: boolean;
}
function createBaseParams(): Params {
  return {
    controllerEnabled: false,
  };
}
export const Params = {
  encode(message: Params, writer: __m0.Writer = _m0.Writer.create()): __m0.Writer {
    if (message.controllerEnabled === true) {
      writer.uint32(8).bool(message.controllerEnabled);
    }
    return writer;
  },
  decode(input: __m0.Reader | Uint8Array, length?: number): Params {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.controllerEnabled = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Params {
    return {
      controllerEnabled: isSet(object.controllerEnabled) ? Boolean(object.controllerEnabled) : false,
    };
  },
  toJSON(message: Params): unknown {
    const obj: any = {};
    message.controllerEnabled !== undefined && (obj.controllerEnabled = message.controllerEnabled);
    return obj;
  },
  fromPartial<I extends Exact<DeepPartial<Params>, I>>(object: I): Params {
    const message = createBaseParams();
    message.controllerEnabled = object.controllerEnabled ?? false;
    return message;
  },
};
