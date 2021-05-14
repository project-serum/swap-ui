import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  makeStyles,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  Typography,
} from "@material-ui/core";
import { TokenIcon } from "./Swap";
import { useSwapContext } from "./context/Swap";
import { useTokenList } from "./context/TokenList";
import { USDC_MINT, USDT_MINT } from "../utils/pubkeys";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    paddingTop: 0,
  },
  textField: {
    width: "100%",
    border: "solid 1pt #ccc",
    borderRadius: "10px",
    marginBottom: "8px",
  },
}));

export default function TokenDialog({
  open,
  onClose,
  setMint,
}: {
  open: boolean;
  onClose: () => void;
  setMint: (mint: PublicKey) => void;
}) {
  const [tokenFilter, setTokenFilter] = useState("");
  const styles = useStyles();
  const { swapClient } = useSwapContext();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          borderRadius: "10px",
        },
      }}
    >
      <div style={{ width: "420px" }}>
        <DialogTitle style={{ fontWeight: "bold" }}>Select a token</DialogTitle>
        <DialogContent className={styles.dialogContent}>
          <TextField
            className={styles.textField}
            placeholder={"Search name"}
            value={tokenFilter}
            onChange={(e) => setTokenFilter(e.target.value)}
            InputProps={{
              disableUnderline: true,
              style: { padding: "10px" },
            }}
          />
          <div>
            <List disablePadding>
              {swapClient
                .tokens()
                .concat([USDC_MINT, USDT_MINT])
                .map((mint) => (
                  <TokenListItem
                    key={mint.toString()}
                    mint={mint}
                    onClick={(mint) => {
                      setMint(mint);
                      onClose();
                    }}
                  />
                ))}
            </List>
          </div>
        </DialogContent>
      </div>
    </Dialog>
  );
}

function TokenListItem({
  mint,
  onClick,
}: {
  mint: PublicKey;
  onClick: (mint: PublicKey) => void;
}) {
  return (
    <ListItem button onClick={() => onClick(mint)}>
      <TokenIcon mint={mint} style={{ width: "30px", borderRadius: "15px" }} />
      <TokenName mint={mint} />
    </ListItem>
  );
}

function TokenName({ mint }: { mint: PublicKey }) {
  const tokenList = useTokenList();
  let tokenInfo = tokenList.filter((t) => t.address === mint.toString())[0];
  return (
    <div style={{ marginLeft: "16px" }}>
      <Typography style={{ fontWeight: "bold" }}>{tokenInfo.symbol}</Typography>
      <Typography color="textSecondary" style={{ fontSize: "14px" }}>
        {tokenInfo.name}
      </Typography>
    </div>
  );
}
