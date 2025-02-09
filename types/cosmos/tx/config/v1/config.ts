/* eslint-disable */
import * as ___m0 from "@hackbg/protobufjs-esm/minimal";
import type * as __m0 from "@hackbg/protobufjs-esm/minimal"
//@ts-ignore
const _m0 = ___m0['default']
import { isSet } from "../../../../helpers";
import type { DeepPartial, Exact } from "../../../../helpers";
export const protobufPackage = "cosmos.tx.config.v1";
/** Config is the config object of the x/auth/tx package. */
export interface Config {
  /**
   * skip_ante_handler defines whether the ante handler registration should be skipped in case an app wants to override
   * this functionality.
   */
  skipAnteHandler: boolean;
  /**
   * skip_post_handler defines whether the post handler registration should be skipped in case an app wants to override
   * this functionality.
   */
  skipPostHandler: boolean;
}
function createBaseConfig(): Config {
  return {
    skipAnteHandler: false,
    skipPostHandler: false,
  };
}
export const Config = {
  encode(message: Config, writer: __m0.Writer = _m0.Writer.create()): __m0.Writer {
    if (message.skipAnteHandler === true) {
      writer.uint32(8).bool(message.skipAnteHandler);
    }
    if (message.skipPostHandler === true) {
      writer.uint32(16).bool(message.skipPostHandler);
    }
    return writer;
  },
  decode(input: __m0.Reader | Uint8Array, length?: number): Config {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.skipAnteHandler = reader.bool();
          break;
        case 2:
          message.skipPostHandler = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Config {
    return {
      skipAnteHandler: isSet(object.skipAnteHandler) ? Boolean(object.skipAnteHandler) : false,
      skipPostHandler: isSet(object.skipPostHandler) ? Boolean(object.skipPostHandler) : false,
    };
  },
  toJSON(message: Config): unknown {
    const obj: any = {};
    message.skipAnteHandler !== undefined && (obj.skipAnteHandler = message.skipAnteHandler);
    message.skipPostHandler !== undefined && (obj.skipPostHandler = message.skipPostHandler);
    return obj;
  },
  fromPartial<I extends Exact<DeepPartial<Config>, I>>(object: I): Config {
    const message = createBaseConfig();
    message.skipAnteHandler = object.skipAnteHandler ?? false;
    message.skipPostHandler = object.skipPostHandler ?? false;
    return message;
  },
};
