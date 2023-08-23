/* eslint-disable @typescript-eslint/naming-convention */
import { encodePubkey } from "../../../lib/proto-signing/index";
import { Tendermint34Client } from "../../../lib/tendermint-rpc/index";
import { assert } from "../../../lib/utils/index";
import { BaseAccount } from "../../../types/cosmos/auth/v1beta1/auth";
import { Any } from "../../../types/google/protobuf/any";
import Long from "long";

import { QueryClient } from "../../queryclient/index";
import { nonExistentAddress, pendingWithoutSimapp, simapp, unused, validator } from "../../testutils-stargate.spec";
import { setupAuthExtension } from "./queries";

import type { AuthExtension } from "./queries";

async function makeClientWithAuth(
  rpcUrl: string,
): Promise<[QueryClient & AuthExtension, Tendermint34Client]> {
  const tmClient = await Tendermint34Client.connect(rpcUrl);
  return [QueryClient.withExtensions(tmClient, setupAuthExtension), tmClient];
}

describe("AuthExtension", () => {
  describe("account", () => {
    it("works for unused account", async () => {
      pendingWithoutSimapp();
      const [client, tmClient] = await makeClientWithAuth(simapp.tendermintUrl);
      const account = await client.auth.account(unused.address);
      assert(account);

      expect(account.typeUrl).toEqual("/cosmos.auth.v1beta1.BaseAccount");
      expect(BaseAccount.decode(account.value)).toEqual({
        address: unused.address,
        pubKey: undefined,
        accountNumber: Long.fromNumber(unused.accountNumber, true),
        sequence: Long.UZERO,
      });

      tmClient.disconnect();
    });

    it("works for account with pubkey and non-zero sequence", async () => {
      pendingWithoutSimapp();
      const [client, tmClient] = await makeClientWithAuth(simapp.tendermintUrl);
      const account = await client.auth.account(validator.delegatorAddress);
      assert(account);

      expect(account.typeUrl).toEqual("/cosmos.auth.v1beta1.BaseAccount");
      expect(BaseAccount.decode(account.value)).toEqual({
        address: validator.delegatorAddress,
        //@ts-ignore
        pubKey: Any.fromPartial(encodePubkey(validator.pubkey)),
        accountNumber: Long.UZERO,
        sequence: Long.fromNumber(validator.sequence, true),
      });

      tmClient.disconnect();
    });

    it("rejects for non-existent address", async () => {
      pendingWithoutSimapp();
      const [client, tmClient] = await makeClientWithAuth(simapp.tendermintUrl);

      await expectAsync(client.auth.account(nonExistentAddress)).toBeRejectedWithError(
        /account cosmos1p79apjaufyphcmsn4g07cynqf0wyjuezqu84hd not found/i,
      );

      tmClient.disconnect();
    });
  });
});
