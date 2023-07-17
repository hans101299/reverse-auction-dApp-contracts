import { config } from 'dotenv'
import { getRole, verify, deploySC, deploySCNoUp, ex, printAddress } from "../utils/index.js";


var MINTER_ROLE = getRole("MINTER_ROLE");
var RECORDER_ROLE = getRole("RECORDER_ROLE");

async function updateReverseAuction() {
  var UpgradeableProxyAddress = "0x47B22E425B80FdEFECd0bDD31A9C6eB8f0E7Da50"; // V1
  const ReverseAuctionV2 = await hre.ethers.getContractFactory(
    "ReverseAuction"
  );
  var reverseAuctionV2 = await upgrades.upgradeProxy(
    UpgradeableProxyAddress,
    ReverseAuctionV2
  );
  await reverseAuctionV2.deployTransaction.wait(5);

  var implmntAddress = await upgrades.erc1967.getImplementationAddress(
    reverseAuctionV2.address
  );
  console.log("El Proxy address es (V2):", reverseAuctionV2.address);
  console.log("El Implementation address es (V2):", implmntAddress);

  await hre.run("verify:verify", {
    address: implmntAddress,
    constructorArguments: [],
  });
}

 updateReverseAuction()
// deployGoerli()
  //
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
