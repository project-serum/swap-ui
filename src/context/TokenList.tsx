import React, { useContext, useEffect, useMemo, useState } from "react";
import { TokenInfo } from "@solana/spl-token-registry";
import { SOL_MINT } from "../utils/pubkeys";
import { PublicKey } from "@solana/web3.js";
import {
  fetchSolPrice,
  getUserTokens,
  OwnedTokenDetailed,
} from "../utils/userTokens";

type TokenListContext = {
  tokenMap: Map<string, TokenInfo>;
  wormholeMap: Map<string, TokenInfo>;
  solletMap: Map<string, TokenInfo>;
  swappableTokens: TokenInfo[];
  swappableTokensSollet: TokenInfo[];
  swappableTokensWormhole: TokenInfo[];
  ownedTokensDetailed: OwnedTokenDetailed[];
};
const _TokenListContext = React.createContext<null | TokenListContext>(null);

// Tag in the spl-token-registry for sollet wrapped tokens.
export const SPL_REGISTRY_SOLLET_TAG = "wrapped-sollet";

// Tag in the spl-token-registry for wormhole wrapped tokens.
export const SPL_REGISTRY_WORM_TAG = "wormhole";

const SOL_TOKEN_INFO = {
  chainId: 101,
  address: SOL_MINT.toString(),
  name: "Native SOL",
  decimals: "9",
  symbol: "SOL",
  logoURI:
    "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/solana/info/logo.png",
  tags: [],
  extensions: {
    website: "https://solana.com/",
    serumV3Usdc: "9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT",
    serumV3Usdt: "HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1",
    coingeckoId: "solana",
    waterfallbot: "https://t.me/SOLwaterfall",
  },
};

export function TokenListContextProvider(props: any) {
  const [ownedTokensDetailed, setOwnedTokensDetailed] = useState<
    OwnedTokenDetailed[]
  >([]);

  const tokenList = useMemo(() => {
    const list = props.tokenList.filterByClusterSlug("mainnet-beta").getList();
    // Manually add a fake SOL mint for the native token. The component is
    // opinionated in that it distinguishes between wrapped SOL and SOL.
    list.push(SOL_TOKEN_INFO);
    return list;
  }, [props.tokenList]);

  const pk: PublicKey | undefined = props?.provider?.wallet?.publicKey;

  // Token map for quick lookup.
  const tokenMap = useMemo(() => {
    const tokenMap = new Map();
    tokenList.forEach((t: TokenInfo) => {
      tokenMap.set(t.address, t);
    });
    return tokenMap;
  }, [tokenList]);

  useEffect(() => {
    (async () => {
      let solBalance: number = 0;
      if (pk) solBalance = await props.provider.connection.getBalance(pk);
      const tokens = await getUserTokens(pk?.toString());
      const solPrice = await fetchSolPrice();

      solBalance = solBalance / 10 ** +SOL_TOKEN_INFO.decimals;

      const SolDetails = {
        address: SOL_TOKEN_INFO.address,
        balance: solBalance.toFixed(6),
        usd: +(solBalance * solPrice).toFixed(4),
      };
      // only show the sol token if wallet is connected
      if (pk) {
        setOwnedTokensDetailed([SolDetails, ...tokens]);
      } else {
        // on disconnect, tokens = []
        setOwnedTokensDetailed(tokens);
      }
    })();
  }, [pk]);

  // Tokens with USD(x) quoted markets.
  const swappableTokens = useMemo(() => {
    const allTokens = tokenList.filter((t: TokenInfo) => {
      const isUsdxQuoted =
        t.extensions?.serumV3Usdt || t.extensions?.serumV3Usdc;
      return isUsdxQuoted;
    });

    const ownedTokensList = ownedTokensDetailed.map((t) => t.address);

    // Partition allTokens (pass & fail reduce)
    const [ownedTokens, notOwnedtokens] = allTokens.reduce(
      ([p, f]: [TokenInfo[], TokenInfo[]], t: TokenInfo) =>
        // pass & fail condition
        ownedTokensList.includes(t.address) ? [[...p, t], f] : [p, [...f, t]],
      [[], []]
    );
    notOwnedtokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    // sort by price in USD
    ownedTokens.sort(
      (a: TokenInfo, b: TokenInfo) =>
        +ownedTokensDetailed.filter((t: any) => t.address === b.address)?.[0]
          .usd -
        +ownedTokensDetailed.filter((t: any) => t.address === a.address)?.[0]
          .usd
    );
    const tokens = ownedTokens.concat(notOwnedtokens);

    return tokens;
  }, [tokenList, tokenMap, ownedTokensDetailed]);

  // Sollet wrapped tokens.
  const [swappableTokensSollet, solletMap] = useMemo(() => {
    const tokens = tokenList.filter((t: TokenInfo) => {
      const isSollet = t.tags?.includes(SPL_REGISTRY_SOLLET_TAG);
      return isSollet;
    });
    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    return [
      tokens,
      new Map<string, TokenInfo>(tokens.map((t: TokenInfo) => [t.address, t])),
    ];
  }, [tokenList]);

  // Wormhole wrapped tokens.
  const [swappableTokensWormhole, wormholeMap] = useMemo(() => {
    const tokens = tokenList.filter((t: TokenInfo) => {
      const isSollet = t.tags?.includes(SPL_REGISTRY_WORM_TAG);
      return isSollet;
    });
    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    return [
      tokens,
      new Map<string, TokenInfo>(tokens.map((t: TokenInfo) => [t.address, t])),
    ];
  }, [tokenList]);

  return (
    <_TokenListContext.Provider
      value={{
        tokenMap,
        wormholeMap,
        solletMap,
        swappableTokens,
        swappableTokensWormhole,
        swappableTokensSollet,
        ownedTokensDetailed,
      }}
    >
      {props.children}
    </_TokenListContext.Provider>
  );
}

export function useTokenListContext(): TokenListContext {
  const ctx = useContext(_TokenListContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx;
}

export function useTokenMap(): Map<string, TokenInfo> {
  const { tokenMap } = useTokenListContext();
  return tokenMap;
}

export function useSwappableTokens() {
  const { swappableTokens, swappableTokensWormhole, swappableTokensSollet } =
    useTokenListContext();
  return { swappableTokens, swappableTokensWormhole, swappableTokensSollet };
}
