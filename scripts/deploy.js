import "dotenv/config";
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("Missing deployer. Deploy using Remix + MetaMask or provide a local-only Hardhat key.");

  const baseUri = process.env.NFT_METADATA_BASE_URI || "";
  if (!baseUri) throw new Error("NFT_METADATA_BASE_URI is required. Do not deploy with placeholder metadata.");
  console.log("Deploying with:", deployer.address);
  console.log("Metadata base URI:", baseUri);

  const Contract = await hre.ethers.getContractFactory("BaseQuestMilestones");
  const contract = await Contract.deploy(deployer.address, baseUri);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("BaseQuestMilestones deployed to:", address);
  console.log("Remember to update VITE_CONTRACT_ADDRESS after deployment.");
  console.log("Add this to .env as VITE_CONTRACT_ADDRESS=", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
