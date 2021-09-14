import { Connection } from "@solana/web3.js";
import { useSnackbar } from "notistack";
import { createContext, useEffect, useMemo, useState } from "react";
import { network, opts } from "../constants";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { SolanaWalletAdapter, WALLET_PROVIDERS } from "../wallet-adapters";
import { WalletAdapter } from "../wallet-adapters/types";

import * as anchor from "@project-serum/anchor";

// import {
//   Cyclos,
//   Network,
//   CyclosRpcNamespace,
//   CyclosAccountNamespace,
//   Wallet,
// } from "@cyclos-io/sdk";


interface IProps {
  children: JSX.Element[] | JSX.Element;
}

interface IdefaultValue {
  provider: any,
  wallet: WalletAdapter,
  isConnected: boolean,
  connection: Connection,
  // cyclosClient: Cyclos,
  connectWallet: (providerMeta: any) => void,
  disconnectWallet:  () => void,
};

export const WalletContext = createContext({} as IdefaultValue );

export function WalletProvider(props: IProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [autoConnect, setAutoConnect] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [providerId, setProviderId] = useLocalStorageState("WalletAddapter");

  const connection: Connection = new Connection(network.main, opts.preflightCommitment);

  const provider = useMemo(
    () => WALLET_PROVIDERS.find(({ id }) => id === providerId),
    [providerId]
  );

  const wallet: WalletAdapter = useMemo(() => {
    if (provider) {
      return new (provider.adapter || SolanaWalletAdapter)(
        provider.url,
        network.main
      );
    } else
      return new SolanaWalletAdapter("https://www.sollet.io", network.main);
  }, [provider]);

  // const cyclosClient: Cyclos = new Cyclos(
  //   connection,
  //   Network.MAIN,
  //   wallet as Wallet
  // );


  // Connect to the wallet.
  useEffect(() => {
    if (wallet) {
      wallet.on("connect", () => {
        if (wallet?.publicKey) {
          enqueueSnackbar("Wallet connected", { variant: "success" });
          setIsConnected(true);
          console.log("connected");
        }
      });
      wallet.on("disconnect", () => {
        enqueueSnackbar("Wallet disconnected", { variant: "info" });
        setIsConnected(false);
        console.log("disconnected");
      });
    }
    return () => {
      setIsConnected(false);
      if (wallet && isConnected) {
        (async () => {
          await wallet?.disconnect();
        })();
      }
    };
  }, [wallet]);

  useEffect(() => {
    (async () => {
      if (wallet && autoConnect) {
        try {
          await wallet.connect();
        } catch (error) {
          enqueueSnackbar("Connect wallet failed", { variant: "error" });
          setIsConnected(false);
        }
        setAutoConnect(false);
      }
    })();
    return () => {};
  }, [wallet, autoConnect]);

  const connectWallet = (providerMeta: any) => {
    if (!providerMeta.isAvailable()) {
      enqueueSnackbar("Extension not found.", { variant: "error" });
      return;
    }
    setProviderId(providerMeta.id);
    setAutoConnect(true);
  };

  const disconnectWallet = () => {
    (async () => {
      await wallet?.disconnect();
    })();
  };

  const value = {
    provider,
    wallet,
    isConnected,
    connection,
    // cyclosClient,
    connectWallet,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {props.children}
    </WalletContext.Provider>
  );
}
