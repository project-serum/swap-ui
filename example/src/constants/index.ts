import { ConfirmOptions } from "@solana/web3.js";

export const network = {
  dev: "https://api.devnet.solana.com",
  main: "https://solana--mainnet.datahub.figment.io/apikey/322e81397704cfc3ef2c334c40a21021",
}

export const opts: ConfirmOptions = {
  preflightCommitment: "processed",
  commitment: "processed",
  skipPreflight: true,
};
