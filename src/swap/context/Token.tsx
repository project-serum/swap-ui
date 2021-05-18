import React, { useContext, useState, useEffect } from "react";
import { useAsync } from "react-async-hook";
import { Provider } from "@project-serum/anchor";
import { PublicKey, Account } from "@solana/web3.js";
import {
  MintInfo,
  AccountInfo as TokenAccount,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getOwnedTokenAccounts } from "../utils/tokens";

export type TokenContext = {
  provider: Provider;
  ownedTokenAccounts:
    | { publicKey: PublicKey; account: TokenAccount }[]
    | undefined;
};
const _TokenContext = React.createContext<TokenContext | null>(null);

export function TokenContextProvider(props: any) {
  const provider = props.provider;
  const [ownedTokenAccounts, setOwnedTokenAccounts] = useState(undefined);

  // Fetch all the owned token accounts for the wallet.
  useEffect(() => {
    if (!provider.wallet.publicKey) {
      setOwnedTokenAccounts(undefined);
      return;
    }
    getOwnedTokenAccounts(provider.connection, provider.wallet.publicKey).then(
      setOwnedTokenAccounts
    );
  }, [provider.wallet.publicKey, provider.connection]);

  return (
    <_TokenContext.Provider
      value={{
        ownedTokenAccounts,
        provider,
      }}
    >
      {props.children}
    </_TokenContext.Provider>
  );
}

function useTokenContext() {
  const ctx = useContext(_TokenContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx;
}

// Null => none exists.
// Undefined => loading.
export function useOwnedTokenAccount(
  mint?: PublicKey
): { publicKey: PublicKey; account: TokenAccount } | null | undefined {
  const ctx = useTokenContext();
  if (mint === undefined) {
    return mint;
  }
  if (ctx.ownedTokenAccounts === undefined) {
    return undefined;
  }
  const tokenAccounts = ctx.ownedTokenAccounts.filter((account) =>
    account.account.mint.equals(mint)
  );

  if (tokenAccounts.length === 0) {
    return null;
  }

  // Take the account with the most tokens in it.
  tokenAccounts.sort((a, b) =>
    a.account.amount < b.account.amount
      ? -1
      : a.account.amount > b.account.amount
      ? 1
      : 0
  );
  return tokenAccounts[0];
}

// Cache storing all previously fetched mint infos.
const _MINT_CACHE = new Map<string, MintInfo>();

export function useMint(mint?: PublicKey): MintInfo | undefined | null {
  const { provider } = useTokenContext();
  // Lazy load the mint account if needeed.
  const asyncMintInfo = useAsync(async () => {
    if (!mint) {
      return undefined;
    }
    if (_MINT_CACHE.get(mint.toString())) {
      return _MINT_CACHE.get(mint.toString());
    }

    const mintClient = new Token(
      provider.connection,
      mint,
      TOKEN_PROGRAM_ID,
      new Account()
    );
    const mintInfo = await mintClient.getMintInfo();
    _MINT_CACHE.set(mint.toString(), mintInfo);
    return mintInfo;
  }, [provider.connection, mint]);

  if (asyncMintInfo.result) {
    return asyncMintInfo.result;
  }
  return undefined;
}
