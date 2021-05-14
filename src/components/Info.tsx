import { makeStyles, Typography, Link, Popover } from "@material-ui/core";
import { Info } from "@material-ui/icons";
import PopupState, { bindTrigger, bindPopover } from "material-ui-popup-state";
import { useFair } from "./context/Dex";
import { useTokenList } from "./context/TokenList";
import { useSwapContext } from "./context/Swap";
import { useMint } from "./context/Mint";
import { useMarketRoute } from "./context/Dex";

const useStyles = makeStyles((theme) => ({
  infoLabel: {
    marginTop: "10px",
    marginBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    marginLeft: "5px",
    marginRight: "5px",
  },
  fairPriceLabel: {
    marginRight: "10px",
    display: "flex",
    justifyContent: "center",
    flexDirection: "column",
    color: theme.palette.text.secondary,
  },
}));

export function InfoLabel() {
  const styles = useStyles();

  const { fromMint, toMint } = useSwapContext();
  const fromMintInfo = useMint(fromMint);
  const fair = useFair(fromMint, toMint);

  const tokenList = useTokenList();
  let fromTokenInfo = tokenList.filter(
    (t) => t.address === fromMint.toString()
  )[0];
  let toTokenInfo = tokenList.filter((t) => t.address === toMint.toString())[0];

  return (
    <div className={styles.infoLabel}>
      <Typography color="textSecondary"></Typography>
      <div style={{ display: "flex" }}>
        <div className={styles.fairPriceLabel}>
          {fair !== undefined
            ? `1 ${toTokenInfo.symbol} = ${fair.toFixed(
                fromMintInfo?.decimals
              )} ${fromTokenInfo.symbol}`
            : `-`}
        </div>
        <InfoPopover />
      </div>
    </div>
  );
}

function InfoPopover() {
  const { fromMint, toMint } = useSwapContext();
  const route = useMarketRoute(fromMint, toMint);
  const tokenList = useTokenList();
  const fromMintTicker = tokenList
    .filter((t) => t.address === fromMint.toString())
    .map((t) => t.symbol)[0];
  const toMintTicker = tokenList
    .filter((t) => t.address === toMint.toString())
    .map((t) => t.symbol)[0];
  const addresses = [
    { ticker: fromMintTicker, mint: fromMint },
    { ticker: toMintTicker, mint: toMint },
  ];
  return (
    <PopupState variant="popover">
      {
        //@ts-ignore
        (popupState) => (
          <div style={{ display: "flex" }}>
            <Info {...bindTrigger(popupState)} />
            <Popover
              {...bindPopover(popupState)}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              PaperProps={{ style: { borderRadius: "10px" } }}
              disableRestoreFocus
            >
              <div style={{ padding: "15px", width: "250px" }}>
                <div>
                  <Typography
                    color="textSecondary"
                    style={{ fontWeight: "bold", marginBottom: "5px" }}
                  >
                    Trade Route
                  </Typography>
                  {route.map((market) => {
                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "5px",
                        }}
                      >
                        <Link
                          href={`https://dex.projectserum.com/#/market/${market.address.toString()}`}
                          target="_blank"
                          rel="noopener"
                        >
                          {market.name}
                        </Link>
                        <code style={{ marginLeft: "10px" }}>
                          {market.fair}
                        </code>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: "15px" }}>
                  <Typography
                    color="textSecondary"
                    style={{ fontWeight: "bold", marginBottom: "5px" }}
                  >
                    Tokens
                  </Typography>
                  {addresses.map((address) => {
                    return (
                      <div
                        style={{
                          marginTop: "5px",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Link
                          href={`https://explorer.solana.com/address/${address.mint.toString()}`}
                          target="_blank"
                          rel="noopener"
                        >
                          {address.ticker}
                        </Link>
                        <code style={{ width: "128px", overflow: "hidden" }}>
                          {address.mint.toString()}
                        </code>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Popover>
          </div>
        )
      }
    </PopupState>
  );
}
