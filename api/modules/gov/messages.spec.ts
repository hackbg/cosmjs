import { coin, coins, makeCosmoshubPath, Secp256k1HdWallet } from "../../../lib/amino/index";
import { DirectSecp256k1HdWallet } from "../../../lib/proto-signing/index";
import { assert, sleep } from "../../../lib/utils/index";
import { TextProposal, VoteOption } from "../../../types/cosmos/gov/v1beta1/gov";
import { Any } from "../../../types/google/protobuf/any";

import { longify } from "../../queryclient/index";
import { SigningStargateClient } from "../../signingstargateclient";
import { assertIsDeliverTxSuccess } from "../../stargateclient";
import {
  defaultSigningClientOptions,
  faucet,
  nonNegativeIntegerMatcher,
  pendingWithoutSimapp,
  simapp,
  simappEnabled,
  validator,
} from "../../testutils-stargate.spec";
import type {
  MsgDelegateEncodeObject,
  MsgSubmitProposalEncodeObject,
  MsgVoteEncodeObject,
} from "..//index";
import type { MsgVoteWeightedEncodeObject } from "./messages";

describe("gov messages", () => {
  const defaultFee = {
    amount: coins(25000, "ucosm"),
    gas: "1500000", // 1.5 million
  };
  const textProposal = TextProposal.fromPartial({
    title: "Test Proposal",
    description: "This proposal proposes to test whether this proposal passes",
  });
  const initialDeposit = coins(12300000, "ustake");
  const delegationVoter1 = coin(424242, "ustake");
  const delegationVoter2 = coin(777, "ustake");
  const voter1Address = faucet.address1;
  const voter2Address = faucet.address2;
  // Use address 1 and 2 instead of 0 to avoid conflicts with other delegation tests
  // This must match `voterAddress` above.
  const voterPaths = [makeCosmoshubPath(1), makeCosmoshubPath(2)];
  let voterWallet: DirectSecp256k1HdWallet | undefined;
  let voterWalletAmino: Secp256k1HdWallet | undefined;
  let proposalId: string | undefined;

  beforeAll(async () => {
    if (simappEnabled()) {
      voterWallet = await DirectSecp256k1HdWallet.fromMnemonic(faucet.mnemonic, { hdPaths: voterPaths });
      voterWalletAmino = await Secp256k1HdWallet.fromMnemonic(faucet.mnemonic, { hdPaths: voterPaths });
      const client = await SigningStargateClient.connectWithSigner(
        simapp.tendermintUrl,
        voterWallet,
        defaultSigningClientOptions,
      );

      const proposalMsg: MsgSubmitProposalEncodeObject = {
        typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposal",
        value: {
          content: Any.fromPartial({
            typeUrl: "/cosmos.gov.v1beta1.TextProposal",
            value: Uint8Array.from(TextProposal.encode(textProposal).finish()),
          }),
          proposer: voter1Address,
          initialDeposit: initialDeposit,
        },
      };
      const proposalResult = await client.signAndBroadcast(
        voter1Address,
        [proposalMsg],
        defaultFee,
        "Test proposal for simd",
      );
      assertIsDeliverTxSuccess(proposalResult);
      const logs = JSON.parse(proposalResult.rawLog || "");
      proposalId = logs[0].events
        .find(({ type }: any) => type === "submit_proposal")
        .attributes.find(({ key }: any) => key === "proposal_id").value;
      assert(proposalId, "Proposal ID not found in events");
      assert(proposalId.match(nonNegativeIntegerMatcher));

      // Voter 1
      {
        // My vote only counts when I delegate
        if (!(await client.getDelegation(voter1Address, validator.validatorAddress))) {
          const msgDelegate: MsgDelegateEncodeObject = {
            typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
            value: {
              delegatorAddress: voter1Address,
              validatorAddress: validator.validatorAddress,
              amount: delegationVoter1,
            },
          };
          const result = await client.signAndBroadcast(voter1Address, [msgDelegate], defaultFee);
          assertIsDeliverTxSuccess(result);
        }
      }

      // Voter 2
      {
        // My vote only counts when I delegate
        if (!(await client.getDelegation(voter2Address, validator.validatorAddress))) {
          const msgDelegate: MsgDelegateEncodeObject = {
            typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
            value: {
              delegatorAddress: voter2Address,
              validatorAddress: validator.validatorAddress,
              amount: delegationVoter2,
            },
          };
          const result = await client.signAndBroadcast(voter2Address, [msgDelegate], defaultFee);
          assertIsDeliverTxSuccess(result);
        }

        const voteMsg: MsgVoteEncodeObject = {
          typeUrl: "/cosmos.gov.v1beta1.MsgVote",
          value: {
            proposalId: longify(proposalId),
            voter: voter2Address,
            option: VoteOption.VOTE_OPTION_NO_WITH_VETO,
          },
        };
        const voteResult = await client.signAndBroadcast(voter2Address, [voteMsg], defaultFee);
        assertIsDeliverTxSuccess(voteResult);
      }

      await sleep(75); // wait until transactions are indexed

      client.disconnect();
    }
  });

  describe("MsgVote", () => {
    it("works", async () => {
      pendingWithoutSimapp();
      assert(voterWallet);
      assert(proposalId, "Missing proposal ID");
      const client = await SigningStargateClient.connectWithSigner(simapp.tendermintUrl, voterWallet);

      const voteMsg: MsgVoteEncodeObject = {
        typeUrl: "/cosmos.gov.v1beta1.MsgVote",
        value: {
          proposalId: longify(proposalId),
          voter: voter1Address,
          option: VoteOption.VOTE_OPTION_YES,
        },
      };
      const voteResult = await client.signAndBroadcast(voter1Address, [voteMsg], defaultFee);
      assertIsDeliverTxSuccess(voteResult);

      client.disconnect();
    });

    it("works with Amino JSON sign mode", async () => {
      pendingWithoutSimapp();
      assert(voterWalletAmino);
      assert(proposalId, "Missing proposal ID");
      const client = await SigningStargateClient.connectWithSigner(simapp.tendermintUrl, voterWalletAmino);

      const voteMsg: MsgVoteEncodeObject = {
        typeUrl: "/cosmos.gov.v1beta1.MsgVote",
        value: {
          proposalId: longify(proposalId),
          voter: voter1Address,
          option: VoteOption.VOTE_OPTION_YES,
        },
      };
      const voteResult = await client.signAndBroadcast(voter1Address, [voteMsg], defaultFee);
      assertIsDeliverTxSuccess(voteResult);

      client.disconnect();
    });
  });

  describe("MsgVoteWeighted", () => {
    it("works", async () => {
      pendingWithoutSimapp();
      assert(voterWallet);
      assert(proposalId, "Missing proposal ID");
      const client = await SigningStargateClient.connectWithSigner(simapp.tendermintUrl, voterWallet);

      const voteMsg: MsgVoteWeightedEncodeObject = {
        typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeighted",
        value: {
          proposalId: longify(proposalId),
          voter: voter1Address,
          options: [
            {
              option: VoteOption.VOTE_OPTION_YES,
              weight: "700000000000000000", // 0.7
            },
            {
              option: VoteOption.VOTE_OPTION_NO,
              weight: "200000000000000000", // 0.2
            },
            {
              option: VoteOption.VOTE_OPTION_ABSTAIN,
              weight: "100000000000000000", // 0.1
            },
          ],
        },
      };
      const voteResult = await client.signAndBroadcast(voter1Address, [voteMsg], defaultFee);
      assertIsDeliverTxSuccess(voteResult);

      client.disconnect();
    });

    it("works with Amino JSON sign mode", async () => {
      pendingWithoutSimapp();
      assert(voterWalletAmino);
      assert(proposalId, "Missing proposal ID");
      const client = await SigningStargateClient.connectWithSigner(simapp.tendermintUrl, voterWalletAmino);

      const voteMsg: MsgVoteWeightedEncodeObject = {
        typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeighted",
        value: {
          proposalId: longify(proposalId),
          voter: voter1Address,
          options: [
            {
              option: VoteOption.VOTE_OPTION_YES,
              weight: "700000000000000000", // 0.7
            },
            {
              option: VoteOption.VOTE_OPTION_NO,
              weight: "200000000000000000", // 0.2
            },
            {
              option: VoteOption.VOTE_OPTION_ABSTAIN,
              weight: "100000000000000000", // 0.1
            },
          ],
        },
      };
      const voteResult = await client.signAndBroadcast(voter1Address, [voteMsg], defaultFee);
      assertIsDeliverTxSuccess(voteResult);

      client.disconnect();
    });
  });
});
