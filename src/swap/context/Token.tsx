import React, { useContext, useState, useEffect } from "react";
import * as assert from "assert";
import { useAsync } from "react-async-hook";
import { Provider } from "@project-serum/anchor";
import { PublicKey, Account } from "@solana/web3.js";
import {
  MintInfo,
  AccountInfo as TokenAccount,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getOwnedTokenAccounts, parseTokenAccountData } from "../utils/tokens";

export type TokenContext = {
  provider: Provider;
};
const _TokenContext = React.createContext<TokenContext | null>(null);

export function TokenContextProvider(props: any) {
  const provider = props.provider;
  const [, setRefresh] = useState(0);

  // Fetch all the owned token accounts for the wallet.
  useEffect(() => {
    if (!provider.wallet.publicKey) {
      _OWNED_TOKEN_ACCOUNTS_CACHE.length = 0;
      setRefresh((r) => r + 1);
      return;
    }
    getOwnedTokenAccounts(provider.connection, provider.wallet.publicKey).then(
      (accs) => {
        if (accs) {
          _OWNED_TOKEN_ACCOUNTS_CACHE.push(...accs);
          setRefresh((r) => r + 1);
        }
      }
    );
  }, [provider.wallet.publicKey, provider.connection]);

  return (
    <_TokenContext.Provider
      value={{
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
  const { provider } = useTokenContext();
  const [, setRefresh] = useState(0);
  const tokenAccounts = _OWNED_TOKEN_ACCOUNTS_CACHE.filter(
    (account) => mint && account.account.mint.equals(mint)
  );

  // Take the account with the most tokens in it.
  tokenAccounts.sort((a, b) =>
    a.account.amount < b.account.amount
      ? -1
      : a.account.amount > b.account.amount
      ? 1
      : 0
  );

  const tokenAccount = tokenAccounts[0];

  // Stream updates when the balance changes.
  useEffect(() => {
    let listener: number;
    if (tokenAccount) {
      listener = provider.connection.onAccountChange(
        tokenAccount.publicKey,
        (info) => {
          const token = parseTokenAccountData(info.data);
          if (token.amount !== tokenAccount.account.amount) {
            const index = _OWNED_TOKEN_ACCOUNTS_CACHE.indexOf(tokenAccount);
            assert.ok(index >= 0);
            _OWNED_TOKEN_ACCOUNTS_CACHE[index].account = token;
            setRefresh((r) => r + 1);
          }
        }
      );
    }
    return () => {
      if (listener) {
        provider.connection.removeAccountChangeListener(listener);
      }
    };
  }, [provider.connection, tokenAccount]);

  if (mint === undefined) {
    return undefined;
  }

  if (tokenAccounts.length === 0) {
    return null;
  }

  return tokenAccount;
}

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
    const mintInfo = mintClient.getMintInfo();
    _MINT_CACHE.set(mint.toString(), mintInfo);
    return mintInfo;
  }, [provider.connection, mint]);

  if (asyncMintInfo.result) {
    return asyncMintInfo.result;
  }
  return undefined;
}

// Cache storing all token accounts for the connected wallet provider.
const _OWNED_TOKEN_ACCOUNTS_CACHE: Array<{
  publicKey: PublicKey;
  account: TokenAccount;
}> = [];

// Cache storing all previously fetched mint infos.
const _MINT_CACHE = new Map<string, Promise<MintInfo>>();
