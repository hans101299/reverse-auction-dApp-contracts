import hre from "hardhat";
import { create } from 'ipfs-http-client'
import { config } from 'dotenv'

const gcf = hre.ethers.getContractFactory;
const dp = hre.upgrades.deployProxy;
export const pEth = hre.ethers.utils.parseEther;

export function getRole(role) {
  return hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(role));
}

export async function ex(contract, command, args, messageWhenFailed) {
  try {
    var tx = await contract[command](...args);
    return await tx.wait(1);
  } catch (e) {
    console.error(messageWhenFailed, e);
  }
}

export async function verify(implementation, contractName) {
  if (!process.env.HARDHAT_NETWORK) return;
  try {
    await hre.run("verify:verify", {
      address: implementation,
      constructorArguments: [],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified"))
      console.log(`${contractName} is verified already`);
    else console.error(`Error veryfing - ${contractName}`, e);
  }
}

export async function printAddress(contractName, proxyAddress) {
  console.log(`${contractName} Proxy Address: ${proxyAddress}`);
  var implementationAddress = await upgrades.erc1967.getImplementationAddress(
    proxyAddress
  );
  console.log(`${contractName} Impl Address: ${implementationAddress}`);
  return implementationAddress;
}

export async function deploySC(contractName, args = []) {
  var smartContract = await gcf(contractName);
  var proxyContract = await dp(smartContract, [...args], {
    kind: "uups",
  });
  if (process.env.HARDHAT_NETWORK) {
    var tx = await proxyContract.deployed();
    // true cuando se usa '--network matic' en el script de deployment
    await tx.deployTransaction.wait(5);
  }
  return proxyContract;
}

export async function deploySCNoUp(contractName, args = []) {
  var SmartContract = await gcf(contractName);
  var smartContract = await SmartContract.deploy([...args]);

  // true cuando se usa '--network matic' en el script de deployment
  if (process.env.HARDHAT_NETWORK) {
    var tx = await smartContract.deployed();
    await tx.deployTransaction.wait(5);

    console.log(`${contractName} - Imp: ${smartContract.address}`);
  }
  return smartContract;
}

export async function uploadTicketMetadata(ticket){
  const projectId = process.env.INFURA_KEY;
  const projectSecret = process.env.INFURA_SECRET;
  const auth =
    "Basic " + Buffer.from(projectId + ":" + projectSecret).toString("base64");
  const ipfs = await create({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
    headers: {
      authorization: auth,
    },
  })

  const myImmutableAddress = await ipfs.add(JSON.stringify(ticket))
  return myImmutableAddress.path;
}

export async function getTicketMetadata(cid){
  const projectId = process.env.INFURA_KEY;
  const projectSecret = process.env.INFURA_SECRET;
  const auth =
    "Basic " + Buffer.from(projectId + ":" + projectSecret).toString("base64");
  const ipfs = await create({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
    headers: {
      authorization: auth,
    },
  })
  const myImmutableAddress = await ipfs.cat(cid);
  for await (const _ of myImmutableAddress) {
    return JSON.parse(_);
  }
}

