import "@fontsource/roboto";
import { useState, useEffect, useMemo } from "react";
import { SnackbarProvider, useSnackbar } from "notistack";
import { Button, Grid, makeStyles } from "@material-ui/core";
import { Provider } from "@project-serum/anchor";
// @ts-ignore
import Wallet from "@project-serum/sol-wallet-adapter";
import {
  Signer,
  ConfirmOptions,
  Connection,
  Transaction,
  TransactionSignature,
  PublicKey,
} from "@solana/web3.js";
import {
  TokenListContainer,
  TokenListProvider,
} from "@solana/spl-token-registry";
import Swap from "@project-serum/swap-ui";
import "./App.css";

import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  getPhantomWallet,
  getSolletWallet,
} from '@solana/wallet-adapter-wallets';
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  WalletDialogProvider as MaterialUIWalletDialogProvider,
  WalletMultiButton as MaterialUIWalletMultiButton,
} from '@solana/wallet-adapter-material-ui';

// App illustrating the use of the Swap component.
//
// One needs to just provide an Anchor `Provider` and a `TokenListContainer`
// to the `Swap` component, and then everything else is taken care of.
function App() {

  const network = "https://solana-api.projectserum.com";

  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSolletWallet({ network: "htpps://api.devnet.solana.com" as WalletAdapterNetwork }),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={wallets} >
        <MaterialUIWalletDialogProvider style={{backgroundColor: 'white', color: 'red'}}>
          <SnackbarProvider maxSnack={5} autoHideDuration={8000}>
            <AppInner />
          </SnackbarProvider>
        </MaterialUIWalletDialogProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

function AppInner() {
  const styles = useStyles();
  const { enqueueSnackbar } = useSnackbar();
  const [isConnected, setIsConnected] = useState(false);
  const [tokenList, setTokenList] = useState<TokenListContainer | null>(null);

  const opts: ConfirmOptions = {
    preflightCommitment: "recent"
  }
  const newWallet = useWallet();
  const { connection: newConnection } = useConnection();
  const newProvider = new Provider(newConnection, newWallet as AnchorWallet, opts);

  const [provider, wallet] = useMemo(() => {
    const opts: ConfirmOptions = {
      preflightCommitment: "recent",
      commitment: "recent",
    };
    const network = "https://solana-api.projectserum.com";
    const wallet = new Wallet("https://www.sollet.io", network);
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new NotifyingProvider(
      connection,
      wallet,
      opts,
      (tx, err) => {
        if (err) {
          enqueueSnackbar(`Error: ${err.toString()}`, {
            variant: "error",
          });
        } else {
          enqueueSnackbar("Transaction sent", {
            variant: "success",
            action: (
              <Button
                color="inherit"
                component="a"
                target="_blank"
                rel="noopener"
                href={`https://explorer.solana.com/tx/${tx}`}
              >
                View on Solana Explorer
              </Button>
            ),
          });
        }
      }
    );
    return [provider, wallet];
  }, [enqueueSnackbar]);

  useEffect(() => {
    new TokenListProvider().resolve().then(setTokenList);
  }, [setTokenList]);

  // Connect to the wallet.
  useEffect(() => {
    wallet.on("connect", () => {
      enqueueSnackbar("Wallet connected", { variant: "success" });
      setIsConnected(true);
    });
    wallet.on("disconnect", () => {
      enqueueSnackbar("Wallet disconnected", { variant: "info" });
      setIsConnected(false);
    });
  }, [wallet, enqueueSnackbar]);

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      className={styles.root}
    >
      <Button
        variant="outlined"
        onClick={() => (!isConnected ? wallet.connect() : wallet.disconnect())}
        style={{ position: "fixed", right: 24, top: 24 }}
      >
        {!isConnected ? "Connect" : "Disconnect"}
      </Button>
      <MaterialUIWalletMultiButton  style={{ position: "fixed", left: 24, top: 24 }}/>
      {tokenList && <Swap provider={newProvider} tokenList={tokenList} />}
    </Grid>
  );
}

// Cast wallet to AnchorWallet in order to be compatible with Anchor's Provider class
interface AnchorWallet {
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  publicKey: PublicKey;
}

// Custom provider to display notifications whenever a transaction is sent.
//
// Note that this is an Anchor wallet/network provider--not a React provider,
// so all transactions will be flowing through here, which allows us to
// hook in to display all transactions sent from the `Swap` component
// as notifications in the parent app.
class NotifyingProvider extends Provider {
  // Function to call whenever the provider sends a transaction;
  private onTransaction: (
    tx: TransactionSignature | undefined,
    err?: Error
  ) => void;

  constructor(
    connection: Connection,
    wallet: Wallet,
    opts: ConfirmOptions,
    onTransaction: (tx: TransactionSignature | undefined, err?: Error) => void
  ) {
    const newWallet = wallet as AnchorWallet;
    super(connection, newWallet, opts);
    this.onTransaction = onTransaction;
  }

  async send(
    tx: Transaction,
    signers?: Array<Signer | undefined>,
    opts?: ConfirmOptions
  ): Promise<TransactionSignature> {
    try {
      const txSig = await super.send(tx, signers, opts);
      this.onTransaction(txSig);
      return txSig;
    } catch (err) {
      if (err instanceof Error || err === undefined) {
        this.onTransaction(undefined, err);
      }
      return "";
    }
  }

  async sendAll(
    txs: Array<{ tx: Transaction; signers: Array<Signer | undefined> }>,
    opts?: ConfirmOptions
  ): Promise<Array<TransactionSignature>> {
    try {
      const txSigs = await super.sendAll(txs, opts);
      txSigs.forEach((sig) => {
        this.onTransaction(sig);
      });
      return txSigs;
    } catch (err) {
      if (err instanceof Error || err === undefined) {
        this.onTransaction(undefined, err);
      }
      return [];
    }
  }
}

export default App;
