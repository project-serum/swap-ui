import React, { useContext, useState, useEffect } from "react";
import { useAsync } from "react-async-hook";
import * as anchor from "@project-serum/anchor";
import { Provider } from "@project-serum/anchor";
import {
  Market,
  OpenOrders,
  Orderbook as OrderbookSide,
} from "@project-serum/serum";
import { PublicKey } from "@solana/web3.js";
import { DEX_PID } from "../../utils/pubkeys";

type DexContext = {
  // Maps market address to open orders accounts.
  openOrders: Map<string, Array<OpenOrders>>;
  marketCache: Map<string, Market>;
  setMarketCache: (c: Map<string, Market>) => void;
  orderbookCache: Map<string, Orderbook>;
  setOrderbookCache: (c: Map<string, Orderbook>) => void;
  provider: Provider;
};
const _DexContext = React.createContext<DexContext | null>(null);

export function DexContextProvider(props: any) {
  const [ooAccounts, setOoAccounts] = useState<Map<string, Array<OpenOrders>>>(
    new Map()
  );
  const [marketCache, setMarketCache] = useState<Map<string, Market>>(
    new Map()
  );
  const [orderbookCache, setOrderbookCache] = useState<Map<string, Orderbook>>(
    new Map()
  );
  const provider = props.provider;

  // Two operations:
  //
  // 1. Fetch all open orders accounts for the connected wallet.
  // 2. Batch fetch all market accounts for those open orders.
  //
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
        orderbookCache,
        setOrderbookCache,
        provider,
      }}
    >
      {props.children}
    </_DexContext.Provider>
  );
}

function useDexContext(): DexContext {
  const ctx = useContext(_DexContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx;
}

export function useOpenOrders(): Map<string, Array<OpenOrders>> {
  const ctx = useDexContext();
  return ctx.openOrders;
}

// Lazy load a given market.
export function useMarket(market: PublicKey): Market | undefined {
  const ctx = useDexContext();

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

// Lazy load the orderbook for a given market.
export function useOrderbook(market: PublicKey): Orderbook | undefined {
  const ctx = useDexContext();
  const marketClient = useMarket(market);

  const asyncOrderbook = useAsync(async () => {
    if (!marketClient) {
      return undefined;
    }
    if (ctx.orderbookCache.get(market.toString())) {
      return ctx.orderbookCache.get(market.toString());
    }

    const [bids, asks] = await Promise.all([
      marketClient.loadBids(ctx.provider.connection),
      marketClient.loadAsks(ctx.provider.connection),
    ]);

    const orderbook = {
      bids,
      asks,
    };

    const cache = new Map(ctx.orderbookCache);
    cache.set(market.toString(), orderbook);
    ctx.setOrderbookCache(cache);

    return orderbook;
  }, [ctx.provider.connection, market, marketClient]);

  if (asyncOrderbook.result) {
    return asyncOrderbook.result;
  }

  return undefined;
}

export function useMarketRoute(
  fromMint: PublicKey,
  toMint: PublicKey
): Array<{ address: PublicKey; name: string; fair: number }> {
  // todo
  return [
    {
      address: new PublicKey("ByRys5tuUWDgL73G8JBAEfkdFf8JWBzPBDHsBVQ5vbQA"),
      name: "SRM / USDC",
      fair: 0.5,
    },
    {
      address: new PublicKey("J7cPYBrXVy8Qeki2crZkZavcojf2sMRyQU7nx438Mf8t"),
      name: "MATH / USDC",
      fair: 1.23,
    },
  ];
}

// Fair price for a theoretical toMint/fromMint market. I.e., the number
// of `fromMint` tokens to purchase a single `toMint` token.
export function useFair(
  fromMint: PublicKey,
  toMint: PublicKey
): number | undefined {
  // todo
  return 0.5;
}

type Orderbook = {
  bids: OrderbookSide;
  asks: OrderbookSide;
};
