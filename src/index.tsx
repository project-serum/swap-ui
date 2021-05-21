import { ReactElement } from 'react';
import { PublicKey } from "@solana/web3.js";
import { TokenListContainer } from "@solana/spl-token-registry";
import { Provider } from "@project-serum/anchor";
import { Swap as SwapClient } from "@project-serum/swap";
import { SwapContextProvider } from "./context/Swap";
import { DexContextProvider } from "./context/Dex";
import { TokenListContextProvider } from "./context/TokenList";
import { TokenContextProvider } from "./context/Token";
import SwapCard from "./components/Swap";

/**
 * A`Swap` component that can be embedded into applications. To use,
 * one can, minimally, provide a provider and token list to the component.
 * For example,
 *
 * ```javascript
 * <Swap provider={provider} tokenList={tokenList} />
 * ```
*
 * All of the complexity of communicating with the Serum DEX and managing
 * its data is handled internally by the component.
 *
 * For information on other properties like earning referrals, see the
 * [[SwapProps]] documentation.
 */
export function Swap(props: SwapProps): ReactElement {
  const {
    style,
    provider,
    tokenList,
    fromMint,
    toMint,
    fromAmount,
    toAmount,
    referral,
  } = props;
  const swapClient = new SwapClient(provider, tokenList);
  return (
    <TokenListContextProvider tokenList={tokenList}>
      <TokenContextProvider provider={provider}>
        <DexContextProvider swapClient={swapClient}>
          <SwapContextProvider
            fromMint={fromMint}
            toMint={toMint}
            fromAmount={fromAmount}
            toAmount={toAmount}
            referral={referral}
          >
            <SwapCard style={style} />
          </SwapContextProvider>
        </DexContextProvider>
      </TokenContextProvider>
    </TokenListContextProvider>
  );
}

/**
 * Properties for the `Swap` Component.
 */
export type SwapProps = {
  /**
   * Wallet and network provider. Apps can use a `Provider` subclass to hook
   * into all transactions intitiated by the component.
   */
  provider: Provider;

  /**
   * Token list providing information for tokens used.
   */
  tokenList: TokenListContainer;

  /**
   * Wallet address to which referral fees are sent (i.e. a SOL address).
   * To receive referral fees, the wallet must *own* associated token
   * accounts for the token in which the referral is paid  (usually USDC
   * or USDT).
   */
  referral?: PublicKey;

  /**
   * The default `fromMint` to use when the component first renders.
   */
  fromMint?: PublicKey;

  /**
   * The default `toMint` to use when the component first renders.
   */
  toMint?: PublicKey;

  /**
   * The initial amount for the `fromMint` to use when the component first
   * renders.
   */
  fromAmount?: number;

  /**
   * The initial amount for the `toMint` to use when the component first
   * renders.
   */
  toAmount?: number;

  /**
   * Style properties to pass through to the component.
   */
  style?: any;
};

export default Swap;
