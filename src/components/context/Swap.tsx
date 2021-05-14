import React, { useContext, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { MintInfo } from "@solana/spl-token";
import { SRM_MINT, USDC_MINT } from "../../utils/pubkeys";
import { useFairRoute } from "./Dex";

const DEFAULT_SLIPPAGE_PERCENT = 0.5;

export type SwapContext = {
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
const _SwapContext = React.createContext<null | SwapContext>(null);

export function SwapContextProvider(props: any) {
  const [fromMint, setFromMint] = useState(SRM_MINT);
  const [toMint, setToMint] = useState(USDC_MINT);
  const [fromAmount, _setFromAmount] = useState(0);
  const [toAmount, _setToAmount] = useState(0);
  // Percent units.
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE_PERCENT);
  const fair = useFairRoute(fromMint, toMint);

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
    if (fair === undefined) {
      throw new Error("Fair price not found");
    }
    _setFromAmount(amount);
    _setToAmount(amount / fair);
  };

  const setToAmount = (amount: number) => {
    if (fair === undefined) {
      throw new Error("Fair price not found");
    }
    _setToAmount(amount);
    _setFromAmount(amount * fair);
  };

  return (
    <_SwapContext.Provider
      value={{
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
