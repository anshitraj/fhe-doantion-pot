// backend/hardhat.config.js
require("dotenv").config({ path: __dirname + "/.env" });
require("@nomicfoundation/hardhat-toolbox");

const { SEPOLIA_RPC_URL, FHEVM_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

const pk =
  PRIVATE_KEY && PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : (PRIVATE_KEY ? `0x${PRIVATE_KEY}` : undefined);

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } }, // matches fhevm lib
    ],
  },
  networks: {
    // always define so `--network sepolia` exists
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: pk ? [pk] : [],
    },
    fhevmTestnet: {
      url: FHEVM_RPC_URL || "",
      accounts: pk ? [pk] : [],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
};
