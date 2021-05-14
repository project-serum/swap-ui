import React, { useContext, useState, useEffect } from "react";
import { useAsync } from "react-async-hook";
import * as anchor from "@project-serum/anchor";
import { Provider } from "@project-serum/anchor";
import { Swap as SwapClient } from "@project-serum/swap";
import { Market, OpenOrders } from "@project-serum/serum";
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
const DEX_PID = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");

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
  const [slippage, setSlippage] = useState(0.5);

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
        slippage,
        setSlippage,
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
  slippage: number;
  setSlippage: (n: number) => void;
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

const MintContext = React.createContext<null | MintContext>(null);
type MintContext = {
  mintCache: Map<string, MintInfo>;
  setMintCache: (m: Map<string, MintInfo>) => void;
  provider: Provider;
};

export function MintContextProvider(props: any) {
  const provider = props.provider;
  const [mintCache, setMintCache] = useState(new Map<string, MintInfo>());

  return (
    <MintContext.Provider
      value={{
        mintCache,
        setMintCache,
        provider,
      }}
    >
      {props.children}
    </MintContext.Provider>
  );
}

export function useMint(mint: PublicKey): MintInfo | undefined | null {
  const ctx = useContext(MintContext);
  if (ctx === null) {
    throw new Error("Mint context not found");
  }

  // Lazy load the mint account if needeed.
  const asyncMintInfo = useAsync(async () => {
    if (ctx.mintCache.get(mint.toString())) {
      return ctx.mintCache.get(mint.toString());
    }
    const mintClient = new Token(
      ctx.provider.connection,
      mint,
      TOKEN_PROGRAM_ID,
      new Account()
    );
    const mintInfo = await mintClient.getMintInfo();

    let cache = new Map(ctx.mintCache);
    cache.set(mint.toString(), mintInfo);
    ctx.setMintCache(cache);

    return mintInfo;
  }, [ctx.provider.connection, mint]);

  if (asyncMintInfo.result) {
    return asyncMintInfo.result;
  }
  return undefined;
}

const SerumDexContext = React.createContext<SerumDexContext | null>(null);
type SerumDexContext = {
  // Maps market address to open orders accounts.
  openOrders: Map<string, Array<OpenOrders>>;
  marketCache: Map<string, Market>;
};

export function useOpenOrders(): Map<string, Array<OpenOrders>> {
  const ctx = useContext(SerumDexContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx.openOrders;
}

export function useMarket(market: PublicKey): Market | undefined {
  const ctx = useContext(SerumDexContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx.marketCache.get(market.toString());
}

export function SerumDexContextProvider(props: any) {
  const [ooAccounts, setOoAccounts] = useState<Map<string, Array<OpenOrders>>>(
    new Map()
  );
  const [marketCache, setMarketCache] = useState<Map<string, Market>>(
    new Map()
  );
  const provider = props.provider;

  // Two operations:
  // 1. Fetch all open orders accounts for the connected wallet.
  // 2. Batch fetch all market accounts.
  useEffect(() => {
    OpenOrders.findForOwner(
      provider.connection,
      provider.wallet.publicKey,
      DEX_PID
    ).then(async (openOrders) => {
      const newOoAccounts = new Map();
      let markets = new Set<string>();
      openOrders.forEach((oo) => {
        markets.add(oo.market.toString());
        if (newOoAccounts.get(oo.market.toString())) {
          newOoAccounts.get(oo.market.toString()).push(oo);
        } else {
          newOoAccounts.set(oo.market.toString(), [oo]);
        }
      });
      if (markets.size > 100) {
        // Punt request chunking until there's user demand.
        throw new Error(
          "Too many markets. Please file an issue to update this"
        );
      }
      const marketAccounts = (
        await anchor.utils.getMultipleAccounts(
          provider.connection,
          // @ts-ignore
          [...markets].map((m) => new PublicKey(m))
        )
      ).map((programAccount) => {
        return {
          publicKey: programAccount?.publicKey,
          account: new Market(
            Market.getLayout(DEX_PID).decode(programAccount?.account.data),
            -1, // Not used so don't bother fetching.
            -1, // Not used so don't bother fetching.
            provider.opts,
            DEX_PID
          ),
        };
      });
      const newMarketCache = new Map(marketCache);
      marketAccounts.forEach((m) => {
        newMarketCache.set(m.publicKey!.toString(), m.account);
      });

      setMarketCache(newMarketCache);
      setOoAccounts(newOoAccounts);
    });
  }, [provider.connection, provider.wallet.publicKey, DEX_PID]);
  return (
    <SerumDexContext.Provider
      value={{
        openOrders: ooAccounts,
        marketCache,
      }}
    >
      {props.children}
    </SerumDexContext.Provider>
  );
}
