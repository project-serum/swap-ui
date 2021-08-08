// TODO: replace this whole file with something more modern. This is all copied
//       from sollet.

import * as BufferLayout from "buffer-layout";
import { BN } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  AccountInfo as TokenAccount,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

export async function getOwnedAssociatedTokenAccounts(
  connection: Connection,
  publicKey: PublicKey
) {
  let filters = getOwnedAccountsFilters(publicKey);
  // @ts-ignore
  let resp = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    commitment: connection.commitment,
    filters,
  });

  const accs = resp
    .map(({ pubkey, account: { data, executable, owner, lamports } }: any) => ({
      publicKey: new PublicKey(pubkey),
      accountInfo: {
        data,
        executable,
        owner: new PublicKey(owner),
        lamports,
      },
    }))
    .map(({ publicKey, accountInfo }: any) => {
      return { publicKey, account: parseTokenAccountData(accountInfo.data) };
    });

  return (
    (
      await Promise.all(
        accs
          // @ts-ignore
          .map(async (ta) => {
            const ata = await Token.getAssociatedTokenAddress(
              ASSOCIATED_TOKEN_PROGRAM_ID,
              TOKEN_PROGRAM_ID,
              ta.account.mint,
              publicKey
            );
            return [ta, ata];
          })
      )
    )
      // @ts-ignore
      .filter(([ta, ata]) => ta.publicKey.equals(ata))
      // @ts-ignore
      .map(([ta]) => ta)
  );
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
