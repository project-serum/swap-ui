import React, { useContext, useMemo } from "react";
import { TokenInfo } from "@solana/spl-token-registry";
import { USDC_MINT, USDT_MINT } from "../../utils/pubkeys";

type TokenListContext = {
  tokenMap: Map<string, TokenInfo>;
  swappableTokens: TokenInfo[];
  swappableTokensSollet: TokenInfo[];
  swappableTokensWormhole: TokenInfo[];
};
const _TokenListContext = React.createContext<null | TokenListContext>(null);

export function TokenListContextProvider(props: any) {
  const tokenList = useMemo(
    () => props.tokenList.filterByClusterSlug("mainnet-beta").getList(),
    [props.tokenList]
  );
  const tokenMap = useMemo(() => {
    const tokenMap = new Map();
    tokenList.forEach((t: TokenInfo) => {
      tokenMap.set(t.address, t);
    });
    return tokenMap;
  }, [tokenList]);
  const swappableTokens = useMemo(() => {
    const tokens = tokenList
      .filter((t: TokenInfo) => {
        const isUsdxQuoted =
          t.extensions?.serumV3Usdt || t.extensions?.serumV3Usdc;
        const isSol =
          t.address === "So11111111111111111111111111111111111111112";
        return isUsdxQuoted && !isSol;
      })
      .concat([
        tokenMap.get(USDC_MINT.toString()),
        tokenMap.get(USDT_MINT.toString()),
      ]);
    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    return tokens;
  }, [tokenList, tokenMap]);
  const swappableTokensSollet = useMemo(() => {
    const tokens = tokenList.filter((t: TokenInfo) => {
      const isSollet = t.tags?.includes("wrapped-sollet");
      return isSollet;
    });
    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    return tokens;
  }, [tokenList]);
  const swappableTokensWormhole = useMemo(() => {
    const tokens = tokenList.filter((t: TokenInfo) => {
      const isSollet = t.tags?.includes("wormhole");
      return isSollet;
    });
    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    return tokens;
  }, [tokenList]);

  return (
    <_TokenListContext.Provider
      value={{
        tokenMap,
        swappableTokens,
        swappableTokensWormhole,
        swappableTokensSollet,
      }}
    >
      {props.children}
    </_TokenListContext.Provider>
  );
}

function useTokenListContext(): TokenListContext {
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
