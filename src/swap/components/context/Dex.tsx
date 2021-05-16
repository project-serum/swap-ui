import React, { useContext, useState, useEffect } from "react";
import { useAsync } from "react-async-hook";
import { TokenInfo } from "@solana/spl-token-registry";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Swap as SwapClient } from "@project-serum/swap";
import {
  Market,
  OpenOrders,
  Orderbook as OrderbookSide,
} from "@project-serum/serum";
import {
  DEX_PID,
  USDC_MINT,
  USDT_MINT,
  WORM_USDC_MINT,
  WORM_USDT_MINT,
  WORM_USDC_MARKET,
  WORM_USDT_MARKET,
  WORM_MARKET_BASE,
} from "../../utils/pubkeys";
import { useTokenMap, useTokenListContext } from "./TokenList";
import { fetchSolletInfo, requestWormholeSwapMarketIfNeeded } from "./Sollet";

type DexContext = {
  // Maps market address to open orders accounts.
  openOrders: Map<string, Array<OpenOrders>>;
  marketCache: Map<string, Market>;
  setMarketCache: (c: Map<string, Market>) => void;
  orderbookCache: Map<string, Orderbook>;
  setOrderbookCache: (c: Map<string, Orderbook>) => void;
  swapClient: SwapClient;
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
  const swapClient = props.swapClient;

  // Two operations:
  //
  // 1. Fetch all open orders accounts for the connected wallet.
  // 2. Batch fetch all market accounts for those open orders.
  //
  useEffect(() => {
    if (!swapClient.program.provider.wallet.publicKey) {
      setOoAccounts(new Map());
      return;
    }
    OpenOrders.findForOwner(
      swapClient.program.provider.connection,
      swapClient.program.provider.wallet.publicKey,
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
          swapClient.program.provider.connection,
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
            swapClient.program.provider.opts,
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
  }, [
    swapClient.program.provider.connection,
    swapClient.program.provider.wallet.publicKey,
    swapClient.program.provider.opts,
  ]);
  return (
    <_DexContext.Provider
      value={{
        openOrders: ooAccounts,
        marketCache,
        setMarketCache,
        orderbookCache,
        setOrderbookCache,
        swapClient,
      }}
    >
      {props.children}
    </_DexContext.Provider>
  );
}

export function useDexContext(): DexContext {
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
export function useMarket(market?: PublicKey): Market | undefined {
  const ctx = useDexContext();

  const asyncMarket = useAsync(async () => {
    if (!market) {
      return undefined;
    }
    if (ctx.marketCache.get(market.toString())) {
      return ctx.marketCache.get(market.toString());
    }
    const marketClient = await Market.load(
      ctx.swapClient.program.provider.connection,
      market,
      undefined,
      DEX_PID
    );

    let cache = new Map(ctx.marketCache);
    cache.set(market.toString(), marketClient);
    ctx.setMarketCache(cache);

    return marketClient;
  }, [ctx.swapClient.program.provider.connection, market]);

  if (asyncMarket.result) {
    return asyncMarket.result;
  }

  return undefined;
}

// Lazy load the orderbook for a given market.
export function useOrderbook(market?: PublicKey): Orderbook | undefined {
  const { swapClient, orderbookCache, setOrderbookCache } = useDexContext();
  const marketClient = useMarket(market);

  const asyncOrderbook = useAsync(async () => {
    if (!market || !marketClient) {
      return undefined;
    }
    if (orderbookCache.get(market.toString())) {
      return orderbookCache.get(market.toString());
    }

    const [bids, asks] = await Promise.all([
      marketClient.loadBids(swapClient.program.provider.connection),
      marketClient.loadAsks(swapClient.program.provider.connection),
    ]);

    const orderbook = {
      bids,
      asks,
    };

    const cache = new Map(orderbookCache);
    cache.set(market.toString(), orderbook);
    setOrderbookCache(cache);

    return orderbook;
  }, [swapClient.program.provider.connection, market, marketClient]);

  if (asyncOrderbook.result) {
    return asyncOrderbook.result;
  }

  return undefined;
}

export function useMarketName(market: PublicKey): string | null {
  const tokenMap = useTokenMap();
  const marketClient = useMarket(market);
  if (!marketClient) {
    return null;
  }
  const baseTicker = marketClient
    ? tokenMap.get(marketClient?.baseMintAddress.toString())?.symbol
    : "-";
  const quoteTicker = marketClient
    ? tokenMap.get(marketClient?.quoteMintAddress.toString())?.symbol
    : "-";
  const name = `${baseTicker} / ${quoteTicker}`;
  return name;
}

// Fair price for a given market, as defined by the mid.
export function useFair(market?: PublicKey): number | undefined {
  const orderbook = useOrderbook(market);
  if (orderbook === undefined) {
    return undefined;
  }
  const bestBid = orderbook.bids.items(true).next().value;
  const bestOffer = orderbook.asks.items(false).next().value;
  if (!bestBid) {
    return bestOffer.price;
  }
  if (!bestOffer) {
    return bestBid.price;
  }
  const mid = (bestBid.price + bestOffer.price) / 2.0;
  return mid;
}

// Fair price for a theoretical toMint/fromMint market. I.e., the number
// of `fromMint` tokens to purchase a single `toMint` token. Aggregates
// across a trade route, if needed.
export function useFairRoute(
  fromMint: PublicKey,
  toMint: PublicKey
): number | undefined {
  const route = useRoute(fromMint, toMint);
  const fromFair = useFair(route ? route[0] : undefined);
  const fromMarket = useMarket(route ? route[0] : undefined);
  const toFair = useFair(route ? route[1] : undefined);

  if (route === null) {
    return undefined;
  }

  if (route.length === 1 && fromFair !== undefined) {
    if (fromMarket === undefined) {
      return undefined;
    }
    if (fromMarket?.baseMintAddress.equals(fromMint)) {
      return 1.0 / fromFair;
    } else {
      return fromFair;
    }
  }
  if (fromFair === undefined || toFair === undefined) {
    return undefined;
  }
  return toFair / fromFair;
}

// Types of routes.
//
// 1. Direct trades on USDC quoted markets.
// 2. Transitive trades across two USDC qutoed markets.
// 3. Wormhole <-> Sollet one-to-one swap markets.
// 4. Wormhole <-> Native one-to-one swap markets.
//
export function useRoute(
  fromMint: PublicKey,
  toMint: PublicKey
): Array<PublicKey> | null {
  const { swapClient } = useDexContext();
  const { wormholeMap, solletMap } = useTokenListContext();
  const asyncRoute = useAsync(async () => {
    const wormholeMarket = await wormholeSwapMarket(
      swapClient.program.provider.connection,
      fromMint,
      toMint,
      wormholeMap,
      solletMap
    );
    if (wormholeMarket !== null) {
      return [wormholeMarket];
    }
    return swapClient.route(fromMint, toMint);
  }, [fromMint, toMint, swapClient]);

  if (asyncRoute.result) {
    return asyncRoute.result;
  }
  return null;
}

type Orderbook = {
  bids: OrderbookSide;
  asks: OrderbookSide;
};

// Wormhole utils.

// Maps fromMint || toMint (in sort order) to swap market public key.
// All markets for wormhole<->native tokens should be here, e.g.
// USDC <-> wUSDC.
const WORMHOLE_NATIVE_MAP = new Map<string, PublicKey>([
  [wormKey(WORM_USDC_MINT, USDC_MINT), WORM_USDC_MARKET],
  [wormKey(WORM_USDT_MINT, USDT_MINT), WORM_USDT_MARKET],
]);

function wormKey(fromMint: PublicKey, toMint: PublicKey): string {
  const [first, second] =
    fromMint < toMint ? [fromMint, toMint] : [toMint, fromMint];
  return first.toString() + second.toString();
}

function wormholeNativeMarket(
  fromMint: PublicKey,
  toMint: PublicKey
): PublicKey | undefined {
  return WORMHOLE_NATIVE_MAP.get(wormKey(fromMint, toMint));
}

async function wormholeSwapMarket(
  conn: Connection,
  fromMint: PublicKey,
  toMint: PublicKey,
  wormholeMap: Map<string, TokenInfo>,
  solletMap: Map<string, TokenInfo>
): Promise<PublicKey | null> {
  let market = wormholeNativeMarket(fromMint, toMint);
  if (market !== undefined) {
    return market;
  }
  return await wormholeSolletMarket(
    conn,
    fromMint,
    toMint,
    wormholeMap,
    solletMap
  );
}

// Returns the market address of the 1-1 sollet<->wormhole swap market if it
// exists. Otherwise, returns null.
//
// TODO: swap transactions dont work for wormhole yet, since the client
//       doesnt do  any wormhole checks.
async function wormholeSolletMarket(
  conn: Connection,
  fromMint: PublicKey,
  toMint: PublicKey,
  wormholeMap: Map<string, TokenInfo>,
  solletMap: Map<string, TokenInfo>
): Promise<PublicKey | null> {
  const fromWormhole = wormholeMap.get(fromMint.toString());
  const isFromWormhole = fromWormhole !== undefined;

  const toWormhole = wormholeMap.get(toMint.toString());
  const isToWormhole = toWormhole !== undefined;

  const fromSollet = solletMap.get(fromMint.toString());
  const isFromSollet = fromSollet !== undefined;

  const toSollet = solletMap.get(toMint.toString());
  const isToSollet = toSollet !== undefined;

  if ((isFromWormhole || isToWormhole) && isFromWormhole !== isToWormhole) {
    if ((isFromSollet || isToSollet) && isFromSollet !== isToSollet) {
      const base = isFromSollet ? fromMint : toMint;
      const [quote, wormholeInfo] = isFromWormhole
        ? [fromMint, fromWormhole]
        : [toMint, toWormhole];

      const solletInfo = await fetchSolletInfo(base);

      if (solletInfo.erc20Contract !== wormholeInfo!.extensions?.address) {
        return null;
      }

      const market = await deriveWormholeMarket(base, quote);
      if (market === null) {
        return null;
      }

      const marketExists = await requestWormholeSwapMarketIfNeeded(
        conn,
        base,
        quote,
        market,
        solletInfo
      );
      if (!marketExists) {
        return null;
      }

      return market;
    }
  }
  return null;
}

// Calculates the deterministic address for the sollet<->wormhole 1-1 swap
// market.
async function deriveWormholeMarket(
  baseMint: PublicKey,
  quoteMint: PublicKey,
  version = 0
): Promise<PublicKey | null> {
  if (version > 99) {
    console.log("Swap market version cannot be greater than 99");
    return null;
  }
  if (version < 0) {
    console.log("Version cannot be less than zero");
    return null;
  }

  const padToTwo = (n: number) => (n <= 99 ? `0${n}`.slice(-2) : n);
  const seed =
    baseMint.toString().slice(0, 15) +
    quoteMint.toString().slice(0, 15) +
    padToTwo(version);
  return await PublicKey.createWithSeed(WORM_MARKET_BASE, seed, DEX_PID);
}
