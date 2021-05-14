import React, { useContext, useState } from "react";
import { useAsync } from "react-async-hook";
import { Provider } from "@project-serum/anchor";
import { PublicKey, Account } from "@solana/web3.js";
import { MintInfo, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const _MintContext = React.createContext<null | MintContext>(null);
type MintContext = {
  mintCache: Map<string, MintInfo>;
  setMintCache: (m: Map<string, MintInfo>) => void;
  provider: Provider;
};

export function MintContextProvider(props: any) {
  const provider = props.provider;
  const [mintCache, setMintCache] = useState(new Map<string, MintInfo>());

  return (
    <_MintContext.Provider
      value={{
        mintCache,
        setMintCache,
        provider,
      }}
    >
      {props.children}
    </_MintContext.Provider>
  );
}

export function useMint(mint?: PublicKey): MintInfo | undefined | null {
  const ctx = useContext(_MintContext);
  if (ctx === null) {
    throw new Error("Mint context not found");
  }

  // Lazy load the mint account if needeed.
  const asyncMintInfo = useAsync(async () => {
    if (!mint) {
      return undefined;
    }
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
