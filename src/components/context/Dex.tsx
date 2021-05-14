import React, { useContext, useState, useEffect } from "react";
import { useAsync } from "react-async-hook";
import * as anchor from "@project-serum/anchor";
import { Provider } from "@project-serum/anchor";
import { Market, OpenOrders } from "@project-serum/serum";
import { PublicKey } from "@solana/web3.js";

const DEX_PID = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");

const _DexContext = React.createContext<DexContext | null>(null);
type DexContext = {
  // Maps market address to open orders accounts.
  openOrders: Map<string, Array<OpenOrders>>;
  marketCache: Map<string, Market>;
  setMarketCache: (c: Map<string, Market>) => void;
  provider: Provider;
};

export function DexContextProvider(props: any) {
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
      setMarketCache((marketCache) => {
        const newMarketCache = new Map(marketCache);
        marketAccounts.forEach((m) => {
          newMarketCache.set(m.publicKey!.toString(), m.account);
        });
        return newMarketCache;
      });
      setOoAccounts(newOoAccounts);
    });
  }, [provider.connection, provider.wallet.publicKey, provider.opts]);
  return (
    <_DexContext.Provider
      value={{
        openOrders: ooAccounts,
        marketCache,
        setMarketCache,
        provider,
      }}
    >
      {props.children}
    </_DexContext.Provider>
  );
}

export function useOpenOrders(): Map<string, Array<OpenOrders>> {
  const ctx = useContext(_DexContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx.openOrders;
}

export function useMarket(market: PublicKey): Market | undefined {
  const ctx = useContext(_DexContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }

  const asyncMarket = useAsync(async () => {
    if (ctx.marketCache.get(market.toString())) {
      return ctx.marketCache.get(market.toString());
    }
    const marketClient = await Market.load(
      ctx.provider.connection,
      market,
      undefined,
      DEX_PID
    );

    let cache = new Map(ctx.marketCache);
    cache.set(market.toString(), marketClient);
    ctx.setMarketCache(cache);

    return marketClient;
  }, [ctx.provider.connection, market]);

  if (asyncMarket.result) {
    return asyncMarket.result;
  }

  return undefined;
}
