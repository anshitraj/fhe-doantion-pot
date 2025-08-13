const hre = require("hardhat");
const { writeFileSync, mkdirSync, existsSync } = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const name = "FheDonoPot";
  const Factory = await hre.ethers.getContractFactory(name);
  // constructor(address initialOwner)
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`${name} deployed to:`, address);

  const artifact = await hre.artifacts.readArtifact(name);
  const outDir = path.join(__dirname, "..", "..", "frontend", "contracts");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "addresses.fhevm.json"),
    JSON.stringify({ fhevmTestnet: { [name]: address } }, null, 2));
  writeFileSync(path.join(outDir, `${name}.abi.json`),
    JSON.stringify(artifact.abi, null, 2));
  console.log("Wrote FHEVM ABI & address to frontend/contracts/");
}
main().catch((e) => { console.error(e); process.exit(1); });
