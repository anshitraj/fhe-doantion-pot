// backend/scripts/deploy-mock.js
const hre = require("hardhat");
const { writeFileSync, mkdirSync, existsSync } = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const name = "FheDonoPotMock";
  const artifact = await hre.artifacts.readArtifact(name);
  const ctor = artifact.abi.find((x) => x.type === "constructor") || { inputs: [] };

  // Build constructor args intelligently
  let args = [];
  if (ctor.inputs.length === 1 && ctor.inputs[0].type === "address") {
    args = [deployer.address];
  } else if (ctor.inputs.length === 0) {
    args = [];
  } else {
    // If your constructor has a different signature, fail fast with a clear hint
    throw new Error(
      `Constructor requires args: ${ctor.inputs.map(i => `${i.type} ${i.name}`).join(", ")}. ` +
      `Update deploy script to pass them.`
    );
  }

  const Factory = await hre.ethers.getContractFactory(name);
  const contract = await Factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`${name} deployed to:`, address);

  // Export to frontend
  const outDir = path.join(__dirname, "..", "..", "frontend", "contracts");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  writeFileSync(
    path.join(outDir, "addresses.json"),
    JSON.stringify({ sepolia: { [name]: address } }, null, 2)
  );
  writeFileSync(path.join(outDir, `${name}.abi.json`), JSON.stringify(artifact.abi, null, 2));

  console.log("ABI & address written to frontend/contracts/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
