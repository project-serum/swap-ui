import React, { useContext, useMemo } from "react";
import { TokenInfo } from "@solana/spl-token-registry";

type TokenListContext = {
  tokenMap: Map<string, TokenInfo>;
};
const _TokenListContext = React.createContext<null | TokenListContext>(null);

export function TokenListContextProvider(props: any) {
  const tokenList = useMemo(() => props.tokenList.getList(), [props.tokenList]);
  const tokenMap = useMemo(() => {
    const tokenMap = new Map();
    tokenList.forEach((t: TokenInfo) => {
      tokenMap.set(t.address, t);
    });
    return tokenMap;
  }, [tokenList]);
  return (
    <_TokenListContext.Provider value={{ tokenMap }}>
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
