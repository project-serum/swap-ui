import React, { useContext } from "react";
import { TokenListContainer, TokenInfo } from "@solana/spl-token-registry";

const _TokenListContext = React.createContext<null | TokenListContext>(null);

export function TokenListContextProvider(props: any) {
  return (
    <_TokenListContext.Provider value={{ tokenList: props.tokenList }}>
      {props.children}
    </_TokenListContext.Provider>
  );
}

type TokenListContext = {
  tokenList: TokenListContainer;
};

export function useTokenList(): TokenInfo[] {
  const ctx = useContext(_TokenListContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx.tokenList.getList();
}
