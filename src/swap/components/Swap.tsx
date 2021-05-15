import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { TokenListContainer } from "@solana/spl-token-registry";
import { BN, Provider } from "@project-serum/anchor";
import { Swap as SwapClient } from "@project-serum/swap";
import {
  makeStyles,
  Card,
  Button,
  Paper,
  Typography,
  TextField,
} from "@material-ui/core";
import { ExpandMore } from "@material-ui/icons";
import { SwapContextProvider, useSwapContext } from "./context/Swap";
import {
  DexContextProvider,
  useDexContext,
  useOpenOrders,
  useRoute,
  useMarket,
} from "./context/Dex";
import { MintContextProvider, useMint } from "./context/Mint";
import { TokenListContextProvider, useTokenList } from "./context/TokenList";
import { TokenContextProvider, useOwnedTokenAccount } from "./context/Token";
import TokenDialog from "./TokenDialog";
import { SettingsButton } from "./Settings";
import { InfoLabel } from "./Info";

const useStyles = makeStyles(() => ({
  card: {
    width: "450px",
    borderRadius: "10px",
    border: "solid 1pt #e0e0e0",
  },
  cardContent: {
    marginLeft: "6px",
    marginRight: "6px",
    marginBottom: "6px",
  },
  tab: {
    width: "50%",
  },
  settingsButton: {
    padding: 0,
  },
  swapButton: {
    width: "100%",
    borderRadius: "15px",
  },
  swapToFromButton: {
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  },
}));

export default function Swap({
  style,
  provider,
  tokenList,
}: {
  style?: any;
  provider: Provider;
  tokenList: TokenListContainer;
}) {
  const swapClient = new SwapClient(provider, tokenList);
  return (
    <TokenListContextProvider tokenList={tokenList}>
      <MintContextProvider provider={provider}>
        <TokenContextProvider provider={provider}>
          <DexContextProvider swapClient={swapClient}>
            <SwapContextProvider>
              <SwapCard style={style} />
            </SwapContextProvider>
          </DexContextProvider>
        </TokenContextProvider>
      </MintContextProvider>
    </TokenListContextProvider>
  );
}

function SwapCard({ style }: { style?: any }) {
  const styles = useStyles();
  return (
    <div style={style}>
      <Card className={styles.card}>
        <SwapHeader />
        <div className={styles.cardContent}>
          <SwapFromForm />
          <ArrowButton />
          <SwapToForm />
          <InfoLabel />
          <SwapButton />
        </div>
      </Card>
    </div>
  );
}

function SwapHeader() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        margin: "8px",
      }}
    >
      <Typography
        style={{
          fontWeight: "bold",
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        Swap
      </Typography>
      <SettingsButton />
    </div>
  );
}

export function ArrowButton() {
  const styles = useStyles();
  const { swapToFromMints } = useSwapContext();
  return (
    <Button className={styles.swapToFromButton} onClick={swapToFromMints}>
      ⇅
    </Button>
  );
}

function SwapFromForm() {
  const { fromMint, setFromMint, fromAmount, setFromAmount } = useSwapContext();
  return (
    <SwapTokenForm
      mint={fromMint}
      setMint={setFromMint}
      amount={fromAmount}
      setAmount={setFromAmount}
    />
  );
}

function SwapToForm() {
  const { toMint, setToMint, toAmount, setToAmount } = useSwapContext();
  return (
    <SwapTokenForm
      mint={toMint}
      setMint={setToMint}
      amount={toAmount}
      setAmount={setToAmount}
    />
  );
}

function SwapTokenForm({
  mint,
  setMint,
  amount,
  setAmount,
}: {
  mint: PublicKey;
  setMint: (m: PublicKey) => void;
  amount: number;
  setAmount: (a: number) => void;
}) {
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const tokenAccount = useOwnedTokenAccount(mint);
  const mintAccount = useMint(mint);

  return (
    <Paper elevation={0} variant="outlined" style={{ borderRadius: "10px" }}>
      <div
        style={{
          height: "50px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <TokenButton mint={mint} onClick={() => setShowTokenDialog(true)} />
        <TextField
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          style={{
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
          }}
        />
      </div>
      <div style={{ marginLeft: "10px", height: "30px" }}>
        <Typography color="textSecondary" style={{ fontSize: "14px" }}>
          {tokenAccount && mintAccount
            ? `Balance: ${(
                tokenAccount.account.amount.toNumber() /
                10 ** mintAccount.decimals
              ).toFixed(mintAccount.decimals)}`
            : `-`}
        </Typography>
      </div>
      <TokenDialog
        setMint={setMint}
        open={showTokenDialog}
        onClose={() => setShowTokenDialog(false)}
      />
    </Paper>
  );
}

function TokenButton({
  mint,
  onClick,
}: {
  mint: PublicKey;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} style={{ width: "116px" }}>
      <TokenIcon mint={mint} style={{ width: "25px", borderRadius: "13px" }} />
      <TokenName mint={mint} />
      <ExpandMore />
    </Button>
  );
}

export function TokenIcon({ mint, style }: { mint: PublicKey; style: any }) {
  const tokenList = useTokenList();
  let tokenInfo = tokenList.filter((t) => t.address === mint.toString())[0];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {tokenInfo.logoURI ? (
        <img alt="token logo" style={style} src={tokenInfo.logoURI} />
      ) : (
        <div style={style}></div>
      )}
    </div>
  );
}

function TokenName({ mint }: { mint: PublicKey }) {
  const tokenList = useTokenList();
  let tokenInfo = tokenList.filter((t) => t.address === mint.toString())[0];
  return (
    <Typography style={{ marginLeft: "5px" }}>{tokenInfo.symbol}</Typography>
  );
}

function SwapButton() {
  const styles = useStyles();
  const {
    fromMint,
    toMint,
    fromAmount,
    toAmount,
    slippage,
    isClosingNewAccounts,
  } = useSwapContext();
  const { swapClient } = useDexContext();
  const fromMintInfo = useMint(fromMint);
  const toMintInfo = useMint(toMint);
  const openOrders = useOpenOrders();
  const route = useRoute(fromMint, toMint);
  const fromMarket = useMarket(route[0]);
  const toMarket = useMarket(route[1]);

  const sendSwapTransaction = async () => {
    if (!fromMintInfo || !toMintInfo) {
      throw new Error("Unable to calculate mint decimals");
    }
    const amount = new BN(fromAmount).muln(10 ** fromMintInfo.decimals);
    const minExpectedSwapAmount = new BN(toAmount * 10 ** toMintInfo.decimals)
      .muln(100 - slippage)
      .divn(100);
    const fromOpenOrders = fromMarket
      ? openOrders.get(fromMarket?.address.toString())
      : undefined;
    const toOpenOrders = toMarket
      ? openOrders.get(toMarket?.address.toString())
      : undefined;
    await swapClient.swap({
      fromMint,
      toMint,
      amount,
      minExpectedSwapAmount,
      // Pass in the below parameters so that the client doesn't perform
      // wasteful network requests when we already have the data.
      fromMarket,
      toMarket,
      fromOpenOrders: fromOpenOrders ? fromOpenOrders[0].address : undefined,
      toOpenOrders: toOpenOrders ? toOpenOrders[0].address : undefined,
      // Auto close newly created open orders accounts.
      close: isClosingNewAccounts,
    });
  };
  return (
    <Button
      variant="contained"
      className={styles.swapButton}
      onClick={sendSwapTransaction}
    >
      Swap
    </Button>
  );
}
