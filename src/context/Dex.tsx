import React, { useContext, useState, useEffect } from "react";
import * as assert from "assert";
import { useAsync } from "react-async-hook";
import { TokenInfo } from "@solana/spl-token-registry";
import { MintLayout } from "@solana/spl-token";
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
  SOL_MINT,
  WRAPPED_SOL_MINT,
  WORM_USDC_MINT,
  WORM_USDT_MINT,
  WORM_USDC_MARKET,
  WORM_USDT_MARKET,
  WORM_MARKET_BASE,
} from "../utils/pubkeys";
import { useTokenMap, useTokenListContext } from "./TokenList";
import { fetchSolletInfo, requestWormholeSwapMarketIfNeeded } from "./Sollet";
import { setMintCache } from "./Token";

const BASE_TAKER_FEE_BPS = 0.0022;
export const FEE_MULTIPLIER = 1 - BASE_TAKER_FEE_BPS;

type DexContext = {
  // Maps market address to open orders accounts.
  openOrders: Map<string, Array<OpenOrders>>;
  closeOpenOrders: (openOrder: OpenOrders) => void;
  swapClient: SwapClient;
};
const _DexContext = React.createContext<DexContext | null>(null);

export function DexContextProvider(props: any) {
  const [ooAccounts, setOoAccounts] = useState<Map<string, Array<OpenOrders>>>(
    new Map()
  );
  const swapClient = props.swapClient;

  // Removes the given open orders from the context.
  const closeOpenOrders = async (openOrder: OpenOrders) => {
    const newOoAccounts = new Map(ooAccounts);
    const openOrders = newOoAccounts
      .get(openOrder.market.toString())
      ?.filter((oo: OpenOrders) => !oo.address.equals(openOrder.address));
    if (openOrders && openOrders.length > 0) {
      newOoAccounts.set(openOrder.market.toString(), openOrders);
    } else {
      newOoAccounts.delete(openOrder.market.toString());
    }
    setOoAccounts(newOoAccounts);
  };

  // Three operations:
  //
  // 1. Fetch all open orders accounts for the connected wallet.
  // 2. Batch fetch all market accounts for those open orders.
  // 3. Batch fetch all mints associated with the markets.
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
      const multipleMarkets = await anchor.utils.rpc.getMultipleAccounts(
        swapClient.program.provider.connection,
        Array.from(markets.values()).map((m) => new PublicKey(m))
      );
      const marketClients = multipleMarkets.map((programAccount) => {
        return {
          publicKey: programAccount?.publicKey,
          account: new Market(
            Market.getLayout(DEX_PID).decode(programAccount?.account.data),
            -1, // Set below so that we can batch fetch mints.
            -1, // Set below so that we can batch fetch mints.
            swapClient.program.provider.opts,
            DEX_PID
          ),
        };
      });

      setOoAccounts(newOoAccounts);

      // Batch fetch all the mints, since we know we'll need them at some
      // point.
      const mintPubkeys = Array.from(
        new Set<string>(
          marketClients
            .map((m) => [
              m.account.baseMintAddress.toString(),
              m.account.quoteMintAddress.toString(),
            ])
            .flat()
        ).values()
      ).map((pk) => new PublicKey(pk));

      if (mintPubkeys.length > 100) {
        // Punt request chunking until there's user demand.
        throw new Error("Too many mints. Please file an issue to update this");
      }

      const mints = await anchor.utils.rpc.getMultipleAccounts(
        swapClient.program.provider.connection,
        mintPubkeys
      );
      const mintInfos = mints.map((mint) => {
        const mintInfo = MintLayout.decode(mint!.account.data);
        setMintCache(mint!.publicKey, mintInfo);
        return { publicKey: mint!.publicKey, mintInfo };
      });

      marketClients.forEach((m) => {
        const baseMintInfo = mintInfos.filter((mint) =>
          mint.publicKey.equals(m.account.baseMintAddress)
        )[0];
        const quoteMintInfo = mintInfos.filter((mint) =>
          mint.publicKey.equals(m.account.quoteMintAddress)
        )[0];
        assert.ok(baseMintInfo && quoteMintInfo);
        // @ts-ignore
        m.account._baseSplTokenDecimals = baseMintInfo.mintInfo.decimals;
        // @ts-ignore
        m.account._quoteSplTokenDecimals = quoteMintInfo.mintInfo.decimals;
        _MARKET_CACHE.set(
          m.publicKey!.toString(),
          new Promise<Market>((resolve) => resolve(m.account))
        );
      });
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
        closeOpenOrders,
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
  const { swapClient } = useDexContext();

  const asyncMarket = useAsync(async () => {
    if (!market) {
      return undefined;
    }
    if (_MARKET_CACHE.get(market.toString())) {
      return _MARKET_CACHE.get(market.toString());
    }

    const marketClient = new Promise<Market>(async (resolve) => {
      // TODO: if we already have the mints, then pass them through to the
      //       market client here to save a network request.
      const marketClient = await Market.load(
        swapClient.program.provider.connection,
        market,
        swapClient.program.provider.opts,
        DEX_PID
      );
      resolve(marketClient);
    });

    _MARKET_CACHE.set(market.toString(), marketClient);
    return marketClient;
  }, [swapClient.program.provider.connection, market]);

  if (asyncMarket.result) {
    return asyncMarket.result;
  }

  return undefined;
}

// Lazy load the orderbook for a given market.
export function useOrderbook(market?: PublicKey): Orderbook | undefined {
  const { swapClient } = useDexContext();
  const marketClient = useMarket(market);
  const [refresh, setRefresh] = useState(0);

  const asyncOrderbook = useAsync(async () => {
    if (!market || !marketClient) {
      return undefined;
    }
    if (_ORDERBOOK_CACHE.get(market.toString())) {
      return _ORDERBOOK_CACHE.get(market.toString());
    }

    const orderbook = new Promise<Orderbook>(async (resolve) => {
      const [bids, asks] = await Promise.all([
        marketClient.loadBids(swapClient.program.provider.connection),
        marketClient.loadAsks(swapClient.program.provider.connection),
      ]);

      resolve({
        bids,
        asks,
      });
    });

    _ORDERBOOK_CACHE.set(market.toString(), orderbook);

    return orderbook;
  }, [refresh, swapClient.program.provider.connection, market, marketClient]);

  // Stream in bids updates.
  useEffect(() => {
    let listener: number | undefined;
    if (marketClient?.bidsAddress) {
      listener = swapClient.program.provider.connection.onAccountChange(
        marketClient?.bidsAddress,
        async (info) => {
          const bids = OrderbookSide.decode(marketClient, info.data);
          const orderbook = await _ORDERBOOK_CACHE.get(
            marketClient.address.toString()
          );
          const oldBestBid = orderbook?.bids.items(true).next().value;
          const newBestBid = bids.items(true).next().value;
          if (
            orderbook &&
            oldBestBid &&
            newBestBid &&
            oldBestBid.price !== newBestBid.price
          ) {
            orderbook.bids = bids;
            setRefresh((r) => r + 1);
          }
        }
      );
    }
    return () => {
      if (listener) {
        swapClient.program.provider.connection.removeAccountChangeListener(
          listener
        );
      }
    };
  }, [
    marketClient,
    marketClient?.bidsAddress,
    swapClient.program.provider.connection,
  ]);

  // Stream in asks updates.
  useEffect(() => {
    let listener: number | undefined;
    if (marketClient?.asksAddress) {
      listener = swapClient.program.provider.connection.onAccountChange(
        marketClient?.asksAddress,
        async (info) => {
          const asks = OrderbookSide.decode(marketClient, info.data);
          const orderbook = await _ORDERBOOK_CACHE.get(
            marketClient.address.toString()
          );
          const oldBestOffer = orderbook?.asks.items(false).next().value;
          const newBestOffer = asks.items(false).next().value;
          if (
            orderbook &&
            oldBestOffer &&
            newBestOffer &&
            oldBestOffer.price !== newBestOffer.price
          ) {
            orderbook.asks = asks;
            setRefresh((r) => r + 1);
          }
        }
      );
    }
    return () => {
      if (listener) {
        swapClient.program.provider.connection.removeAccountChangeListener(
          listener
        );
      }
    };
  }, [
    marketClient,
    marketClient?.bidsAddress,
    swapClient.program.provider.connection,
  ]);

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
export function useBbo(market?: PublicKey): Bbo | undefined {
  const orderbook = useOrderbook(market);
  if (orderbook === undefined) {
    return undefined;
  }
  const bestBid = orderbook.bids.items(true).next().value;
  const bestOffer = orderbook.asks.items(false).next().value;
  if (!bestBid && !bestOffer) {
    return {};
  }
  if (!bestBid) {
    return { bestOffer: bestOffer.price };
  }
  if (!bestOffer) {
    return { bestBid: bestBid.price };
  }
  const mid = (bestBid.price + bestOffer.price) / 2.0;
  return { bestBid: bestBid.price, bestOffer: bestOffer.price, mid };
}

// Fair price for a theoretical toMint/fromMint market. I.e., the number
// of `fromMint` tokens to purchase a single `toMint` token. Aggregates
// across a trade route, if needed.
export function useFairRoute(
  fromMint: PublicKey,
  toMint: PublicKey
): number | undefined {
  const route = useRoute(fromMint, toMint);
  const fromBbo = useBbo(route ? route[0] : undefined);
  const fromMarket = useMarket(route ? route[0] : undefined);
  const toBbo = useBbo(route ? route[1] : undefined);

  if (route === null) {
    return undefined;
  }

  if (route.length === 1 && fromBbo !== undefined) {
    if (fromMarket === undefined) {
      return undefined;
    }
    if (
      fromMarket?.baseMintAddress.equals(fromMint) ||
      (fromMarket?.baseMintAddress.equals(WRAPPED_SOL_MINT) &&
        fromMint.equals(SOL_MINT))
    ) {
      return fromBbo.bestBid && 1.0 / fromBbo.bestBid;
    } else {
      return fromBbo.bestOffer && fromBbo.bestOffer;
    }
  }
  if (
    fromBbo === undefined ||
    fromBbo.bestBid === undefined ||
    toBbo === undefined ||
    toBbo.bestOffer === undefined
  ) {
    return undefined;
  }
  return toBbo.bestOffer / fromBbo.bestBid;
}

export function useRoute(
  fromMint: PublicKey,
  toMint: PublicKey
): Array<PublicKey> | null {
  const route = useRouteVerbose(fromMint, toMint);
  if (route === null) {
    return null;
  }
  return route.markets;
}

// Types of routes.
//
// 1. Direct trades on USDC quoted markets.
// 2. Transitive trades across two USDC qutoed markets.
// 3. Wormhole <-> Sollet one-to-one swap markets.
// 4. Wormhole <-> Native one-to-one swap markets.
//
export function useRouteVerbose(
  fromMint: PublicKey,
  toMint: PublicKey
): { markets: Array<PublicKey>; kind: RouteKind } | null {
  const { swapClient } = useDexContext();
  const { wormholeMap, solletMap } = useTokenListContext();
  const asyncRoute = useAsync(async () => {
    const swapMarket = await wormholeSwapMarket(
      swapClient.program.provider.connection,
      fromMint,
      toMint,
      wormholeMap,
      solletMap
    );
    if (swapMarket !== null) {
      const [wormholeMarket, kind] = swapMarket;
      return { markets: [wormholeMarket], kind };
    }
    const markets = swapClient.route(
      fromMint.equals(SOL_MINT) ? WRAPPED_SOL_MINT : fromMint,
      toMint.equals(SOL_MINT) ? WRAPPED_SOL_MINT : toMint
    );
    if (markets === null) {
      return null;
    }
    const kind: RouteKind = "usdx";
    return { markets, kind };
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

type RouteKind = "wormhole-native" | "wormhole-sollet" | "usdx";

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

async function wormholeSwapMarket(
  conn: Connection,
  fromMint: PublicKey,
  toMint: PublicKey,
  wormholeMap: Map<string, TokenInfo>,
  solletMap: Map<string, TokenInfo>
): Promise<[PublicKey, RouteKind] | null> {
  let market = wormholeNativeMarket(fromMint, toMint);
  if (market !== null) {
    return [market, "wormhole-native"];
  }
  market = await wormholeSolletMarket(
    conn,
    fromMint,
    toMint,
    wormholeMap,
    solletMap
  );
  if (market === null) {
    return null;
  }
  return [market, "wormhole-sollet"];
}

function wormholeNativeMarket(
  fromMint: PublicKey,
  toMint: PublicKey
): PublicKey | null {
  return WORMHOLE_NATIVE_MAP.get(wormKey(fromMint, toMint)) ?? null;
}

// Returns the market address of the 1-1 sollet<->wormhole swap market if it
// exists. Otherwise, returns null.
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

type Bbo = {
  bestBid?: number;
  bestOffer?: number;
  mid?: number;
};

const _ORDERBOOK_CACHE = new Map<string, Promise<Orderbook>>();
const _MARKET_CACHE = new Map<string, Promise<Market>>();
