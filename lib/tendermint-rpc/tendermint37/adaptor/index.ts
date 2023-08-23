import { hashBlock, hashTx } from "../hasher";
import { Params } from "./requests";
import { Responses } from "./responses";
import type { Adaptor } from "./types";

export type { Decoder, Encoder, Params, Responses } from "./types";

export const adaptor37: Adaptor = {
  params: Params,
  responses: Responses,
  hashTx: hashTx,
  hashBlock: hashBlock,
};
