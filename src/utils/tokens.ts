// TODO: replace this whole file with something more modern. This is all copied
//       from sollet.

import * as BufferLayout from "buffer-layout";
import { BN } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  AccountInfo as TokenAccount,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import * as bs58 from "bs58";

export async function getOwnedTokenAccounts(
  connection: Connection,
  publicKey: PublicKey
) {
  let filters = getOwnedAccountsFilters(publicKey);
  // @ts-ignore
  let resp = await connection._rpcRequest("getProgramAccounts", [
    TOKEN_PROGRAM_ID.toBase58(),
    {
      commitment: connection.commitment,
      filters,
    },
  ]);
  if (resp.error) {
    throw new Error(
      "failed to get token accounts owned by " +
        publicKey.toBase58() +
        ": " +
        resp.error.message
    );
  }
  return resp.result
    .map(({ pubkey, account: { data, executable, owner, lamports } }: any) => ({
      publicKey: new PublicKey(pubkey),
      accountInfo: {
        data: bs58.decode(data),
        executable,
        owner: new PublicKey(owner),
        lamports,
      },
    }))
    .filter(({ accountInfo }: any) => {
      // TODO: remove this check once mainnet is updated
      return filters.every((filter) => {
        if (filter.dataSize) {
          return accountInfo.data.length === filter.dataSize;
        } else if (filter.memcmp) {
          let filterBytes = bs58.decode(filter.memcmp.bytes);
          return accountInfo.data
            .slice(
              filter.memcmp.offset,
              filter.memcmp.offset + filterBytes.length
            )
            .equals(filterBytes);
        }
        return false;
      });
    })
    .map(({ publicKey, accountInfo }: any) => {
      return { publicKey, account: parseTokenAccountData(accountInfo.data) };
    });
}

const ACCOUNT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(32, "mint"),
  BufferLayout.blob(32, "owner"),
  BufferLayout.nu64("amount"),
  BufferLayout.blob(93),
]);

export function parseTokenAccountData(data: Buffer): TokenAccount {
  // @ts-ignore
  let { mint, owner, amount } = ACCOUNT_LAYOUT.decode(data);
  // @ts-ignore
  return {
    mint: new PublicKey(mint),
    owner: new PublicKey(owner),
    amount: new BN(amount),
  };
}

function getOwnedAccountsFilters(publicKey: PublicKey) {
  return [
    {
      memcmp: {
        // @ts-ignore
        offset: ACCOUNT_LAYOUT.offsetOf("owner"),
        bytes: publicKey.toBase58(),
      },
    },
    {
      dataSize: ACCOUNT_LAYOUT.span,
    },
  ];
}
