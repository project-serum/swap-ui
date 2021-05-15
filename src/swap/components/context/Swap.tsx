import React, { useContext, useState } from "react";
import * as assert from "assert";
import { PublicKey } from "@solana/web3.js";
import { SRM_MINT, USDC_MINT } from "../../utils/pubkeys";
import { useFairRoute } from "./Dex";

const DEFAULT_SLIPPAGE_PERCENT = 0.5;

export type SwapContext = {
  // Mint being traded from. The user must own these tokens.
  fromMint: PublicKey;
  setFromMint: (m: PublicKey) => void;

  // Mint being traded to. The user will receive these tokens after the swap.
  toMint: PublicKey;
  setToMint: (m: PublicKey) => void;

  // Amount used for the swap.
  fromAmount: number;
  setFromAmount: (a: number) => void;

  // *Expected* amount received from the swap.
  toAmount: number;
  setToAmount: (a: number) => void;

  // Function to flip what we consider to be the "to" and "from" mints.
  swapToFromMints: () => void;

  // The amount (in units of percent) a swap can be off from the estimate
  // shown to the user.
  slippage: number;
  setSlippage: (n: number) => void;

  // Null if the user is using fairs directly from DEX prices.
  // Otherwise, a user specified override for the price to use when calculating
  // swap amounts.
  fairOverride: number | null;
  setFairOverride: (n: number | null) => void;

  // True if all newly created market accounts should be closed in the
  // same user flow (ideally in the same transaction).
  isClosingNewAccounts: boolean;
  setIsClosingNewAccounts: (b: boolean) => void;
};
const _SwapContext = React.createContext<null | SwapContext>(null);

export function SwapContextProvider(props: any) {
  const [fromMint, setFromMint] = useState(SRM_MINT);
  const [toMint, setToMint] = useState(USDC_MINT);
  const [fromAmount, _setFromAmount] = useState(0);
  const [toAmount, _setToAmount] = useState(0);
  const [isClosingNewAccounts, setIsClosingNewAccounts] = useState(false);
  // Percent units.
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE_PERCENT);
  const [fairOverride, setFairOverride] = useState<number | null>(null);
  const fair = _useSwapFair(fromMint, toMint, fairOverride);

  assert.ok(slippage >= 0);

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
        fairOverride,
        setFairOverride,
        isClosingNewAccounts,
        setIsClosingNewAccounts,
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

export function useSwapFair(): number | undefined {
  const { fairOverride, fromMint, toMint } = useSwapContext();
  return _useSwapFair(fromMint, toMint, fairOverride);
}

function _useSwapFair(
  fromMint: PublicKey,
  toMint: PublicKey,
  fairOverride: number | null
): number | undefined {
  const fairRoute = useFairRoute(fromMint, toMint);
  const fair = fairOverride === null ? fairRoute : fairOverride;
  return fair;
}
