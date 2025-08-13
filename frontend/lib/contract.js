"use client";

import {
  BrowserProvider,
  JsonRpcProvider,
  Contract,
  formatEther,
  parseEther,
} from "ethers";
import addresses from "../contracts/addresses.json";
import abi from "../contracts/FheDonoPotMock.abi.json";

const SEPOLIA_CHAIN_ID_DEC = 11155111n;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

// Ordered fallbacks; first working one will be used
const READ_RPCS = [
  process.env.NEXT_PUBLIC_SEPOLIA_READ_RPC, // your Alchemy/Infura (recommended)
  "https://ethereum-sepolia.publicnode.com", // good CORS
  "https://rpc.sepolia.org", // may be flaky on some browsers
  "https://endpoints.omniatech.io/v1/eth/sepolia/public",
];

function addr() {
  const a = addresses?.sepolia?.FheDonoPotMock;
  if (!a)
    throw new Error(
      "Missing contract address in frontend/contracts/addresses.json"
    );
  return a;
}

// ------- Wallet helpers -------
async function getWalletProvider() {
  if (typeof window === "undefined" || !window.ethereum)
    throw new Error("MetaMask not detected");
  return new BrowserProvider(window.ethereum);
}

export async function connectWallet() {
  const provider = await getWalletProvider();
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { provider, signer, account: await signer.getAddress() };
}

// returns the already-authorized account (no popup), or null
export async function getConnectedAccount() {
  try {
    if (typeof window === "undefined" || !window.ethereum) return null;
    const bp = new BrowserProvider(window.ethereum);
    const accounts = await bp.send("eth_accounts", []);
    return accounts?.[0] || null;
  } catch {
    return null;
  }
}

export async function ensureSepolia() {
  const provider = await getWalletProvider();
  const net = await provider.getNetwork();
  if (net.chainId !== SEPOLIA_CHAIN_ID_DEC) {
    try {
      await provider.send("wallet_switchEthereumChain", [
        { chainId: SEPOLIA_CHAIN_ID_HEX },
      ]);
    } catch (err) {
      if (err?.code === 4902) {
        await provider.send("wallet_addEthereumChain", [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [
              process.env.NEXT_PUBLIC_SEPOLIA_READ_RPC ||
                "https://ethereum-sepolia.publicnode.com",
            ],
            blockExplorerUrls: ["https://sepolia.etherscan.io/"],
          },
        ]);
      } else {
        throw err;
      }
    }
  }
}

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

// ------- Read provider (with fallbacks) -------
let cachedReadProvider = null;
export async function getReadProvider() {
  // If wallet is already on Sepolia, reuse it for reads
  try {
    if (typeof window !== "undefined" && window.ethereum) {
      const bp = new BrowserProvider(window.ethereum);
      const net = await bp.getNetwork();
      if (net.chainId === SEPOLIA_CHAIN_ID_DEC) {
        cachedReadProvider = bp;
        return cachedReadProvider;
      }
    }
  } catch {}

  if (cachedReadProvider) return cachedReadProvider;

  for (const url of READ_RPCS.filter(Boolean)) {
    try {
      const p = new JsonRpcProvider(url, 11155111);
      await p.getBlockNumber(); // health check
      cachedReadProvider = p;
      return p;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[read rpc fail]", url, e?.message || e);
    }
  }
  throw new Error(
    "No working Sepolia RPC for reads. Set NEXT_PUBLIC_SEPOLIA_READ_RPC in .env.local"
  );
}

// ------- ABI helpers (robust to name differences) -------
function pickTotalFunc() {
  const preferred = [
    "totalDonations",
    "total",
    "getTotal",
    "getTotalDonations",
    "totalRaised",
    "totalPot",
  ];
  for (const name of preferred) {
    if (
      abi.find(
        (f) =>
          f.type === "function" &&
          f.name === name &&
          (f.inputs?.length || 0) === 0
      )
    )
      return name;
  }
  const f = abi.find(
    (x) =>
      x.type === "function" &&
      x.stateMutability === "view" &&
      (x.inputs?.length || 0) === 0 &&
      Array.isArray(x.outputs) &&
      x.outputs.length === 1 &&
      String(x.outputs[0].type || "").startsWith("uint")
  );
  return f?.name;
}

function pickMyFuncAddress() {
  const preferred = [
    "donations",
    "deposits",
    "balances",
    "userDonations",
    "getDonation",
    "getDeposits",
    "getBalance",
  ];
  for (const name of preferred) {
    if (
      abi.find(
        (f) =>
          f.type === "function" &&
          f.name === name &&
          (f.inputs?.length || 0) === 1 &&
          (f.inputs?.[0]?.type || "") === "address"
      )
    )
      return name;
  }
  const f = abi.find(
    (x) =>
      x.type === "function" &&
      x.stateMutability === "view" &&
      (x.inputs?.length || 0) === 1 &&
      (x.inputs?.[0]?.type || "") === "address" &&
      Array.isArray(x.outputs) &&
      x.outputs.length === 1 &&
      String(x.outputs[0].type || "").startsWith("uint")
  );
  return f?.name;
}

function pickMyFuncNoArg() {
  const preferred = [
    "getMyDeposit",
    "myDeposit",
    "getMyDonation",
    "myDonation",
    "mine",
  ];
  for (const name of preferred) {
    if (
      abi.find(
        (f) =>
          f.type === "function" &&
          f.name === name &&
          (f.inputs?.length || 0) === 0
      )
    )
      return name;
  }
  const f = abi.find(
    (x) =>
      x.type === "function" &&
      x.stateMutability === "view" &&
      (x.inputs?.length || 0) === 0 &&
      Array.isArray(x.outputs) &&
      x.outputs.length === 1 &&
      String(x.outputs[0].type || "").startsWith("uint")
  );
  return f?.name;
}

// ------- Reads -------
export async function readTotal() {
  const provider = await getReadProvider();
  const c = new Contract(addr(), abi, provider);
  const name = pickTotalFunc();
  if (!name) throw new Error("No total() view found in ABI");
  const raw = await c[name]();
  return formatEther(raw);
}

export async function readMine(addressOverride) {
  const provider = await getReadProvider();
  if (!addressOverride) return "0";
  const c = new Contract(addr(), abi, provider);
  const nameAddr = pickMyFuncAddress();
  if (nameAddr) {
    const raw = await c[nameAddr](addressOverride);
    return formatEther(raw);
  }
  const nameNoArg = pickMyFuncNoArg();
  if (nameNoArg) {
    // Some contracts expose "getMyDeposit()" which reads msg.sender. When calling via provider,
    // we pass a "from" override so the node simulates msg.sender during eth_call.
    const raw = await c[nameNoArg]({ from: addressOverride });
    return formatEther(raw);
  }
  throw new Error(
    "No per-user view found in ABI (expected donations(address) or getMyDeposit())"
  );
}

// ------- Write -------
/** Supports donate(), donate(uintX), donate(uintX) payable. */
export async function donate(amountEth) {
  const { signer } = await connectWallet();
  await ensureSepolia();
  const c = new Contract(addr(), abi, signer);

  const frag = abi.find((f) => f.type === "function" && f.name === "donate");
  if (!frag) throw new Error("donate() not found in ABI");

  const wei = parseEther(String(amountEth));
  let tx;
  if (frag.inputs.length === 0) {
    tx = await c.donate({ value: wei });
  } else if (frag.inputs.length === 1) {
    if (frag.stateMutability === "payable")
      tx = await c.donate(wei, { value: wei });
    else tx = await c.donate(wei);
  } else {
    throw new Error("Unsupported donate() signature");
  }
  return { hash: tx.hash, wait: () => tx.wait() };
}

export function etherscanLinks(txHash) {
  const a = addr();
  return {
    contract: `https://sepolia.etherscan.io/address/${a}`,
    tx: txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : null,
  };
}
