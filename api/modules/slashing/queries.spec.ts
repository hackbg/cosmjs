/* eslint-disable @typescript-eslint/naming-convention */
import { Tendermint34Client } from "../../../lib/tendermint-rpc/index";

import { QueryClient } from "../../queryclient/index";
import { pendingWithoutSimapp, simapp } from "../../testutils-stargate.spec";
import { setupSlashingExtension } from "./queries";

import type { SlashingExtension } from "./queries";

async function makeClientWithSlashing(
  rpcUrl: string,
): Promise<[QueryClient & SlashingExtension, Tendermint34Client]> {
  const tmClient = await Tendermint34Client.connect(rpcUrl);
  return [QueryClient.withExtensions(tmClient, setupSlashingExtension), tmClient];
}

describe("SlashingExtension", () => {
  describe("signingInfos", () => {
    it("works", async () => {
      pendingWithoutSimapp();
      const [client, tmClient] = await makeClientWithSlashing(simapp.tendermintUrl);

      const response = await client.slashing.signingInfos();
      expect(response.info).toBeDefined();
      expect(response.info).not.toBeNull();

      tmClient.disconnect();
    });
  });

  describe("params", () => {
    it("works", async () => {
      pendingWithoutSimapp();
      const [client, tmClient] = await makeClientWithSlashing(simapp.tendermintUrl);

      const response = await client.slashing.params();
      expect(response.params).toBeDefined();
      expect(response.params).not.toBeNull();

      tmClient.disconnect();
    });
  });
});
