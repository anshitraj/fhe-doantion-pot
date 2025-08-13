FHE Donation Pot — Sepolia Mock + Zama FHEVM Demo
Donate privately. Totals and per-user amounts are kept encrypted on-chain when running on Zama’s FHEVM — with a Sepolia mock for fast iteration and a friendly demo UX.

<p align="center"> <img alt="Hero" src="https://dummyimage.com/1200x300/0f172a/e2e8f0&text=FHE+Donation+Pot" /> </p> <p align="center"> <a href="#quickstart">Quickstart</a> • <a href="#project-structure">Structure</a> • <a href="#setup--environment">Setup & Env</a> • <a href="#deploy-mock--sepolia">Deploy (Mock)</a> • <a href="#deploy-fhevm--zama">Deploy (FHEVM)</a> • <a href="#frontend-usage">Frontend</a> • <a href="#troubleshooting">Troubleshooting</a> </p>
✨ What you get
Mock on Sepolia — FheDonoPotMock.sol (plain uint) for easy testing and a zero-friction demo.

Encrypted on FHEVM — FheDonoPot.sol using euint64 + TFHE ops:

Homomorphic add on encrypted amounts.

allow(...) to grant per-address view rights.

Sealed/reencrypted outputs (SDK decrypts client-side).

Next.js 13.5 + React 19 frontend:

Connect wallet, donate, refresh totals, view “my donations”.

Reads via public Sepolia RPC (works even if wallet isn’t connected).

Hardhat backend:

Compile, deploy, verify.

Auto-export ABI + addresses to frontend/contracts/.

🗂 Project Structure
bash
Copy
Edit
fhpot/
├─ backend/                          # Hardhat workspace
│  ├─ contracts/
│  │  ├─ FheDonoPotMock.sol          # Mock (Sepolia): payable donate, plain uint
│  │  └─ FheDonoPot.sol              # FHEVM: euint64 + TFHE (homomorphic)
│  ├─ scripts/
│  │  ├─ deploy-mock.js              # Deploys mock to Sepolia + exports ABI/address
│  │  └─ deploy-fhe.js               # Deploys FHE contract to FHEVM (later)
│  ├─ hardhat.config.js
│  └─ .env                           # RPCs + PRIVATE_KEY (never commit)
│
└─ frontend/                         # Next.js app (pages router)
   ├─ pages/index.js                 # UI (connect, donate, refresh, links)
   ├─ lib/contract.js                # Ethers v6 helpers (reads via JsonRpcProvider)
   └─ contracts/                     # Populated by deploy scripts
      ├─ FheDonoPotMock.abi.json
      └─ addresses.json
🔧 Tech stack
Contracts: Solidity 0.8.24 (Hardhat), OpenZeppelin 5.x, TFHE types on FHEVM

Frontend: Next.js 13.5, React 19, Ethers v6

Networks: Sepolia (mock), Zama FHEVM testnet (encrypted)

⚡ Quickstart
bash
Copy
Edit
# 1) Backend
cd backend
npm i
npx hardhat compile

# 2) Frontend
cd ../frontend
npm i
npm run dev
# open http://localhost:3000
🧰 Setup & Environment
Create backend/.env:

ini
Copy
Edit
# Alchemy/Infura HTTPS RPC for Sepolia
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/XXXX

# Zama FHEVM testnet RPC (used when deploying the encrypted contract)
FHEVM_RPC_URL=https://fhevm-testnet.zama.ai

# Test-only private key of your deployer (0x-prefixed)
PRIVATE_KEY=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# Optional: for verify
ETHERSCAN_API_KEY=YOUR_KEY
✅ Do not commit .env. See .gitignore below.

Hardhat config (already set up):

Compiler: 0.8.24 (compatible with TFHE contracts in fhevm/lib/TFHE.sol)

Networks: sepolia and fhevmTestnet

Reads env keys: SEPOLIA_RPC_URL, FHEVM_RPC_URL, PRIVATE_KEY

🚀 Deploy (Mock • Sepolia)
bash
Copy
Edit
cd backend
npx hardhat run scripts/deploy-mock.js --network sepolia
This will:

Print the deployer and deployed address.

Export to frontend/contracts/:

FheDonoPotMock.abi.json

addresses.json { "sepolia": { "FheDonoPotMock": "0x..." } }

Then start the UI:

bash
Copy
Edit
cd ../frontend
npm run dev
# http://localhost:3000
Flow: Connect MetaMask → (auto switch to Sepolia if needed) → enter 0.001 → Donate → Refresh → totals update.

🔐 Deploy (FHEVM • Zama)
Do this after the mock flow works. This is the “real” encrypted version.

Ensure FheDonoPot.sol is the TFHE version (it already is):

import { TFHE, euint64, einput } from "fhevm/lib/TFHE.sol";

donate(einput amount, bytes inputProof)

Add the deploy script (already scaffolded as scripts/deploy-fhe.js). If you don’t have it yet, use:

js
Copy
Edit
// backend/scripts/deploy-fhe.js
const hre = require("hardhat");
const { writeFileSync, mkdirSync, existsSync } = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const name = "FheDonoPot";
  const Factory = await hre.ethers.getContractFactory(name);
  const contract = await Factory.deploy(deployer.address); // constructor(address initialOwner)
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`${name} deployed to:`, address);

  const artifact = await hre.artifacts.readArtifact(name);
  const outDir = path.join(__dirname, "..", "..", "frontend", "contracts");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  writeFileSync(path.join(outDir, "addresses.fhevm.json"),
    JSON.stringify({ fhevmTestnet: { [name]: address } }, null, 2)
  );
  writeFileSync(path.join(outDir, `${name}.abi.json`), JSON.stringify(artifact.abi, null, 2));

  console.log("FHEVM ABI & address written to frontend/contracts/");
}
main().catch((e) => { console.error(e); process.exit(1); });
Deploy:

bash
Copy
Edit
cd backend
npx hardhat run scripts/deploy-fhe.js --network fhevmTestnet
Frontend changes for FHEVM:

Add @fhevm/sdk to encrypt inputs client-side and create the einput + inputProof:

bash
Copy
Edit
cd frontend
npm i @fhevm/sdk
In your donate handler for FHEVM, do:

Initialize SDK for the chain.

Convert amount to your chosen 64-bit unit (e.g., micro-ETH or gwei).

Create encrypted input pack, add64(value), then build() → { input, proof }.

Call contract.donate(input, proof).

(You already have the Sepolia mock path working; add a chain check to switch to the FHEVM flow when connected there.)

🧑‍💻 Frontend Usage
Connect MetaMask — button at the top.

Donate — type an amount (ETH), click Donate, confirm in MetaMask.

Refresh — fetch totalDonations() and donations(address).

Reads use a public Sepolia RPC so you’ll see totals even before connecting.

Etherscan links appear at the bottom for the contract and your last transaction.

📜 NPM Scripts
backend/package.json

json
Copy
Edit
{
  "scripts": {
    "clean": "hardhat clean",
    "compile": "hardhat compile",
    "deploy:mock": "hardhat run scripts/deploy-mock.js --network sepolia",
    "deploy:fhe": "hardhat run scripts/deploy-fhe.js --network fhevmTestnet",
    "test": "hardhat test"
  }
}
frontend/package.json

json
Copy
Edit
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
🔒 Security & Notes
Never deploy real funds with this repo. Use test wallets & testnets.

Keep donations within a 64-bit range when using euint64 (choose a smaller unit like gwei or micro-ETH to avoid overflow).

.env files are secret. If you ever commit one, rotate the keys.

🧯 Troubleshooting
HH8 / undefined network vars

Verify backend/.env names: SEPOLIA_RPC_URL, FHEVM_RPC_URL, PRIVATE_KEY.

In hardhat.config.js, ensure those keys are used.

Missing TFHE import

Use import { TFHE, euint64, einput } from "fhevm/lib/TFHE.sol";

Compiler version in Hardhat must be 0.8.24.

MetaMask shows nothing / donate stuck

Ensure you’re on Sepolia (mock) or FHEVM testnet (encrypted).

Account has enough test ETH.

Check browser console for errors.

Totals don’t update

Click Refresh.

Confirm the transaction hash and that it targets the same contract address shown in the footer.

🧹 .gitignore (suggested)
Create at repo root:

bash
Copy
Edit
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
📄 License
MIT — see LICENSE (add one if you’d like).

🙌 Credits
Zama FHEVM for enabling encrypted, on-chain computation.

OpenZeppelin for battle-tested base contracts.

You, for building a privacy-friendly demo ❤️

