import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import {
  makeStyles,
  Card,
  Button,
  Typography,
  TextField,
  useTheme,
} from "@material-ui/core";
import { ExpandMore, ImportExportRounded } from "@material-ui/icons";
import { useSwapContext, useSwapFair } from "../context/Swap";
import {
  useDexContext,
  useOpenOrders,
  useRouteVerbose,
  useMarket,
  FEE_MULTIPLIER,
} from "../context/Dex";
import { useTokenMap } from "../context/TokenList";
import { useMint, useOwnedTokenAccount } from "../context/Token";
import { useCanSwap, useReferral } from "../context/Swap";
import TokenDialog from "./TokenDialog";
import { SettingsButton } from "./Settings";
import { InfoLabel } from "./Info";

const useStyles = makeStyles((theme) => ({
  card: {
    width: theme.spacing(50),
    borderRadius: theme.spacing(2),
    boxShadow: "0px 0px 30px 5px rgba(0,0,0,0.075)",
    padding: theme.spacing(2),
  },
  tab: {
    width: "50%",
  },
  settingsButton: {
    padding: 0,
  },
  swapButton: {
    width: "100%",
    borderRadius: theme.spacing(2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontSize: 16,
    fontWeight: 700,
    padding: theme.spacing(1.5),
  },
  swapToFromButton: {
    display: "block",
    margin: "10px auto 10px auto",
    cursor: "pointer",
  },
  amountInput: {
    fontSize: 22,
    fontWeight: 600,
  },
  input: {
    textAlign: "right",
  },
  swapTokenFormContainer: {
    borderRadius: theme.spacing(2),
    boxShadow: "0px 0px 15px 2px rgba(33,150,243,0.1)",
    display: "flex",
    justifyContent: "space-between",
    padding: theme.spacing(1),
  },
  swapTokenSelectorContainer: {
    marginLeft: theme.spacing(1),
    display: "flex",
    flexDirection: "column",
    width: "50%",
  },
  balanceContainer: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
  },
  maxButton: {
    marginLeft: theme.spacing(1),
    color: theme.palette.primary.main,
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
  },
  tokenButton: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    marginBottom: theme.spacing(1),
  },
}));

export default function SwapCard({
  containerStyle,
  contentStyle,
  swapTokenContainerStyle,
}: {
  containerStyle?: any;
  contentStyle?: any;
  swapTokenContainerStyle?: any;
}) {
  const styles = useStyles();
  return (
    <Card className={styles.card} style={containerStyle}>
      <SwapHeader />
      <div style={contentStyle}>
        <SwapFromForm style={swapTokenContainerStyle} />
        <ArrowButton />
        <SwapToForm style={swapTokenContainerStyle} />
        <InfoLabel />
        <SwapButton />
      </div>
    </Card>
  );
}

export function SwapHeader() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "16px",
      }}
    >
      <Typography
        style={{
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        SWAP
      </Typography>
      <SettingsButton />
    </div>
  );
}

export function ArrowButton() {
  const styles = useStyles();
  const theme = useTheme();
  const { swapToFromMints } = useSwapContext();
  return (
    <ImportExportRounded
      className={styles.swapToFromButton}
      fontSize="large"
      htmlColor={theme.palette.primary.main}
      onClick={swapToFromMints}
    />
  );
}

function SwapFromForm({ style }: { style?: any }) {
  const { fromMint, setFromMint, fromAmount, setFromAmount } = useSwapContext();
  return (
    <SwapTokenForm
      from
      style={style}
      mint={fromMint}
      setMint={setFromMint}
      amount={fromAmount}
      setAmount={setFromAmount}
    />
  );
}

function SwapToForm({ style }: { style?: any }) {
  const { toMint, setToMint, toAmount, setToAmount } = useSwapContext();
  return (
    <SwapTokenForm
      from={false}
      style={style}
      mint={toMint}
      setMint={setToMint}
      amount={toAmount}
      setAmount={setToAmount}
    />
  );
}

export function SwapTokenForm({
  from,
  style,
  mint,
  setMint,
  amount,
  setAmount,
}: {
  from: boolean;
  style?: any;
  mint: PublicKey;
  setMint: (m: PublicKey) => void;
  amount: number;
  setAmount: (a: number) => void;
}) {
  const styles = useStyles();

  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const tokenAccount = useOwnedTokenAccount(mint);
  const mintAccount = useMint(mint);

  const balance =
    tokenAccount &&
    mintAccount &&
    tokenAccount.account.amount.toNumber() / 10 ** mintAccount.decimals;

  const formattedAmount =
    mintAccount && amount
      ? amount.toLocaleString("fullwide", {
          maximumFractionDigits: mintAccount.decimals,
          useGrouping: false,
        })
      : amount;

  return (
    <div className={styles.swapTokenFormContainer} style={style}>
      <div className={styles.swapTokenSelectorContainer}>
        <TokenButton mint={mint} onClick={() => setShowTokenDialog(true)} />
        <Typography color="textSecondary" className={styles.balanceContainer}>
          {tokenAccount && mintAccount
            ? `Balance: ${balance?.toFixed(mintAccount.decimals)}`
            : `-`}
          {from && !!balance ? (
            <span
              className={styles.maxButton}
              onClick={() => setAmount(balance)}
            >
              MAX
            </span>
          ) : null}
        </Typography>
      </div>
      <TextField
        type="number"
        value={formattedAmount}
        onChange={(e) => setAmount(parseFloat(e.target.value))}
        InputProps={{
          disableUnderline: true,
          classes: {
            root: styles.amountInput,
            input: styles.input,
          },
        }}
      />
      <TokenDialog
        setMint={setMint}
        open={showTokenDialog}
        onClose={() => setShowTokenDialog(false)}
      />
    </div>
  );
}

function TokenButton({
  mint,
  onClick,
}: {
  mint: PublicKey;
  onClick: () => void;
}) {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <div onClick={onClick} className={styles.tokenButton}>
      <TokenIcon mint={mint} style={{ width: theme.spacing(4) }} />
      <TokenName mint={mint} style={{ fontSize: 14, fontWeight: 700 }} />
      <ExpandMore />
    </div>
  );
}

export function TokenIcon({ mint, style }: { mint: PublicKey; style: any }) {
  const tokenMap = useTokenMap();
  let tokenInfo = tokenMap.get(mint.toString());
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {tokenInfo?.logoURI ? (
        <img alt="Logo" style={style} src={tokenInfo?.logoURI} />
      ) : (
        <div style={style}></div>
      )}
    </div>
  );
}

function TokenName({ mint, style }: { mint: PublicKey; style: any }) {
  const tokenMap = useTokenMap();
  const theme = useTheme();
  let tokenInfo = tokenMap.get(mint.toString());

  return (
    <Typography
      style={{
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(1),
        ...style,
      }}
    >
      {tokenInfo?.symbol}
    </Typography>
  );
}

export function SwapButton() {
  const styles = useStyles();
  const {
    fromMint,
    toMint,
    fromAmount,
    slippage,
    isClosingNewAccounts,
    isStrict,
  } = useSwapContext();
  const { swapClient } = useDexContext();
  const fromMintInfo = useMint(fromMint);
  const toMintInfo = useMint(toMint);
  const openOrders = useOpenOrders();
  const route = useRouteVerbose(fromMint, toMint);
  const fromMarket = useMarket(
    route && route.markets ? route.markets[0] : undefined
  );
  const toMarket = useMarket(
    route && route.markets ? route.markets[1] : undefined
  );
  const canSwap = useCanSwap();
  const referral = useReferral(fromMarket);
  const fair = useSwapFair();
  const fromWallet = useOwnedTokenAccount(fromMint);
  const toWallet = useOwnedTokenAccount(toMint);
  const quoteMint = useMint(fromMarket && fromMarket.quoteMintAddress);

  // Click handler.
  const sendSwapTransaction = async () => {
    if (!fromMintInfo || !toMintInfo) {
      throw new Error("Unable to calculate mint decimals");
    }
    if (!fair) {
      throw new Error("Invalid fair");
    }
    if (!quoteMint) {
      throw new Error("Quote mint not found");
    }
    const amount = new BN(fromAmount * 10 ** fromMintInfo.decimals);
    const minExchangeRate = {
      rate: new BN((10 ** toMintInfo.decimals * FEE_MULTIPLIER) / fair)
        .muln(100 - slippage)
        .divn(100),
      fromDecimals: fromMintInfo.decimals,
      quoteDecimals: quoteMint.decimals,
      strict: isStrict,
    };
    const fromOpenOrders = fromMarket
      ? openOrders.get(fromMarket?.address.toString())
      : undefined;
    const toOpenOrders = toMarket
      ? openOrders.get(toMarket?.address.toString())
      : undefined;
    await swapClient.swap({
      fromMint,
      toMint,
      fromWallet: fromWallet ? fromWallet.publicKey : undefined,
      toWallet: toWallet ? toWallet.publicKey : undefined,
      amount,
      minExchangeRate,
      referral,
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
      disabled={!canSwap}
    >
      Swap
    </Button>
  );
}
