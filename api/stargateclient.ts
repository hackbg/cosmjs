/* eslint-disable @typescript-eslint/naming-convention */
import { addCoins } from "../lib/amino/index";
import { toHex } from "../lib/encoding/index";
import { Uint53 } from "../lib/math/index";
import { Tendermint34Client, Tendermint37Client, toRfc3339WithNanoseconds } from "../lib/tendermint-rpc/index";
import type { HttpEndpoint } from "../lib/tendermint-rpc/index";
import type { TendermintClient } from "../lib/tendermint-rpc/index";
import { assert, sleep } from "../lib/utils/index";
import { MsgData, TxMsgData } from "../types/cosmos/base/abci/v1beta1/abci";
import { Coin } from "../types/cosmos/base/v1beta1/coin";
import { QueryDelegatorDelegationsResponse } from "../types/cosmos/staking/v1beta1/query";
import { DelegationResponse } from "../types/cosmos/staking/v1beta1/staking";

import { accountFromAny } from "./accounts";
import type { Account, AccountParser } from "./accounts";
import { fromTendermintEvent } from "./events";
import type { Event } from "./events";
import {
  setupAuthExtension,
  setupBankExtension,
  setupStakingExtension,
  setupTxExtension,
} from "./modules/index";
import type { AuthExtension, BankExtension, StakingExtension, TxExtension } from "./modules/index";
import { QueryClient } from "./queryclient/index";
import type { SearchTxQuery } from "./search";

export class TimeoutError extends Error {
  public readonly txId: string;

  public constructor(message: string, txId: string) {
    super(message);
    this.txId = txId;
  }
}

export interface BlockHeader {
  readonly version: {
    readonly block: string;
    readonly app: string;
  };
  readonly height: number;
  readonly chainId: string;
  /** An RFC 3339 time string like e.g. '2020-02-15T10:39:10.4696305Z' */
  readonly time: string;
}

export interface Block {
  /** The ID is a hash of the block header (uppercase hex) */
  readonly id: string;
  readonly header: BlockHeader;
  /** Array of raw transactions */
  readonly txs: readonly Uint8Array[];
}

/** A transaction that is indexed as part of the transaction history */
export interface IndexedTx {
  readonly height: number;
  /** The position of the transaction within the block. This is a 0-based index. */
  readonly txIndex: number;
  /** Transaction hash (might be used as transaction ID). Guaranteed to be non-empty upper-case hex */
  readonly hash: string;
  /** Transaction execution error code. 0 on success. */
  readonly code: number;
  readonly events: readonly Event[];
  /**
   * A string-based log document.
   *
   * This currently seems to merge attributes of multiple events into one event per type
   * (https://github.com/tendermint/tendermint/issues/9595). You might want to use the `events`
   * field instead.
   */
  readonly rawLog: string;
  /**
   * Raw transaction bytes stored in Tendermint.
   *
   * If you hash this, you get the transaction hash (= transaction ID):
   *
   * ```js
   * import { sha256 } from "../lib/crypto";
   * import { toHex } from "../lib/encoding";
   *
   * const transactionId = toHex(sha256(indexTx.tx)).toUpperCase();
   * ```
   *
   * Use `decodeTxRaw` from ../lib/proto-signing to decode this.
   */
  readonly tx: Uint8Array;
  /**
   * The message responses of the [TxMsgData](https://github.com/cosmos/cosmos-sdk/blob/v0.46.3/proto/cosmos/base/abci/v1beta1/abci.proto#L128-L140)
   * as `Any`s.
   * This field is an empty list for chains running Cosmos SDK < 0.46.
   */
  readonly msgResponses: Array<{ readonly typeUrl: string; readonly value: Uint8Array }>;
  readonly gasUsed: number;
  readonly gasWanted: number;
}

export interface SequenceResponse {
  readonly accountNumber: number;
  readonly sequence: number;
}

/**
 * The response after successfully broadcasting a transaction.
 * Success or failure refer to the execution result.
 */
export interface DeliverTxResponse {
  readonly height: number;
  /** The position of the transaction within the block. This is a 0-based index. */
  readonly txIndex: number;
  /** Error code. The transaction suceeded iff code is 0. */
  readonly code: number;
  readonly transactionHash: string;
  readonly events: readonly Event[];
  /**
   * A string-based log document.
   *
   * This currently seems to merge attributes of multiple events into one event per type
   * (https://github.com/tendermint/tendermint/issues/9595). You might want to use the `events`
   * field instead.
   */
  readonly rawLog?: string;
  /** @deprecated Use `msgResponses` instead. */
  readonly data?: readonly MsgData[];
  /**
   * The message responses of the [TxMsgData](https://github.com/cosmos/cosmos-sdk/blob/v0.46.3/proto/cosmos/base/abci/v1beta1/abci.proto#L128-L140)
   * as `Any`s.
   * This field is an empty list for chains running Cosmos SDK < 0.46.
   */
  readonly msgResponses: Array<{ readonly typeUrl: string; readonly value: Uint8Array }>;
  readonly gasUsed: number;
  readonly gasWanted: number;
}

export function isDeliverTxFailure(result: DeliverTxResponse): boolean {
  return !!result.code;
}

export function isDeliverTxSuccess(result: DeliverTxResponse): boolean {
  return !isDeliverTxFailure(result);
}

/**
 * Ensures the given result is a success. Throws a detailed error message otherwise.
 */
export function assertIsDeliverTxSuccess(result: DeliverTxResponse): void {
  if (isDeliverTxFailure(result)) {
    throw new Error(
      `Error when broadcasting tx ${result.transactionHash} at height ${result.height}. Code: ${result.code}; Raw log: ${result.rawLog}`,
    );
  }
}

/**
 * Ensures the given result is a failure. Throws a detailed error message otherwise.
 */
export function assertIsDeliverTxFailure(result: DeliverTxResponse): void {
  if (isDeliverTxSuccess(result)) {
    throw new Error(
      `Transaction ${result.transactionHash} did not fail at height ${result.height}. Code: ${result.code}; Raw log: ${result.rawLog}`,
    );
  }
}

/**
 * An error when broadcasting the transaction. This contains the CheckTx errors
 * from the blockchain. Once a transaction is included in a block no BroadcastTxError
 * is thrown, even if the execution fails (DeliverTx errors).
 */
export class BroadcastTxError extends Error {
  public readonly code: number;
  public readonly codespace: string;
  public readonly log: string | undefined;

  public constructor(code: number, codespace: string, log: string | undefined) {
    super(`Broadcasting transaction failed with code ${code} (codespace: ${codespace}). Log: ${log}`);
    this.code = code;
    this.codespace = codespace;
    this.log = log;
  }
}

/** Use for testing only */
export interface PrivateStargateClient {
  readonly tmClient: TendermintClient | undefined;
}

export interface StargateClientOptions {
  readonly accountParser?: AccountParser;
}

export class StargateClient {
  private readonly tmClient: TendermintClient | undefined;
  private readonly queryClient:
    | (QueryClient & AuthExtension & BankExtension & StakingExtension & TxExtension)
    | undefined;
  private chainId: string | undefined;
  private readonly accountParser: AccountParser;

  /**
   * Creates an instance by connecting to the given Tendermint RPC endpoint.
   *
   * This uses auto-detection to decide between a Tendermint 0.37 and 0.34 client.
   * To set the Tendermint client explicitly, use `create`.
   */
  public static async connect(
    endpoint: string | HttpEndpoint,
    options: StargateClientOptions = {},
  ): Promise<StargateClient> {
    // Tendermint/CometBFT 0.34/0.37 auto-detection. Starting with 0.37 we seem to get reliable versions again 🎉
    // Using 0.34 as the fallback.
    let tmClient: TendermintClient;
    const tm37Client = await Tendermint37Client.connect(endpoint);
    const version = (await tm37Client.status()).nodeInfo.version;
    if (version.startsWith("0.37.")) {
      tmClient = tm37Client;
    } else {
      tm37Client.disconnect();
      tmClient = await Tendermint34Client.connect(endpoint);
    }

    return StargateClient.create(tmClient, options);
  }

  /**
   * Creates an instance from a manually created Tendermint client.
   * Use this to use `Tendermint37Client` instead of `Tendermint34Client`.
   */
  public static async create(
    tmClient: TendermintClient,
    options: StargateClientOptions = {},
  ): Promise<StargateClient> {
    return new StargateClient(tmClient, options);
  }

  protected constructor(tmClient: TendermintClient | undefined, options: StargateClientOptions) {
    if (tmClient) {
      this.tmClient = tmClient;
      this.queryClient = QueryClient.withExtensions(
        tmClient,
        setupAuthExtension,
        setupBankExtension,
        setupStakingExtension,
        setupTxExtension,
      );
    }
    const { accountParser = accountFromAny } = options;
    this.accountParser = accountParser;
  }

  protected getTmClient(): TendermintClient | undefined {
    return this.tmClient;
  }

  protected forceGetTmClient(): TendermintClient {
    if (!this.tmClient) {
      throw new Error(
        "Tendermint client not available. You cannot use online functionality in offline mode.",
      );
    }
    return this.tmClient;
  }

  protected getQueryClient():
    | (QueryClient & AuthExtension & BankExtension & StakingExtension & TxExtension)
    | undefined {
    return this.queryClient;
  }

  protected forceGetQueryClient(): QueryClient &
    AuthExtension &
    BankExtension &
    StakingExtension &
    TxExtension {
    if (!this.queryClient) {
      throw new Error("Query client not available. You cannot use online functionality in offline mode.");
    }
    return this.queryClient;
  }

  public async getChainId(): Promise<string> {
    if (!this.chainId) {
      const response = await this.forceGetTmClient().status();
      const chainId = response.nodeInfo.network;
      if (!chainId) throw new Error("Chain ID must not be empty");
      this.chainId = chainId;
    }

    return this.chainId;
  }

  public async getHeight(): Promise<number> {
    const status = await this.forceGetTmClient().status();
    return status.syncInfo.latestBlockHeight;
  }

  public async getAccount(searchAddress: string): Promise<Account | null> {
    try {
      const account = await this.forceGetQueryClient().auth.account(searchAddress);
      return account ? this.accountParser(account) : null;
    } catch (error: any) {
      if (/rpc error: code = NotFound/i.test(error.toString())) {
        return null;
      }
      throw error;
    }
  }

  public async getSequence(address: string): Promise<SequenceResponse> {
    const account = await this.getAccount(address);
    if (!account) {
      throw new Error(
        `Account '${address}' does not exist on chain. Send some tokens there before trying to query sequence.`,
      );
    }
    return {
      accountNumber: account.accountNumber,
      sequence: account.sequence,
    };
  }

  public async getBlock(height?: number): Promise<Block> {
    const response = await this.forceGetTmClient().block(height);
    return {
      id: toHex(response.blockId.hash).toUpperCase(),
      header: {
        version: {
          block: new Uint53(response.block.header.version.block).toString(),
          app: new Uint53(response.block.header.version.app).toString(),
        },
        height: response.block.header.height,
        chainId: response.block.header.chainId,
        time: toRfc3339WithNanoseconds(response.block.header.time),
      },
      txs: response.block.txs,
    };
  }

  public async getBalance(address: string, searchDenom: string): Promise<Coin> {
    return this.forceGetQueryClient().bank.balance(address, searchDenom);
  }

  /**
   * Queries all balances for all denoms that belong to this address.
   *
   * Uses the grpc queries (which iterates over the store internally), and we cannot get
   * proofs from such a method.
   */
  public async getAllBalances(address: string): Promise<readonly Coin[]> {
    return this.forceGetQueryClient().bank.allBalances(address);
  }

  public async getBalanceStaked(address: string): Promise<Coin | null> {
    const allDelegations: DelegationResponse[] = [];
    let startAtKey: Uint8Array | undefined = undefined;
    do {
      const { delegationResponses, pagination }: QueryDelegatorDelegationsResponse =
        await this.forceGetQueryClient().staking.delegatorDelegations(address, startAtKey);

      const loadedDelegations = delegationResponses || [];
      allDelegations.push(...loadedDelegations);
      startAtKey = pagination?.nextKey;
    } while (startAtKey !== undefined && startAtKey.length !== 0);

    const sumValues = allDelegations.reduce(
      (previousValue: Coin | null, currentValue: DelegationResponse): Coin => {
        // Safe because field is set to non-nullable (https://github.com/cosmos/cosmos-sdk/blob/v0.45.3/proto/cosmos/staking/v1beta1/staking.proto#L295)
        assert(currentValue.balance);
        return previousValue !== null ? addCoins(previousValue, currentValue.balance) : currentValue.balance;
      },
      null,
    );

    return sumValues;
  }

  public async getDelegation(delegatorAddress: string, validatorAddress: string): Promise<Coin | null> {
    let delegatedAmount: Coin | undefined;
    try {
      delegatedAmount = (
        await this.forceGetQueryClient().staking.delegation(delegatorAddress, validatorAddress)
      ).delegationResponse?.balance;
    } catch (e: any) {
      if (e.toString().includes("key not found")) {
        // ignore, `delegatedAmount` remains undefined
      } else {
        throw e;
      }
    }
    return delegatedAmount || null;
  }

  public async getTx(id: string): Promise<IndexedTx | null> {
    const results = await this.txsQuery(`tx.hash='${id}'`);
    return results[0] ?? null;
  }

  public async searchTx(query: SearchTxQuery): Promise<IndexedTx[]> {
    let rawQuery: string;
    if (typeof query === "string") {
      rawQuery = query;
    } else if (Array.isArray(query)) {
      rawQuery = query.map((t) => `${t.key}='${t.value}'`).join(" AND ");
    } else {
      throw new Error("Got unsupported query type. See CosmJS 0.31 CHANGELOG for API breaking changes here.");
    }
    return this.txsQuery(rawQuery);
  }

  public disconnect(): void {
    if (this.tmClient) this.tmClient.disconnect();
  }

  /**
   * Broadcasts a signed transaction to the network and monitors its inclusion in a block.
   *
   * If broadcasting is rejected by the node for some reason (e.g. because of a CheckTx failure),
   * an error is thrown.
   *
   * If the transaction is not included in a block before the provided timeout, this errors with a `TimeoutError`.
   *
   * If the transaction is included in a block, a `DeliverTxResponse` is returned. The caller then
   * usually needs to check for execution success or failure.
   */
  public async broadcastTx(
    tx: Uint8Array,
    timeoutMs = 60_000,
    pollIntervalMs = 3_000,
  ): Promise<DeliverTxResponse> {
    let timedOut = false;
    const txPollTimeout = setTimeout(() => {
      timedOut = true;
    }, timeoutMs);

    const pollForTx = async (txId: string): Promise<DeliverTxResponse> => {
      if (timedOut) {
        throw new TimeoutError(
          `Transaction with ID ${txId} was submitted but was not yet found on the chain. You might want to check later. There was a wait of ${
            timeoutMs / 1000
          } seconds.`,
          txId,
        );
      }
      await sleep(pollIntervalMs);
      const result = await this.getTx(txId);
      return result
        ? {
            code: result.code,
            height: result.height,
            txIndex: result.txIndex,
            events: result.events,
            rawLog: result.rawLog,
            transactionHash: txId,
            msgResponses: result.msgResponses,
            gasUsed: result.gasUsed,
            gasWanted: result.gasWanted,
          }
        : pollForTx(txId);
    };

    const transactionId = await this.broadcastTxSync(tx);

    return new Promise((resolve, reject) =>
      pollForTx(transactionId).then(
        (value) => {
          clearTimeout(txPollTimeout);
          resolve(value);
        },
        (error) => {
          clearTimeout(txPollTimeout);
          reject(error);
        },
      ),
    );
  }

  /**
   * Broadcasts a signed transaction to the network without monitoring it.
   *
   * If broadcasting is rejected by the node for some reason (e.g. because of a CheckTx failure),
   * an error is thrown.
   *
   * If the transaction is broadcasted, a `string` containing the hash of the transaction is returned. The caller then
   * usually needs to check if the transaction was included in a block and was successful.
   *
   * @returns Returns the hash of the transaction
   */
  public async broadcastTxSync(tx: Uint8Array): Promise<string> {
    const broadcasted = await this.forceGetTmClient().broadcastTxSync({ tx });

    if (broadcasted.code) {
      return Promise.reject(
        new BroadcastTxError(broadcasted.code, broadcasted.codespace ?? "", broadcasted.log),
      );
    }

    const transactionId = toHex(broadcasted.hash).toUpperCase();

    return transactionId;
  }

  private async txsQuery(query: string): Promise<IndexedTx[]> {
    const results = await this.forceGetTmClient().txSearchAll({ query: query });
    return results.txs.map((tx): IndexedTx => {
      const txMsgData = TxMsgData.decode(tx.result.data ?? new Uint8Array());
      return {
        height: tx.height,
        txIndex: tx.index,
        hash: toHex(tx.hash).toUpperCase(),
        code: tx.result.code,
        events: tx.result.events.map(fromTendermintEvent),
        rawLog: tx.result.log || "",
        tx: tx.tx,
        msgResponses: txMsgData.msgResponses,
        gasUsed: tx.result.gasUsed,
        gasWanted: tx.result.gasWanted,
      };
    });
  }
}
