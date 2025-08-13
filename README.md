FHE Donation Pot — Sepolia Mock + Zama FHEVM Demo
Donate privately. Totals and per-user amounts are kept encrypted on-chain when running on Zama’s FHEVM — with a Sepolia mock for fast iteration and a friendly demo UX.

<p align="center"> <img alt="Hero" src="https://dummyimage.com/1200x300/0f172a/e2e8f0&text=FHE+Donation+Pot" /> </p> <p align="center"> <a href="#quickstart">Quickstart</a> • <a href="#project-structure">Structure</a> • <a href="#setup--environment">Setup & Env</a> • <a href="#deploy-mock--sepolia">Deploy (Mock)</a> • <a href="#deploy-fhevm--zama">Deploy (FHEVM)</a> • <a href="#frontend-usage">Frontend</a> • <a href="#troubleshooting">Troubleshooting</a> </p>


Here’s a clean, production-ready **README.md** you can paste at the repo root. It’s organized, skimmable, and matches your exact stack, folders, and env keys.

---

# FHE Donation Pot — Sepolia Mock + Zama FHEVM Demo

> **Donate privately.** This dApp demonstrates a privacy-by-default donation pot.
>
> * **Mock (Sepolia):** plain `uint` for fast iteration and demos.
> * **FHEVM (Zama):** encrypted amounts (`euint64`) and homomorphic adds on-chain.

---

## Table of Contents

* [Features](#features)
* [Architecture](#architecture)
* [Project Structure](#project-structure)
* [Prerequisites](#prerequisites)
* [Environment Variables](#environment-variables)
* [Quickstart](#quickstart)
* [Deploy (Sepolia Mock)](#deploy-sepolia-mock)
* [Deploy (Zama FHEVM)](#deploy-zama-fhevm)
* [Frontend Usage](#frontend-usage)
* [NPM Scripts](#npm-scripts)
* [Troubleshooting](#troubleshooting)
* [Security Notes](#security-notes)
* [License & Credits](#license--credits)

---

## Features

* 🔌 **Wallet UX**: Connect MetaMask, donate, refresh totals, view “my donations”
* 🔁 **Two backends**

  * **`FheDonoPotMock.sol` (Sepolia)** — simple payable donate, public amounts
  * **`FheDonoPot.sol` (FHEVM)** — `euint64` + TFHE math, view permissions via `TFHE.allow`
* 🧭 **Auto ABI export**: backend scripts write ABI + address into `frontend/contracts/`
* 🧰 **Solid tooling**: Next.js 13.5 + React 19 + Ethers v6, Hardhat 2.26
* 🌐 **Reliable reads**: frontend uses a **public read RPC** (works even before connecting the wallet)

---

## Architecture

```
User (Browser / MetaMask)
       │
       ├── Frontend (Next.js, Ethers v6)
       │     ├─ Read totals via public Sepolia RPC
       │     └─ Write (donate) via MetaMask
       │
       ├── Mock (Sepolia) ── FheDonoPotMock.sol   → public uint state
       │
       └── FHEVM (Zama) ── FheDonoPot.sol        → euint64, TFHE.add, TFHE.allow
                                ▲
                                └─ @fhevm/sdk in the browser encrypts amount and builds the (einput, inputProof)
```

**How this is FHEVM-ready:** the UI/UX you built on Sepolia is identical to FHEVM.
When switching to FHEVM you only:

1. Deploy `FheDonoPot.sol`,
2. Encrypt inputs client-side with `@fhevm/sdk`,
3. Call `donate(einput, inputProof)`.

---

## Project Structure

```
fhpot/
├─ backend/                          # Hardhat workspace
│  ├─ contracts/
│  │  ├─ FheDonoPotMock.sol          # Mock (Sepolia): payable donate, plain uint
│  │  └─ FheDonoPot.sol              # FHEVM: euint64 + TFHE
│  ├─ scripts/
│  │  ├─ deploy-mock.js              # Deploy to Sepolia + export ABI/address
│  │  └─ deploy-fhe.js               # Deploy to FHEVM + export ABI/address
│  ├─ hardhat.config.js
│  └─ .env                           # RPCs + PRIVATE_KEY (never commit)
│
└─ frontend/                         # Next.js app
   ├─ pages/index.js                 # UI (connect, donate, refresh, links)
   ├─ lib/contract.js                # Ethers v6 helpers (robust reads + donate)
   └─ contracts/                     # Populated by deploy scripts
      ├─ FheDonoPotMock.abi.json
      ├─ FheDonoPot.abi.json         # (after FHEVM deploy)
      ├─ addresses.json              # { sepolia: { FheDonoPotMock: "0x..." } }
      └─ addresses.fhevm.json        # { fhevmTestnet: { FheDonoPot: "0x..." } }
```

---

## Prerequisites

* **Node** 18+ (18/20 recommended)
* **MetaMask** with **Sepolia ETH** for testing
* RPC endpoints:

  * Sepolia (Alchemy/Infura/public)
  * Zama **FHEVM testnet** (for the encrypted version)

---

## Environment Variables

### `backend/.env`

```ini
# Alchemy/Infura HTTPS RPC for Sepolia
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/XXXX

# Zama FHEVM testnet RPC
FHEVM_RPC_URL=https://fhevm-testnet.zama.ai

# Test-only private key of your deployer (0x-prefixed)
PRIVATE_KEY=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# Optional: for verifying contracts
ETHERSCAN_API_KEY=YOUR_KEY
```

### `frontend/.env.local` (recommended for more reliable reads)

```ini
# Public read-only RPC (safe to expose on client)
NEXT_PUBLIC_SEPOLIA_READ_RPC=https://eth-sepolia.g.alchemy.com/v2/XXXX
```

> **Do not commit** any `.env` files. See the `.gitignore` suggestion in [Troubleshooting](#troubleshooting).

---

## Quickstart

```bash
# 1) Backend
cd backend
npm i
npx hardhat compile

# 2) Frontend
cd ../frontend
npm i
npm run dev

# open http://localhost:3000
```

---

## Deploy (Sepolia Mock)

```bash
cd backend
npx hardhat run scripts/deploy-mock.js --network sepolia
```

Outputs:

* Deployed address
* Writes:

  * `frontend/contracts/FheDonoPotMock.abi.json`
  * `frontend/contracts/addresses.json`

Go to the frontend, **refresh**, connect wallet, enter `0.001`, **Donate**, then **Refresh**.
**Total** and **My Donations** update, with Etherscan links shown.

---

## Deploy (Zama FHEVM)

> Do this after the mock flow works. This is the **encrypted** version.

1. Ensure `FheDonoPot.sol` uses:

   ```solidity
   import { TFHE, euint64, einput } from "fhevm/lib/TFHE.sol";
   function donate(einput amount, bytes calldata inputProof) external { ... }
   ```

2. Deploy:

   ```bash
   cd backend
   npx hardhat run scripts/deploy-fhe.js --network fhevmTestnet
   ```

   This writes:

   * `frontend/contracts/FheDonoPot.abi.json`
   * `frontend/contracts/addresses.fhevm.json`

3. Frontend (wire FHEVM path):

   * `npm i @fhevm/sdk`
   * In your donate handler for FHEVM, use the SDK to:

     * encrypt the 64-bit value (e.g., micro-ETH/gwei to stay within `uint64`)
     * build `{ input, proof }`
     * call `contract.donate(input, proof)`

> Tip: Add a simple “Network: Sepolia / FHEVM” badge and switch logic based on `chainId`.

---

## Frontend Usage

* **Connect** to MetaMask (switches to Sepolia if needed).
* **Donate** any small amount of ETH on Sepolia.
* **Refresh** to fetch:

  * `totalDonations` (mock) or your ABI’s equivalent
  * `donations(address)` (mock) or your ABI’s equivalent

Reads use a **public RPC**, so totals load even before connecting.

---

## NPM Scripts

**`backend/package.json`**

```json
{
  "scripts": {
    "clean": "hardhat clean",
    "compile": "hardhat compile",
    "deploy:mock": "hardhat run scripts/deploy-mock.js --network sepolia",
    "deploy:fhe": "hardhat run scripts/deploy-fhe.js --network fhevmTestnet",
    "test": "hardhat test"
  }
}
```

**`frontend/package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

---

## Troubleshooting

### Push to GitHub failed (branch behind)

```bash
git fetch origin
git pull --rebase origin main
# resolve conflicts (edit files, remove <<<<< >>>>>), then:
git add <fixed files>
git rebase --continue
git push origin main
```

### Reads fail / “NetworkError when attempting to fetch resource”

* Add `NEXT_PUBLIC_SEPOLIA_READ_RPC` in `frontend/.env.local`
* Or try CORS-friendly public RPCs (already baked into `contract.js` fallbacks)

### My Donations shows 0

* Connect wallet first; the UI auto-detects the authorized account and refreshes.
* After donating, the page stores your account and refreshes immediately.

### TFHE import / compiler errors

* Hardhat compiler should be `0.8.24`
* Import TFHE from `fhevm/lib/TFHE.sol`
* Use `einput` + `inputProof` in the FHE contract

### Suggested `.gitignore` (root)

```
# env & logs
*.log
.env
*.env
.env.local
.env.*.local

# node
node_modules/

# hardhat
backend/.env
backend/cache/
backend/artifacts/
backend/typechain/
backend/coverage/

# next.js
frontend/.next/
frontend/out/

# misc
dist/
```

---

## Security Notes

* This is a **demo**; use testnets and **test wallets** only.
* For FHE, keep values within `uint64` (choose a smaller unit like **gwei** or **micro-ETH**).
* If you ever commit secrets, **rotate keys immediately**.

---

## License & Credits

* **License:** MIT (add a `LICENSE` file if you want)
* **Credits:**

  * [Zama FHEVM](https://fhevm.zama.ai) for enabling encrypted, on-chain computation
  * [OpenZeppelin](https://openzeppelin.com/) for base contracts

---

**One-liner (GitHub description):**
*Privacy-preserving donation dApp — Next.js + Hardhat. Mock on Sepolia for UX; encrypted on Zama FHEVM using TFHE (`euint64`).*
