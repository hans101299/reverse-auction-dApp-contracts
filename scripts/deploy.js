import { config } from 'dotenv'
import { getRole, verify, deploySC, deploySCNoUp, ex, printAddress } from "../utils/index.js";


var MINTER_ROLE = getRole("MINTER_ROLE");
var RECORDER_ROLE = getRole("RECORDER_ROLE");
var UPGRADER_ROLE = getRole("UPGRADER_ROLE");
var URI_SETTER_ROLE = getRole("URI_SETTER_ROLE");

async function deploy() {
  // gnosis safe
  // Crear un gnosis safe en https://gnosis-safe.io/app/
  // Extraer el address del gnosis safe y pasarlo al contrato con un setter
  var gnosis = { address: "0x7Ef636a727e26450Ca6324964F64476449C2a004" };
  var relayer = { address: "0x4ed14b75f7cb6d25bc440ec99c4999eb7cf99512" }
  //Desplegar el contrato stableCoin
  var usdcContract = await deploySCNoUp("USDCoin");
  verify(usdcContract.address, "USDCoin");
  //Desplegar la subasta
  var reverseAuction = await deploySC("ReverseAuction",[]);
  var implementationReverseAuction = await printAddress("RA", reverseAuction.address);
  verify(implementationReverseAuction, "RA");
  //Desplegar el NFT de tickets
  var nftTicketContract = await deploySC("TicketReverseAuction",[]);
  var implementationNftTicket = await printAddress("TKTNFT", nftTicketContract.address);
  verify(implementationNftTicket, "TKTNFT");
  //Desplegar el NFT de modificadores
  var nftModifierContract = await deploySC("ModifierReverseAuction",[]);
  var implementationNftModifier = await printAddress("MODNFT", nftModifierContract.address);
  verify(implementationNftModifier, "MODNFT");

  await ex(reverseAuction, "setUSDCCoin", [usdcContract.address], "SCUSDC");
  await ex(reverseAuction, "setTicketNFT", [nftTicketContract.address], "SCTKTNFT");
  await ex(reverseAuction, "setModifierNFT", [nftModifierContract.address], "SCMODNFT");

  await ex(reverseAuction, "grantRole", ["0x0000000000000000000000000000000000000000000000000000000000000000", gnosis.address], "GR");
  await ex(reverseAuction, "grantRole", [RECORDER_ROLE, relayer.address], "GR");
  await ex(nftTicketContract, "grantRole", [MINTER_ROLE, reverseAuction.address], "GR");
  await ex(nftModifierContract, "grantRole", [MINTER_ROLE, reverseAuction.address], "GR");
  await ex(reverseAuction, "grantRole", [UPGRADER_ROLE, gnosis.address], "GR");
  await ex(nftModifierContract, "grantRole", [URI_SETTER_ROLE, relayer.address], "GR");
  await ex(nftTicketContract, "grantRole", [URI_SETTER_ROLE, relayer.address], "GR");
}

 deploy()
// deployGoerli()
  //
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
