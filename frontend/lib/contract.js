"use client";

import { BrowserProvider, JsonRpcProvider, Contract, formatEther, parseEther } from "ethers";
import addresses from "../contracts/addresses.json";
import abi from "../contracts/FheDonoPotMock.abi.json";

const SEPOLIA_CHAIN_ID_DEC = 11155111n;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

// Public read RPC so totals update even if wallet isn't connected
const READ_RPC_URL = "https://rpc.sepolia.org";
const readProvider = new JsonRpcProvider(READ_RPC_URL, 11155111);

function contractAddress() {
  const addr = addresses?.sepolia?.FheDonoPotMock;
  if (!addr) throw new Error("Missing contract address in frontend/contracts/addresses.json");
  return addr;
}

// ---- Wallet helpers ----
export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) throw new Error("MetaMask not detected");
  return new BrowserProvider(window.ethereum);
}

export async function ensureSepolia() {
  const provider = await getProvider();
  const net = await provider.getNetwork();
  if (net.chainId !== SEPOLIA_CHAIN_ID_DEC) {
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: SEPOLIA_CHAIN_ID_HEX }]);
    } catch (err) {
      if (err && err.code === 4902) {
        await provider.send("wallet_addEthereumChain", [{
          chainId: SEPOLIA_CHAIN_ID_HEX,
          chainName: "Sepolia",
          nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [READ_RPC_URL],
          blockExplorerUrls: ["https://sepolia.etherscan.io/"],
        }]);
      } else {
        throw err;
      }
    }
  }
}

export async function connectWallet() {
  const provider = await getProvider();
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { provider, signer, account: await signer.getAddress() };
}

// Expose listeners so UI can auto-refresh
export function listenWallet(onAccounts, onChain) {
  if (typeof window === "undefined" || !window.ethereum) return () => {};
  const ha = (accs) => onAccounts((accs && accs[0]) || "");
  const hc = () => onChain();
  window.ethereum.on("accountsChanged", ha);
  window.ethereum.on("chainChanged", hc);
  return () => {
    window.ethereum.removeListener("accountsChanged", ha);
    window.ethereum.removeListener("chainChanged", hc);
  };
}

// ---- Reads use PUBLIC RPC (doesn't depend on wallet) ----
export async function readTotal() {
  const c = new Contract(contractAddress(), abi, readProvider);
  const raw = await c.totalDonations();
  return formatEther(raw);
}

export async function readMine(addressOverride) {
  if (!addressOverride) return "0"; // need a wallet address to look up mapping
  const c = new Contract(contractAddress(), abi, readProvider);
  const raw = await c.donations(addressOverride);
  return formatEther(raw);
}

// ---- Write path uses wallet ----
/** Supports donate(), donate(uintX), donate(uintX) payable. */
export async function donate(amountEth) {
  const { signer } = await connectWallet();
  await ensureSepolia();
  const c = new Contract(contractAddress(), abi, signer);

  const frag = abi.find((f) => f.type === "function" && f.name === "donate");
  if (!frag) throw new Error("donate() not found in ABI");

  const wei = parseEther(String(amountEth));
  let tx;

  if (frag.inputs.length === 0) {
    tx = await c.donate({ value: wei });
  } else if (frag.inputs.length === 1) {
    if (frag.stateMutability === "payable") tx = await c.donate(wei, { value: wei });
    else tx = await c.donate(wei);
  } else {
    throw new Error("Unsupported donate() signature");
  }
  return { hash: tx.hash, wait: () => tx.wait() };
}

export function etherscanLinks(txHash) {
  const addr = contractAddress();
  return {
    contract: `https://sepolia.etherscan.io/address/${addr}`,
    tx: txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : null,
  };
}
