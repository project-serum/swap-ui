import React, { useContext, useState, useEffect } from "react";
import { Swap as SwapClient } from "@project-serum/swap";
import { PublicKey, Account } from "@solana/web3.js";
import {
  AccountInfo as TokenAccount,
  MintInfo,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { TokenListContainer, TokenInfo } from "@solana/spl-token-registry";
import { getOwnedTokenAccounts } from "../utils/tokens";

const SRM_MINT = new PublicKey("SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt");
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const USDT_MINT = new PublicKey(
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
);

const SwapContext = React.createContext<null | SwapContext>(null);

export function SwapContextProvider(props: any) {
  const swapClient = props.swapClient;
  const [fromMint, setFromMint] = useState(SRM_MINT);
  const [toMint, setToMint] = useState(USDC_MINT);
  const [fromAmount, setFromAmount] = useState(0);
  const [toAmount, setToAmount] = useState(0);
  const [fromBalance, setFromBalance] = useState(undefined);
  const [toBalance, setToBalance] = useState(undefined);
  const [minExpectedAmount, setMinExpectedAmount] = useState(0);
  const [ownedTokenAccounts, setOwnedTokenAccounts] = useState(undefined);
  const [mintCache, setMintCache] = useState(new Map<string, MintInfo>());

  // Fetch all the owned token accounts for the wallet.
  useEffect(() => {
    getOwnedTokenAccounts(
      swapClient.program.provider.connection,
      swapClient.program.provider.wallet.publicKey
    ).then(setOwnedTokenAccounts);
  }, [
    swapClient.program.provider.wallet.publicKey,
    swapClient.program.provider.connection,
  ]);

  // Fetch the mint account infos not already in the cache.
  useEffect(() => {
    const fromMintClient = new Token(
      swapClient.program.provider.connection,
      fromMint,
      TOKEN_PROGRAM_ID,
      new Account()
    );
    const toMintClient = new Token(
      swapClient.program.provider.connection,
      toMint,
      TOKEN_PROGRAM_ID,
      new Account()
    );

    let promises = [];
    if (mintCache.get(fromMint.toString())) {
      promises.push(
        (async (): Promise<MintInfo> => {
          return mintCache.get(fromMint.toString()) as MintInfo;
        })()
      );
    } else {
      promises.push(fromMintClient.getMintInfo());
    }
    if (mintCache.get(toMint.toString())) {
      promises.push(
        (async (): Promise<MintInfo> => {
          return mintCache.get(toMint.toString()) as MintInfo;
        })()
      );
    } else {
      promises.push(toMintClient.getMintInfo());
    }

    Promise.all(promises as [Promise<MintInfo>, Promise<MintInfo>]).then(
      ([fromMintInfo, toMintInfo]: [MintInfo, MintInfo]) => {
        let cache = new Map(mintCache);
        cache.set(fromMint.toString(), fromMintInfo);
        cache.set(toMint.toString(), toMintInfo);
        setMintCache(cache);
      }
    );
  }, [fromMint, toMint]);

  const swapToFromMints = () => {
    const oldFrom = fromMint;
    const oldFromAmount = fromAmount;
    const oldTo = toMint;
    const oldToAmount = toAmount;
    setFromMint(oldTo);
    setToMint(oldFrom);
    setFromAmount(oldToAmount);
    setToAmount(oldFromAmount);
  };

  return (
    <SwapContext.Provider
      value={{
        swapClient,
        fromMint,
        setFromMint,
        toMint,
        setToMint,
        fromAmount,
        setFromAmount,
        toAmount,
        setToAmount,
        minExpectedAmount,
        swapToFromMints,
        fromBalance,
        toBalance,
        ownedTokenAccounts,
        mintCache,
      }}
    >
      {props.children}
    </SwapContext.Provider>
  );
}

export function useSwapContext(): SwapContext {
  const ctx = useContext(SwapContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx;
}

export type SwapContext = {
  swapClient: SwapClient;
  fromMint: PublicKey;
  setFromMint: (m: PublicKey) => void;
  toMint: PublicKey;
  setToMint: (m: PublicKey) => void;
  fromAmount: number;
  setFromAmount: (a: number) => void;
  toAmount: number;
  setToAmount: (a: number) => void;
  minExpectedAmount: number;
  swapToFromMints: () => void;
  fromBalance?: number;
  toBalance?: number;
  fromMintAccount?: MintInfo;
  toMintAccount?: MintInfo;
  ownedTokenAccounts:
    | { publicKey: PublicKey; account: TokenAccount }[]
    | undefined;
  mintCache: Map<string, MintInfo>;
};

const TokenListContext = React.createContext<null | TokenListContext>(null);

export function TokenListContextProvider(props: any) {
  return (
    <TokenListContext.Provider value={{ tokenList: props.tokenList }}>
      {props.children}
    </TokenListContext.Provider>
  );
}

type TokenListContext = {
  tokenList: TokenListContainer;
};

export function useTokenList(): TokenInfo[] {
  const ctx = useContext(TokenListContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx.tokenList.getList();
}

// Null => none exists.
// Undefined => loading.
export function useOwnedTokenAccount(
  mint: PublicKey
): { publicKey: PublicKey; account: TokenAccount } | null | undefined {
  const ctx = useContext(SwapContext);
  if (ctx === null) {
    throw new Error("Context not available");
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
    a.account.amount < a.account.amount
      ? -1
      : a.account.amount > b.account.amount
      ? 1
      : 0
  );
  return tokenAccounts[0];
}

export function useMintAccount(mint: PublicKey): MintInfo | undefined {
  const ctx = useContext(SwapContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx.mintCache.get(mint.toString());
}
