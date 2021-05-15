import React, { useContext, useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { AccountInfo as TokenAccount } from "@solana/spl-token";
import { getOwnedTokenAccounts } from "../../utils/tokens";

const _TokenContext = React.createContext<TokenContext | null>(null);

export function TokenContextProvider(props: any) {
  const provider = props.provider;
  const [ownedTokenAccounts, setOwnedTokenAccounts] = useState(undefined);

  // Fetch all the owned token accounts for the wallet.
  useEffect(() => {
    getOwnedTokenAccounts(provider.connection, provider.wallet.publicKey).then(
      setOwnedTokenAccounts
    );
  }, [provider.wallet.publicKey, provider.connection]);

  return (
    <_TokenContext.Provider
      value={{
        ownedTokenAccounts,
      }}
    >
      {props.children}
    </_TokenContext.Provider>
  );
}

export type TokenContext = {
  ownedTokenAccounts:
    | { publicKey: PublicKey; account: TokenAccount }[]
    | undefined;
};

// Null => none exists.
// Undefined => loading.
export function useOwnedTokenAccount(
  mint?: PublicKey
): { publicKey: PublicKey; account: TokenAccount } | null | undefined {
  const ctx = useContext(_TokenContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
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
