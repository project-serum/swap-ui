import { useContext } from "react";
import { WalletContext } from "../contexts/WalletContext";

export default function useWallet() {
  const values  = useContext(WalletContext);
  return {
    ...values
  };
}
