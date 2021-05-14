import React, { useContext, useState } from "react";
import { Swap as SwapClient } from "@project-serum/swap";
import { PublicKey } from "@solana/web3.js";
import { MintInfo } from "@solana/spl-token";

const SRM_MINT = new PublicKey("SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt");
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const USDT_MINT = new PublicKey(
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
);

const _SwapContext = React.createContext<null | SwapContext>(null);

export function SwapContextProvider(props: any) {
  const swapClient = props.swapClient;
  const [fromMint, setFromMint] = useState(SRM_MINT);
  const [toMint, setToMint] = useState(USDC_MINT);
  const [fromAmount, _setFromAmount] = useState(0);
  const [toAmount, _setToAmount] = useState(0);
  // Percent units.
  const [slippage, setSlippage] = useState(0.5);

  const swapToFromMints = () => {
    const oldFrom = fromMint;
    const oldFromAmount = fromAmount;
    const oldTo = toMint;
    const oldToAmount = toAmount;
    setFromMint(oldTo);
    setToMint(oldFrom);
    _setFromAmount(oldToAmount);
    _setToAmount(oldFromAmount);
  };

  const setFromAmount = (amount: number) => {
    _setFromAmount(amount);
  };

  const setToAmount = (amount: number) => {
    _setToAmount(amount);
  };

  return (
    <_SwapContext.Provider
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
        swapToFromMints,
        slippage,
        setSlippage,
      }}
    >
      {props.children}
    </_SwapContext.Provider>
  );
}

export function useSwapContext(): SwapContext {
  const ctx = useContext(_SwapContext);
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
  swapToFromMints: () => void;
  fromMintAccount?: MintInfo;
  toMintAccount?: MintInfo;
  slippage: number;
  setSlippage: (n: number) => void;
};
