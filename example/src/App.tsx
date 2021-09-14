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
import { opts } from "./constants";
import { WalletProvider } from "./contexts/WalletContext";
import useWallet from "./hooks/useWallet";
import WalletModal from "./Modals/wallet";


// App illustrating the use of the Swap component.
//
// One needs to just provide an Anchor `Provider` and a `TokenListContainer`
// to the `Swap` component, and then everything else is taken care of.
function App() {
  return (
    <SnackbarProvider maxSnack={5} autoHideDuration={8000}>
      <WalletProvider>
        <SnackbarApp/>
      </WalletProvider>
    </SnackbarProvider>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

function SnackbarApp() {
  const styles = useStyles();
  const [isConnected, setIsConnected] = useState(false);
  const [walletModal, setWalletModal] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [tokenList, setTokenList] = useState<TokenListContainer | null>(null);

  const { wallet, connection } = useWallet();

  const provider = useMemo(() => {
    const provider = new NotifyingProvider(
      connection,
      wallet as any,
      opts,
      (tx, err) => {
        if (err) {
          enqueueSnackbar(err.toString(), {
            variant: "error",
          });
        } else {
          enqueueSnackbar("Transaction sent", {
            variant: "success",
            action: (
              <Button
                color='inherit'
                component='a'
                target='_blank'
                rel='noopener'
                href={`https://solscan.io/tx/${tx}`}
              >
                View on Solana Explorer
              </Button>
            ),
          });
        }
      }
    );
    return provider;
  }, [wallet, connection, enqueueSnackbar]);

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
      justify="center"
      alignItems="center"
      className={styles.root}
    >
      <WalletModal open={walletModal} setter={setWalletModal} />
      <Button
        color='inherit'
        variant='outlined'
        onClick={() => (!isConnected ? setWalletModal(true): wallet.disconnect())}
        style={{ position: "fixed", right: 24, top: 24 }}
      >
        {!isConnected ? "Connect" : "Disconnect"}
      </Button>
      {tokenList && <Swap provider={provider} tokenList={tokenList} />}
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
