import hre from "hardhat";
import chai from "chai";
import nHelp from "@nomicfoundation/hardhat-network-helpers"
const { expect } = chai;
const { ethers, upgrades } = hre;
const { time } = nHelp;

import { getRole, deploySC, deploySCNoUp, ex, pEth, uploadTicketMetadata } from "../utils/index.js";

var owner, gnosis, relayer, alice, bob, carl, deysi;

const UPGRADER_ROLE = getRole("UPGRADER_ROLE");
const RECORDER_ROLE = getRole("RECORDER_ROLE");
const MINTER_ROLE = getRole("MINTER_ROLE");
const URI_SETTER_ROLE = getRole("URI_SETTER_ROLE");

const hundredDolars = ethers.utils.parseUnits("100",6);
const tenDolars = ethers.utils.parseUnits("10",6);
const fiveDolars = ethers.utils.parseUnits("5",6);
const fiftyDolars = ethers.utils.parseUnits("50",6);

var now
var endtimecommit
var endtimemodifiers
var endtimereveal

var TITLE_AUCTION
var DESCRIPTION_AUCTION
var PRIZE_AUCTION
var STARTTIME_AUCTION
var ENTRYPRICE_AUCTION
var ENDTIMECOMMIT_AUCTION
var ENDTIMEMODIFIERS_AUCTION
var ENDTIMEREVEAL_AUCTION
var NORMAL_SELECT_TYPE_AUCTION
var NORMAL_RANDOM_TYPE_AUCTION
var MODIFIER_SELECT_TYPE_AUCTION
var MODIFIERS_RANDOM_TYPE_AUCTION
var INEXISTENT_TYPE_AUCTION

async function setVariables(initialTime){
    now = new Date(initialTime*1000);
    endtimecommit = new Date(initialTime*1000 + 3600000);
    endtimemodifiers = new Date(initialTime*1000 + 3600000*2);
    endtimereveal = new Date(initialTime*1000 + 3600000*3);

    TITLE_AUCTION = "Summer Auction";
    DESCRIPTION_AUCTION = "Auction with a prize of 10 usdcCoin";
    PRIZE_AUCTION = hundredDolars;
    STARTTIME_AUCTION = Math.floor(now.getTime()/1000);
    ENTRYPRICE_AUCTION = tenDolars;
    ENDTIMECOMMIT_AUCTION = Math.floor(endtimecommit.getTime()/ 1000);
    ENDTIMEMODIFIERS_AUCTION = Math.floor(endtimemodifiers.getTime()/ 1000);
    ENDTIMEREVEAL_AUCTION = Math.floor(endtimereveal.getTime()/ 1000);
    NORMAL_SELECT_TYPE_AUCTION = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("NORMAL_SELECT"));
    NORMAL_RANDOM_TYPE_AUCTION = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("NORMAL_RANDOM"));
    MODIFIER_SELECT_TYPE_AUCTION = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("WITH_MODIFIERS_SELECT"));
    MODIFIERS_RANDOM_TYPE_AUCTION = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("WITH_MODIFIERS_RANDOM"));
    INEXISTENT_TYPE_AUCTION = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("INEXISTENT_TYPE_AUCTION"));

}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

describe("REVERSE AUCTION TESTING", function () {
    var nftTicketContract, nftModifierContract, reverseAuction, usdc;
    const cienmilTokens = pEth("100000");
    const diezmilTokens = pEth("10000");

    before(async () => {
        [owner, gnosis, relayer, alice, bob, carl, deysi] = await ethers.getSigners();
        
    });

    // Estos dos métodos a continuación publican los contratos en cada red
    // Se usan en distintos tests de manera independiente
    // Ver ejemplo de como instanciar los contratos en deploy.js
    async function deployNftSC() {
        nftContract = await deploySC("ReverseAuction",[]);
        //Se asigna el rol de minter al relayer
        await ex(nftContract, "grantRole", [MINTER_ROLE, relayer.address], "GR");
    }

    async function deployReverseAuctionSC() {
        usdc = await deploySCNoUp("USDCoin",[]);
        reverseAuction = await deploySC("ReverseAuction",[]);
        nftTicketContract = await deploySC("TicketReverseAuction",[]);
        nftModifierContract = await deploySC("ModifierReverseAuction",[]);
        await ex(reverseAuction, "setUSDCCoin", [usdc.address], "SCUSDC");
        await ex(reverseAuction, "setTicketNFT", [nftTicketContract.address], "SCTKTNFT");
        await ex(reverseAuction, "setModifierNFT", [nftModifierContract.address], "SCMODNFT");
        // await ex(publicSale, "setGnosisWallet", [gnosis.address], "SGW");
        // await ex(publicSale, "setNumberNFTs", [30], "SetUp Number NFTs");
        await ex(usdc, "mint", [alice.address, cienmilTokens], "USDC Mint");
        await ex(reverseAuction, "grantRole", [RECORDER_ROLE, relayer.address], "GR");
        await ex(nftTicketContract, "grantRole", [MINTER_ROLE, reverseAuction.address], "GR");
        await ex(nftModifierContract, "grantRole", [MINTER_ROLE, reverseAuction.address], "GR");
        await ex(reverseAuction, "grantRole", ["0x0000000000000000000000000000000000000000000000000000000000000000", gnosis.address], "GR");
        await ex(reverseAuction, "grantRole", [UPGRADER_ROLE, gnosis.address], "GR");
        await ex(nftModifierContract, "grantRole", [URI_SETTER_ROLE, relayer.address], "GR");
        await ex(nftTicketContract, "grantRole", [URI_SETTER_ROLE, relayer.address], "GR");

    }

    describe("USDC Coin Smart Contract", () => {
        before(async() => {
            await deployReverseAuctionSC();
        });
        it("Hacer Mint sin tener el rol", async() => {
            var mensajeError = "AccessControl: account " + alice.address.toLowerCase() + " is missing role " + MINTER_ROLE;

            await expect(usdc.connect(alice).mint(alice.address, 10)).to.be.revertedWith(mensajeError);
        });
    });

    describe("NFT Modifier Smart Contract", () => {
        before(async() => {
            // Se publica el contrato antes de cada test
            await deployReverseAuctionSC();
        });

        it("Hacer Mint sin tener el rol", async() => {
            var mensajeError = "AccessControl: account " + alice.address.toLowerCase() + " is missing role " + MINTER_ROLE;

            await expect(nftModifierContract.connect(alice).safeMint(alice.address, 2,0,9)).to.be.revertedWith(mensajeError);
        });

        it("Cambiar URI sin tener rol", async() => {
            var type = 0;
            var value = 4;
            await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
            await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);

            var mensajeError = "AccessControl: account " + alice.address.toLowerCase() + " is missing role " + URI_SETTER_ROLE;
            await expect(nftModifierContract.connect(alice).setTokenURI(1, "test")).to.be.revertedWith(mensajeError);
        });

        it("Validar URIBase", async() => {
            var type = 0;
            var value = 4;
            await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
            await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);

            await nftModifierContract.connect(relayer).setTokenURI(1, "test");

            expect(await nftModifierContract.tokenURI(1)).to.be.equal("ipfs://test");
        });
        

        describe("Sobre el contrato", function () {
            before(async() => {
                // Se publica el contrato antes de cada test
                await deployReverseAuctionSC();
            });

            it('Soporta interface', async() => {
                //Para corroborar que soporta la interface ERC165
                expect(await nftModifierContract.supportsInterface("0x01ffc9a7")).to.be.equal(true);
            });
    
            it('Intentar inicializarlo nuevamente', async() => {
                await expect(nftModifierContract.initialize()).to.be.revertedWith("Initializable: contract is already initialized");
            });
    
            it('Actualizacion insatisfactoria', async () => {
        
                var NFTModifierUpgrade = await ethers.getContractFactory("ModifierReverseAuction");

                NFTModifierUpgrade = NFTModifierUpgrade.connect(alice);
    
                var mensajeError = 'AccessControl: account '+alice.address.toLowerCase()+' is missing role '+ UPGRADER_ROLE.toString();
                
                await expect(upgrades.upgradeProxy(nftModifierContract.address, NFTModifierUpgrade)).to.be.revertedWith(mensajeError);
    
            });
    
            it('Actualizacion satisfactoria', async () => {
        
                var NFTModifierUpgrade = await ethers.getContractFactory("ModifierReverseAuction");
                
                const nftModifierV2 = await upgrades.upgradeProxy(nftModifierContract.address, NFTModifierUpgrade);
                
                await nftModifierV2.deployTransaction.wait();
    
            });
        });
    });

    describe("NFT Ticket Smart Contract", () => {
        before(async() => {
            // Se publica el contrato antes de cada test
            await deployReverseAuctionSC();
            await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
            await setVariables(await time.latest());
            var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_SELECT_TYPE_AUCTION);
            await tx.wait();
            var numberSelected = getRandomInt(10);
            var commit = await reverseAuction.connect(alice).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
            await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
            //Se asigna el cid del metadata creado para Alice
            //
            var tx = await reverseAuction.connect(alice).participateSelectAuction(commit,1);
            await tx.wait();
        });

        it("Hacer Mint sin tener el rol", async() => {
            var mensajeError = "AccessControl: account " + alice.address.toLowerCase() + " is missing role " + MINTER_ROLE;

            await expect(nftTicketContract.connect(alice).safeMint(alice.address, 2)).to.be.revertedWith(mensajeError);
        });

        it("Cambiar URI sin tener rol", async() => {
            var mensajeError = "AccessControl: account " + alice.address.toLowerCase() + " is missing role " + URI_SETTER_ROLE;
            await expect(nftTicketContract.connect(alice).setTokenURI(1, "test")).to.be.revertedWith(mensajeError);
        });

        it("Validar URIBase", async() => {
            await nftTicketContract.connect(relayer).setTokenURI(1, "test");

            expect(await nftTicketContract.tokenURI(1)).to.be.equal("ipfs://test");
        });

        it("Quemar ticket", async() => {
            var tx = await nftTicketContract.connect(alice).approve(reverseAuction.address,1);
            await tx.wait();

        });

        describe("Sobre el contrato", function () {
            before(async() => {
                // Se publica el contrato antes de cada test
                await deployReverseAuctionSC();
            });

            it('Soporta interface', async() => {
                //Para corroborar que soporta la interface ERC165
                expect(await nftTicketContract.supportsInterface("0x01ffc9a7")).to.be.equal(true);
            });
    
            it('Intentar inicializarlo nuevamente', async() => {
                await expect(nftTicketContract.initialize()).to.be.revertedWith("Initializable: contract is already initialized");
            });
    
            it('Actualizacion insatisfactoria', async () => {
        
                var NFTTicketUpgrade = await ethers.getContractFactory("TicketReverseAuction");

                NFTTicketUpgrade = NFTTicketUpgrade.connect(alice);
    
                var mensajeError = 'AccessControl: account '+alice.address.toLowerCase()+' is missing role '+ UPGRADER_ROLE.toString();
                
                await expect(upgrades.upgradeProxy(nftTicketContract.address, NFTTicketUpgrade)).to.be.revertedWith(mensajeError);
    
            });
    
            it('Actualizacion satisfactoria', async () => {
        
                var NFTTicketUpgrade = await ethers.getContractFactory("TicketReverseAuction");
                
                const nftTicketV2 = await upgrades.upgradeProxy(nftTicketContract.address, NFTTicketUpgrade);
                
                await nftTicketV2.deployTransaction.wait();
    
            });
        });
    });

    describe("Reverse Auction Smart Contract", () => {

        describe("Crear Subasta", () => {
            before(async() => {
                await deployReverseAuctionSC();
            });

            it("Crear Subasta sin suficiente allowance", async() => {
                
                await setVariables(await time.latest());
                await expect(reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_SELECT_TYPE_AUCTION)).to.be.revertedWith("Reverse Auction: Not enough allowance");

            });

            it("Crear Subasta sin suficiente balance", async() => {
                await usdc.connect(bob).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                await expect(reverseAuction.connect(bob).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_SELECT_TYPE_AUCTION)).to.be.revertedWith("Reverse Auction: Not enough token balance");

            })

            it("Crear Subasta Normal Select satisfactoriamente", async() => {
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_SELECT_TYPE_AUCTION);
                await expect(tx)
                .to.emit(reverseAuction, "CreateAuction")
                .withArgs(alice.address, 1);
            });

            it("Crear Subasta Normal Random satisfactoriamente", async() => {
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_RANDOM_TYPE_AUCTION);
                await expect(tx)
                .to.emit(reverseAuction, "CreateAuction")
                .withArgs(alice.address, 2);
            });

            it("Crear Subasta Modifiers Select satisfactoriamente", async() => {
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, MODIFIER_SELECT_TYPE_AUCTION);
                await expect(tx)
                .to.emit(reverseAuction, "CreateAuction")
                .withArgs(alice.address, 3);
            });

            it("Crear Subasta Modifiers Select satisfactoriamente", async() => {
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, MODIFIERS_RANDOM_TYPE_AUCTION);
                await expect(tx)
                .to.emit(reverseAuction, "CreateAuction")
                .withArgs(alice.address, 4);
            });

            it("Crear Subasta con tipo inexistente", async() => {
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                await expect(reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, INEXISTENT_TYPE_AUCTION)).to.be.revertedWith("Reverse Auction: Not allowed type of auction");
            });

            it("Revisar lista de subastas nuevas por paginado con tamaño de pagina incorrecto", async() => {
                await expect(reverseAuction.getAuctionsPage(0,0)).to.be.revertedWith("Reverse Auction: Page size must be positive");
            });

            it("Revisar lista de subastas nuevas por paginado con numero de pagina incorrecto", async() => {
                await expect(reverseAuction.getAuctionsPage(1,5)).to.be.revertedWith("Reverse Auction: Out of bounds");
            });

            it("Revisar lista de subastas nuevas por paginado", async() => {
                var [auctions1,] = await reverseAuction.getAuctionsPage(0,3);
                var [auctions2,] = await reverseAuction.getAuctionsPage(1,3);
                var auctionsTotal = auctions1.concat(auctions2);
                expect(auctionsTotal.length).to.be.equal(4);
            });

            it("Revisar lista de subastas nuevas luego de actualizacion", async() => {
                await time.increase(7200);
                var tx = await reverseAuction.connect(owner).updateNewAuctions();
                await tx.wait();
                var [auctionsTotal,] = await reverseAuction.getAuctionsPage(0,10);
                expect(auctionsTotal.length).to.be.equal(0);
            });

        });

        describe("Normal Select", () => {
            before(async() => {
                // Se publica el contrato antes de cada test
                await deployReverseAuctionSC();
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_SELECT_TYPE_AUCTION);
                await tx.wait();
            });
            describe("Creación y Etapa de commit en subasta", () => {
                it("Validar creación de subasta", async () => {
                    const auctionCreated = await reverseAuction.getAuction(1);
                    expect(auctionCreated.id).to.be.equal(1);
                    expect(auctionCreated.auctioneer).to.be.equal(alice.address);
                    expect(auctionCreated.title).to.be.equal(TITLE_AUCTION);
                    expect(auctionCreated.description).to.be.equal(DESCRIPTION_AUCTION);
                    expect(auctionCreated.prize).to.be.equal(PRIZE_AUCTION);
                    expect(auctionCreated.entryPrice).to.be.equal(ENTRYPRICE_AUCTION);
                    expect(auctionCreated.startTime).to.be.equal(STARTTIME_AUCTION);
                    expect(auctionCreated.endTimeCommit).to.be.equal(ENDTIMECOMMIT_AUCTION);
                    expect(auctionCreated.endTimeModifiers).to.be.equal(ENDTIMECOMMIT_AUCTION);
                    expect(auctionCreated.endTimeReveal).to.be.equal(ENDTIMEREVEAL_AUCTION);
                    expect(auctionCreated.typeA).to.be.equal(NORMAL_SELECT_TYPE_AUCTION);
                    expect(auctionCreated.totalBidders).to.be.equal(0);
                    expect(auctionCreated.exists).to.be.equal(true);
                    expect(auctionCreated.claimed).to.be.equal(false);
                    expect(await reverseAuction.totalAuctions()).to.be.equal(1);
                });
    
                it("Usuario participa en una subasta inexistente", async () => {
                    //Se crea un numero aleatorio como si fuera la eleccion de la persona
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(alice).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    await expect(reverseAuction.connect(alice).participateSelectAuction(commit,2)).to.be.revertedWith("Reverse Auction: The selected Auction id doesn't exist");
                });
    
                it("Usuario participa en una subasta sin suficiente allowance", async () => {
                    //Se crea un numero aleatorio como si fuera la eleccion de la persona
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(bob).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    //Se da allowance de 5 dolares cuando debe ser de 10
                    await usdc.connect(bob).approve(reverseAuction.address, fiveDolars);
                    await expect(reverseAuction.connect(bob).participateSelectAuction(commit,1)).to.be.revertedWith("Reverse Auction: Not enough allowance");
                });
    
                it("Usuario participa en una subasta sin suficiente balance", async () => {
                    //Se crea un numero aleatorio como si fuera la eleccion de la persona
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(bob).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    await usdc.connect(bob).approve(reverseAuction.address, tenDolars);
                    //La biletera de bob no tiene dolares
                    await expect(reverseAuction.connect(bob).participateSelectAuction(commit,1)).to.be.revertedWith("Reverse Auction: Not enough token balance");
                });

                it("Usuario intenta participar con el metodo incorrecto", async () => {
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(alice).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave

                    await expect(reverseAuction.connect(relayer).participateRandomAuction(commit,1, alice.address)).to.be.revertedWith("Reverse Auction: This auction is of a normal type, so you cannot commit, the participant must do it");
                });
    
                it("Usuario participa en una subasta satisfactoriamente", async () => {
                    //Se crea un numero aleatorio como si fuera la eleccion de la persona
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(alice).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                    //Se asigna el cid del metadata creado para Alice
                    //
                    var tx = await reverseAuction.connect(alice).participateSelectAuction(commit,1);
                    await expect(tx)
                    .to.emit(reverseAuction, "Commit")
                    .withArgs(alice.address, 1, 1);
                    await tx.wait();
                    expect(await reverseAuction.totalTickets()).to.be.equal(1);
    
                    const myAuctions = await reverseAuction.connect(alice).getMyBidsInAuction(1);
                    expect(myAuctions.length).to.be.equal(1);
                    expect(myAuctions[0]).to.be.equal(1); //Id del ticket igual a 1
                    //Validar que el commit se guardó correctamente
                    expect(await reverseAuction.getCommitInAuction(1,myAuctions[0])).to.be.equal(commit);
    
                });

                it("Usuario revisa las subastas en las que participa" , async () => {
                    var [myAuctions, len] = await reverseAuction.connect(alice).getMyAuctionsPage(0,20);
                    expect(len).to.be.equal(1);
                    expect(myAuctions[0]).to.be.equal(1);
                });

                it("Subastador trata de reclamar sus ganancias antes de terminar la etapa de commit", async () => {
                    await expect(reverseAuction.connect(alice).claimAuctionProfits(1)).to.be.revertedWith("Reverse Auction: Profits can only be claimed after commits");
                });

                it("Usuario participa en una subasta fuera de tiempo", async () => {
                    //Se crea un numero aleatorio como si fuera la eleccion de la persona
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(bob).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    //Avanzar 1 hora y un poco mas para estar fuera de tiempo
                    await time.increase(4000);
                    
                    await expect(reverseAuction.connect(bob).participateSelectAuction(commit,1)).to.be.revertedWith("Reverse Auction: It is out of time to make a commit");
                });
    
            });
            
            describe("Etapa de reveal en subasta", () => {
                var numberSelected;
                before(async() => {
                    // Se publica el contrato antes de cada test
                    await deployReverseAuctionSC();
                    await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                    //Crear Subasta
                    await setVariables(await time.latest());
                    var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                        ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_SELECT_TYPE_AUCTION);
                    //Seleccionar numero
                    numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(alice).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                    var tx = await reverseAuction.connect(alice).participateSelectAuction(commit,1);
                    await tx.wait();
                    await time.increase(3720);
                });

                it("Usuario trata de revelar un ticket en una subasta inexistente", async () => {
                    await expect(reverseAuction.connect(alice).revealAuction(2,1,123,"password")).to.be.revertedWith("Reverse Auction: The selected Auction id doesn't exist");
                });

                it("Usuario trata de revelar un ticket que no es suyo", async () => {
                    await expect(reverseAuction.connect(bob).revealAuction(1,1,123,"password")).to.be.revertedWith("Reverse Auction: Only the owner of the ticket can reveal the bid");
                });

                it("Usuario trata de revelar un ticket con el commit incorrecto", async () => {
                    await expect(reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"passIncorrect")).to.be.revertedWith("Reverse Auction: Number and/or password incorrect for this ticket");
                });

                it("Usuario revela satisfactoriamente su apuesta", async () => {
                    var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                    await expect(tx)
                    .to.emit(reverseAuction, "Reveal")
                    .withArgs(alice.address, 1, numberSelected*10);
                    await tx.wait();

                });

                it("Usuario trata de revelar su apuesta fuera de tiempo", async () => {
                    await time.increase(7420);
                    await expect(reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123")).to.be.revertedWith("Reverse Auction: It is out of time to reveal");
                });

            });

            describe("Reclamar el premio", () => {
                var numberSelectedAlice;
                var numberSelectedCarl;
                before(async() => {

                    // Se publica el contrato antes de cada test
                    await deployReverseAuctionSC();
                    //Dar usdc a carl para que tambien pueda participar
                    await ex(usdc, "mint", [carl.address, cienmilTokens], "USDC Mint");
                    await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                    //Crear Subasta
                    await setVariables(await time.latest());

                    var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                        ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_SELECT_TYPE_AUCTION);
                    //Seleccionar numero

                    numberSelectedAlice = 3;
                    var commit = await reverseAuction.connect(alice).createCommitment(numberSelectedAlice,"pass123"); //Se crea el commitment con una clave
                    await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                    var tx = await reverseAuction.connect(alice).participateSelectAuction(commit,1);
                    await tx.wait();

                    numberSelectedCarl = 2;
                    var commit = await reverseAuction.connect(carl).createCommitment(numberSelectedCarl,"pass123"); //Se crea el commitment con una clave
                    await usdc.connect(carl).approve(reverseAuction.address, tenDolars);
                    var tx = await reverseAuction.connect(carl).participateSelectAuction(commit,1);
                    await tx.wait();
                    await time.increase(3600);

                    //Revelar apuestas
                    var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelectedAlice,"pass123");
                    await tx.wait()
                    var tx = await reverseAuction.connect(carl).revealAuction(1,2,numberSelectedCarl,"pass123");
                    await tx.wait()
                    await time.increase(7200);

                });

                it("Usuario trata de reclamar un ticket en una subasta inexistente", async () => {
                    await expect(reverseAuction.connect(carl).claimAuctionPrize(2,2)).to.be.revertedWith("Reverse Auction: The selected Auction id doesn't exist");
                });

                it("Usuario reclama premio sin ser el dueño del ticket", async () => {
                    await expect(reverseAuction.connect(alice).claimAuctionPrize(1,2)).to.be.revertedWith("Reverse Auction: Only the owner of the ticket can claim the prize");

                });

                it("Usuario ganador reclama premio", async () => {
                    var tx = await reverseAuction.connect(carl).claimAuctionPrize(1,2);
                    await expect(tx)
                    .to.emit(reverseAuction, "ClaimPrize")
                    .withArgs(carl.address, 1, numberSelectedCarl*10);
                    await expect(tx)
                    .to.changeTokenBalance(usdc, carl.address, hundredDolars);
                    await tx.wait();

                    const auctionCreated = await reverseAuction.getAuction(1);
                    expect(auctionCreated.lowestBid).to.be.equal(numberSelectedCarl*10);
                    expect(auctionCreated.winner).to.be.equal(carl.address);

                });

                it("Usuario no ganador intenta reclamar premio", async () => {
                    var tx = await reverseAuction.connect(alice).claimAuctionPrize(1,1);
                    await tx.wait();
                    await expect(tx)
                    .to.changeTokenBalance(usdc, alice.address, 0);
                    await tx.wait();

                });

                it("No subastador trata de reclamar ganancias", async () => {
                    await expect(reverseAuction.connect(carl).claimAuctionProfits(1)).to.be.revertedWith("Reverse Auction: You are not the auctioneer");
                });

                it("Subastador reclama sus ganancias de una subasta inexistente", async () => {
                    await expect(reverseAuction.connect(alice).claimAuctionProfits(2)).to.be.revertedWith("Reverse Auction: The selected Auction id doesn't exist");
                });

                it("Subastador reclama sus ganancias", async () => {
                    var tx = await reverseAuction.connect(alice).claimAuctionProfits(1);
                    await expect(tx)
                    .to.changeTokenBalance(usdc, alice.address, ENTRYPRICE_AUCTION*2*90/100);
                    await tx.wait();
                });
                
            });

        });
        describe("Normal Random", () => {
            before(async() => {
                // Se publica el contrato antes de cada test
                await deployReverseAuctionSC();
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_RANDOM_TYPE_AUCTION);
                await expect(tx)
                .to.emit(reverseAuction, "CreateAuction")
                .withArgs(alice.address, 1);
                await tx.wait();
            });

            describe("Creación y Etapa de commit en subasta", () => {
                it("Validar creación de subasta", async () => {
                    const auctionCreated = await reverseAuction.getAuction(1);
                    expect(auctionCreated.id).to.be.equal(1);
                    expect(auctionCreated.auctioneer).to.be.equal(alice.address);
                    expect(auctionCreated.title).to.be.equal(TITLE_AUCTION);
                    expect(auctionCreated.description).to.be.equal(DESCRIPTION_AUCTION);
                    expect(auctionCreated.prize).to.be.equal(PRIZE_AUCTION);
                    expect(auctionCreated.entryPrice).to.be.equal(ENTRYPRICE_AUCTION);
                    expect(auctionCreated.startTime).to.be.equal(STARTTIME_AUCTION);
                    expect(auctionCreated.endTimeCommit).to.be.equal(ENDTIMECOMMIT_AUCTION);
                    expect(auctionCreated.endTimeModifiers).to.be.equal(ENDTIMECOMMIT_AUCTION);
                    expect(auctionCreated.endTimeReveal).to.be.equal(ENDTIMEREVEAL_AUCTION);
                    expect(auctionCreated.typeA).to.be.equal(NORMAL_RANDOM_TYPE_AUCTION);
                    expect(auctionCreated.totalBidders).to.be.equal(0);
                    expect(auctionCreated.exists).to.be.equal(true);
                    expect(auctionCreated.claimed).to.be.equal(false);
                    expect(await reverseAuction.totalAuctions()).to.be.equal(1);
                });

                it("Usuario participa en una subasta inexistente", async () => {
                    //Se crea un numero aleatorio como si fuera la eleccion de la persona
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(alice).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    await expect(reverseAuction.connect(relayer).participateRandomAuction(commit,2,alice.address)).to.be.revertedWith("Reverse Auction: The selected Auction id doesn't exist");
                });

                it("Usuario intenta participar directamente sin relayer", async () => {
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(alice).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    var mensajeError = "AccessControl: account " + alice.address.toLowerCase() + " is missing role " + RECORDER_ROLE;

                    await expect(reverseAuction.connect(alice).participateRandomAuction(commit,1,alice.address)).to.be.revertedWith(mensajeError);
                });

                it("Usuario participa en una subasta sin suficiente allowance", async () => {
                    //Se crea un numero aleatorio como si fuera la eleccion de la persona
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(bob).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    //Se da allowance de 5 dolares cuando debe ser de 10
                    await expect(reverseAuction.connect(relayer).participateRandomAuction(commit,1,bob.address)).to.be.revertedWith("Reverse Auction: Not enough allowance");
                });
    
                it("Usuario participa en una subasta sin suficiente balance", async () => {
                    //Se crea un numero aleatorio como si fuera la eleccion de la persona
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(bob).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    await usdc.connect(bob).approve(reverseAuction.address, tenDolars);
                    //La biletera de bob no tiene dolares
                    await expect(reverseAuction.connect(relayer).participateRandomAuction(commit,1,bob.address)).to.be.revertedWith("Reverse Auction: Not enough token balance");
                });

                it("Usuario intenta participar con el metodo incorrecto", async () => {
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(alice).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave

                    await expect(reverseAuction.connect(alice).participateSelectAuction(commit,1)).to.be.revertedWith("Reverse Auction: This auction is of a random type, so you cannot commit, the relayer must do it");
                });

                it("Usuario participa en una subasta satisfactoriamente", async () => {
                    //Se crea un numero aleatorio como si lo decidiera el relayer
                    var numberSelected = getRandomInt(10);
                    //El relayer crea el commitment con una clave que le pasa el participante
                    var commit = await reverseAuction.connect(relayer).createCommitment(numberSelected,"pass123"); 
                    //El participante debe dar allowance y tener suficiente balance
                    await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                    //El relayer registra la participacion
                    var tx = await reverseAuction.connect(relayer).participateRandomAuction(commit,1,alice.address);
                    await expect(tx)
                    .to.emit(reverseAuction, "Commit")
                    .withArgs(alice.address, 1, 1);
                    await tx.wait();
                    expect(await reverseAuction.totalTickets()).to.be.equal(1);
    
                    const myAuctions = await reverseAuction.connect(alice).getMyBidsInAuction(1);
                    expect(myAuctions.length).to.be.equal(1);
                    expect(myAuctions[0]).to.be.equal(1); //Id del ticket igual a 1
                    //Validar que el commit se guardó correctamente
                    expect(await reverseAuction.getCommitInAuction(1,myAuctions[0])).to.be.equal(commit);
    
                });

                it("Usuario participa en una subasta fuera de tiempo", async () => {
                    //Se crea un numero aleatorio como si fuera la eleccion de la persona
                    var numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(bob).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    //Avanzar 1 hora y un poco mas para estar fuera de tiempo
                    await time.increase(4000);
                    
                    await expect(reverseAuction.connect(relayer).participateRandomAuction(commit,1,bob.address)).to.be.revertedWith("Reverse Auction: It is out of time to make a commit");
                });
            });

            describe("Etapa de reveal en subasta", () => {
                var numberSelected;
                before(async() => {
                    // Se publica el contrato antes de cada test
                    await deployReverseAuctionSC();
                    await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                    //Crear Subasta
                    await setVariables(await time.latest());
                    var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                        ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_RANDOM_TYPE_AUCTION);
                    //Seleccionar numero
                    numberSelected = getRandomInt(10);
                    var commit = await reverseAuction.connect(relayer).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                    await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                    var tx = await reverseAuction.connect(relayer).participateRandomAuction(commit,1,alice.address);
                    await tx.wait();
                    await time.increase(3600);
                });

                //Los demás casos son iguales que en NORMAL SELECT

                it("Usuario revela satisfactoriamente su apuesta", async () => {
                    var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                    await expect(tx)
                    .to.emit(reverseAuction, "Reveal")
                    .withArgs(alice.address, 1, numberSelected*10);
                    await tx.wait()

                });

            });

            describe("Reclamar el premio", () => {
                var numberSelectedAlice;
                var numberSelectedCarl;
                before(async() => {

                    // Se publica el contrato antes de cada test
                    await deployReverseAuctionSC();
                    //Dar usdc a carl para que tambien pueda participar
                    await ex(usdc, "mint", [carl.address, cienmilTokens], "USDC Mint");
                    await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                    //Crear Subasta
                    await setVariables(await time.latest());
                    var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                        ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_RANDOM_TYPE_AUCTION);
                    
                    //Numero "aleatorio" seleccionado para la prueba

                    numberSelectedAlice = 3;
                    var commit = await reverseAuction.connect(relayer).createCommitment(numberSelectedAlice,"pass123"); //Se crea el commitment con una clave
                    await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                    var tx = await reverseAuction.connect(relayer).participateRandomAuction(commit,1,alice.address);
                    await tx.wait();

                    numberSelectedCarl = 2;
                    var commit = await reverseAuction.connect(relayer).createCommitment(numberSelectedCarl,"pass123"); //Se crea el commitment con una clave
                    await usdc.connect(carl).approve(reverseAuction.address, tenDolars);
                    var tx = await reverseAuction.connect(relayer).participateRandomAuction(commit,1,carl.address);
                    await tx.wait();
                    await time.increase(3600);
                    //Revelar apuestas
                    var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelectedAlice,"pass123");
                    await tx.wait()
                    var tx = await reverseAuction.connect(carl).revealAuction(1,2,numberSelectedCarl,"pass123");
                    await tx.wait()
                    await time.increase(7200);

                });

                it("Usuario reclama premio", async () => {
                    var tx = await reverseAuction.connect(carl).claimAuctionPrize(1,2);
                    await expect(tx)
                    .to.emit(reverseAuction, "ClaimPrize")
                    .withArgs(carl.address, 1, numberSelectedCarl * 10);
                    await expect(tx)
                    .to.changeTokenBalance(usdc, carl.address, hundredDolars);
                    await tx.wait();

                    const auctionCreated = await reverseAuction.getAuction(1);
                    expect(auctionCreated.lowestBid).to.be.equal(numberSelectedCarl * 10);
                    expect(auctionCreated.winner).to.be.equal(carl.address);

                });
                
            });
        });

        describe("Modifier Select", () => {
            var numberSelected;
            beforeEach(async() => {
                // Se publica el contrato antes de cada test
                await deployReverseAuctionSC();
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, MODIFIER_SELECT_TYPE_AUCTION);
                await tx.wait();

                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);

                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, MODIFIER_SELECT_TYPE_AUCTION);
                await tx.wait();
                
                numberSelected = 8;
                var commit = await reverseAuction.connect(relayer).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                var tx = await reverseAuction.connect(alice).participateSelectAuction(commit,1);
                await tx.wait();

                await ex(usdc, "mint", [bob.address, cienmilTokens], "USDC Mint");
                var numberSelected2 = 4
                var commit = await reverseAuction.connect(relayer).createCommitment(numberSelected2,"pass123"); //Se crea el commitment con una clave
                await usdc.connect(bob).approve(reverseAuction.address, tenDolars);
                var tx = await reverseAuction.connect(bob).participateSelectAuction(commit,1);
                await tx.wait();

                await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                var tx = await reverseAuction.connect(alice).participateSelectAuction(commit,2);
                await tx.wait();
                await time.increase(3600);

            });

            it("Validar creación de subasta", async () => {
                const auctionCreated = await reverseAuction.getAuction(1);
                expect(auctionCreated.id).to.be.equal(1);
                expect(auctionCreated.auctioneer).to.be.equal(alice.address);
                expect(auctionCreated.title).to.be.equal(TITLE_AUCTION);
                expect(auctionCreated.description).to.be.equal(DESCRIPTION_AUCTION);
                expect(auctionCreated.prize).to.be.equal(PRIZE_AUCTION);
                expect(auctionCreated.entryPrice).to.be.equal(ENTRYPRICE_AUCTION);
                expect(auctionCreated.startTime).to.be.equal(STARTTIME_AUCTION);
                expect(auctionCreated.endTimeCommit).to.be.equal(ENDTIMECOMMIT_AUCTION);
                expect(auctionCreated.endTimeModifiers).to.be.equal(ENDTIMEMODIFIERS_AUCTION);
                expect(auctionCreated.endTimeReveal).to.be.equal(ENDTIMEREVEAL_AUCTION);
                expect(auctionCreated.typeA).to.be.equal(MODIFIER_SELECT_TYPE_AUCTION);
                expect(auctionCreated.totalBidders).to.be.equal(0);
                expect(auctionCreated.exists).to.be.equal(true);
                expect(auctionCreated.claimed).to.be.equal(false);
            });

            it("Comprar un modifier sin suficiente allowance", async() => {
                //Se crean aleatoriamente los valores del modifier
                var type = getRandomInt(5)
                var value = getRandomInt(10) + 1;
                await expect(reverseAuction.connect(relayer).buyModifier(alice.address, type, value)).to.be.revertedWith("Reverse Auction: Not enough allowance");

            });

            it("Comprar un modifier sin suficiente balance", async() => {
                //Se crean aleatoriamente los valores del modifier
                var type = getRandomInt(5)
                var value = getRandomInt(10) + 1;
                await usdc.connect(carl).approve(reverseAuction.address,hundredDolars);
                await expect(reverseAuction.connect(relayer).buyModifier(carl.address, type, value)).to.be.revertedWith("Reverse Auction: Not enough token balance");
            });

            it("Comprar un modifier sin un relayer", async() => {
                var type = getRandomInt(5)
                var value = getRandomInt(10) + 1;
                await usdc.connect(carl).approve(reverseAuction.address,hundredDolars);
                var mensajeError = "AccessControl: account " + carl.address.toLowerCase() + " is missing role " + RECORDER_ROLE;
                await expect(reverseAuction.connect(carl).buyModifier(carl.address, type, value)).to.be.revertedWith(mensajeError);
            });

            it("Comprar un modifier satisfactoriamente", async() => {
                var type = getRandomInt(5)
                var value = getRandomInt(10) + 1;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                expect(await nftModifierContract.tokenType(1)).to.be.equal(type);
                expect(await nftModifierContract.tokenValue(1)).to.be.equal(value);
            });

            it("Usar un modifier sin dar approve para que el contrato queme el modificador", async() => {
                var type = 0;
                var value = getRandomInt(10) + 1;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                await expect(reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1)).to.be.revertedWith("Reverse Auction: The modifier need to be approve to the contract for burn");
                
            });

            it("Usar un modifier en una subasta inexistente", async() => {
                var type = 0;
                var value = getRandomInt(10) + 1;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                await expect(reverseAuction.connect(alice).useModifier(3,aliceModifiers[0],1)).to.be.revertedWith("Reverse Auction: The selected Auction id doesn't exist");
                
            });

            it("Usar un modifier del que no es dueño", async() => {
                var type = 0;
                var value = getRandomInt(10) + 1;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                await expect(reverseAuction.connect(bob).useModifier(1,aliceModifiers[0],1)).to.be.revertedWith("Reverse Auction: The modifier isn't yours");
                
            });

            it("Usar un modifier en un ticket que no es tuyo", async() => {
                var type = 0;
                var value = getRandomInt(10) + 1;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();

                
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                await expect(reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],2)).to.be.revertedWith("Reverse Auction: The ticket isn't yours");
                
            });

            it("Usar un modifier en un ticket que no es esta en la subasta", async() => {
                var type = 0;
                var value = getRandomInt(10) + 1;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();

                
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                await expect(reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],3)).to.be.revertedWith("Reverse Auction: This ticket is not in this auction");
                
            });

            it("Usar un modifier decimal satisfactoriamente", async() => {
                var type = 0;
                var value = getRandomInt(10) + 1;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                var tx = await reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1);
                tx.wait();
                await time.increase(3600);
                var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                await tx.wait();
                var finalNumber = await reverseAuction.connect(alice).ticketToNumber(1);
                expect(finalNumber).to.be.equal(numberSelected*10+value);
            });
            it("Usar un modifier de division satisfactoriamente (Redondeo hacia abajo)", async() => {
                var type = 1;
                var value = 6;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                var tx = await reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1);
                tx.wait();
                await time.increase(3600);
                var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                await tx.wait();
                var finalNumber = await reverseAuction.connect(alice).ticketToNumber(1);
                expect(finalNumber).to.be.equal(Math.round(numberSelected*10/value));
            });

            it("Usar un modifier de division satisfactoriamente (Redondeo hacia arriba)", async() => {
                var type = 1;
                var value = 9;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                var tx = await reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1);
                tx.wait();
                await time.increase(3600);
                var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                await tx.wait();
                var finalNumber = await reverseAuction.connect(alice).ticketToNumber(1);
                expect(finalNumber).to.be.equal(Math.round(numberSelected*10/value));
            });
            it("Usar un modifier de resta satisfactoriamente (valor del modifier menor al numero elegido)", async() => {
                var type = 2;
                var value = 6;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                var tx = await reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1);
                tx.wait();
                await time.increase(3600);
                var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                await tx.wait();
                var finalNumber = await reverseAuction.connect(alice).ticketToNumber(1);
                expect(finalNumber).to.be.equal(value >= numberSelected ? 1 : (numberSelected - value)*10);
            });

            it("Usar un modifier de resta satisfactoriamente (valor del modifier mayor o igual al numero elegido)", async() => {
                var type = 2;
                var value = 9;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                var tx = await reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1);
                tx.wait();
                await time.increase(3600);
                var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                await tx.wait();
                var finalNumber = await reverseAuction.connect(alice).ticketToNumber(1);
                expect(finalNumber).to.be.equal(value >= numberSelected ? 10 : (numberSelected - value)*10);
            });

            it("Usar un modifier de suma satisfactoriamente", async() => {
                var type = 3;
                var value = getRandomInt(9) + 2;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                var tx = await reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1);
                tx.wait();
                await time.increase(3600);
                var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                await tx.wait();
                var finalNumber = await reverseAuction.connect(alice).ticketToNumber(1);
                expect(finalNumber).to.be.equal((numberSelected + value)*10);
            });

            it("Usar un modifier de multiplicacion satisfactoriamente", async() => {
                var type = 4;
                var value = getRandomInt(9) + 2;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                var tx = await reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1);
                tx.wait();
                await time.increase(3600);
                var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                await tx.wait();
                var finalNumber = await reverseAuction.connect(alice).ticketToNumber(1);
                expect(finalNumber).to.be.equal(numberSelected*10 * value);
            });

            it("Usar un modifier fuera de tiempo", async() => {
                var type = 4;
                var value = getRandomInt(9) + 2;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                await time.increase(3600);
                await expect(reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1)).to.be.revertedWith("Reverse Auction: It is out of time to use a modifier");
            });
        });

        describe("Modifier Random", () => {
            var numberSelected;
            beforeEach(async() => {
                // Se publica el contrato antes de cada test
                await deployReverseAuctionSC();
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                
                await setVariables(await time.latest());
                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, MODIFIERS_RANDOM_TYPE_AUCTION);
                await tx.wait();
                
                numberSelected = 8;
                var commit = await reverseAuction.connect(relayer).createCommitment(numberSelected,"pass123"); //Se crea el commitment con una clave
                await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                var tx = await reverseAuction.connect(relayer).participateRandomAuction(commit,1,alice.address);
                await tx.wait();

                await ex(usdc, "mint", [bob.address, cienmilTokens], "USDC Mint");
                var numberSelected2 = 4
                var commit = await reverseAuction.connect(relayer).createCommitment(numberSelected2,"pass123"); //Se crea el commitment con una clave
                await usdc.connect(bob).approve(reverseAuction.address, tenDolars);
                var tx = await reverseAuction.connect(relayer).participateRandomAuction(commit,1, bob.address);
                await tx.wait();
                await time.increase(3600);

            });

            it("Usar un modifier satisfactoriamente", async() => {
                var type = 0;
                var value = getRandomInt(10) + 1;
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                var tx = await reverseAuction.connect(relayer).buyModifier(alice.address, type, value);
                await tx.wait();
                var aliceModifiers = await nftModifierContract.connect(alice).getMyModifiers();
                var tx = await nftModifierContract.connect(alice).approve(reverseAuction.address,aliceModifiers[0]);
                await tx.wait()
                var tx = await reverseAuction.connect(alice).useModifier(1,aliceModifiers[0],1);
                tx.wait();
                await time.increase(3600);
                var tx = await reverseAuction.connect(alice).revealAuction(1,1,numberSelected,"pass123");
                await tx.wait();
                var finalNumber = await reverseAuction.connect(alice).ticketToNumber(1);
                expect(finalNumber).to.be.equal(numberSelected*10+value);
            });

        });

        describe("Admin Functions", () => {
            var numberSelectedAlice;
            var numberSelectedCarl;
            before(async() => {
                // Se publica el contrato antes de cada test
                await deployReverseAuctionSC();
                //Dar usdc a carl para que tambien pueda participar
                await ex(usdc, "mint", [carl.address, cienmilTokens], "USDC Mint");
                await usdc.connect(alice).approve(reverseAuction.address, hundredDolars);
                //Crear Subasta
                await setVariables(await time.latest());
                var tx = await reverseAuction.connect(alice).createAuction(TITLE_AUCTION, DESCRIPTION_AUCTION, PRIZE_AUCTION, ENTRYPRICE_AUCTION, STARTTIME_AUCTION, ENDTIMECOMMIT_AUCTION,
                    ENDTIMEMODIFIERS_AUCTION, ENDTIMEREVEAL_AUCTION, NORMAL_RANDOM_TYPE_AUCTION);
                
                //Numero "aleatorio" seleccionado para la prueba

                numberSelectedAlice = 3;
                var commit = await reverseAuction.connect(relayer).createCommitment(numberSelectedAlice,"pass123"); //Se crea el commitment con una clave
                await usdc.connect(alice).approve(reverseAuction.address, tenDolars);
                var tx = await reverseAuction.connect(relayer).participateRandomAuction(commit,1,alice.address);
                await tx.wait();

                numberSelectedCarl = 2;
            });
            
            it("No administrador intenta usar funciones de administrador", async() => {
                var mensajeError = "AccessControl: account " + alice.address.toLowerCase() + " is missing role " + "0x0000000000000000000000000000000000000000000000000000000000000000";
                await expect(reverseAuction.connect(alice).setFeePercent(80)).to.be.revertedWith(mensajeError);
                await expect(reverseAuction.connect(alice).setUSDCCoin(alice.address)).to.be.revertedWith(mensajeError);
                await expect(reverseAuction.connect(alice).setTicketNFT(alice.address)).to.be.revertedWith(mensajeError);
                await expect(reverseAuction.connect(alice).setModifierNFT(alice.address)).to.be.revertedWith(mensajeError);
                await expect(reverseAuction.connect(alice).claimFees()).to.be.revertedWith(mensajeError);

            });

            it("Administrador modifica la comision por participacion", async() => {
                await expect(reverseAuction.connect(gnosis).setFeePercent(120)).to.be.revertedWith("Reverse Auction: Percent out of range 0-100");
            });


            it("Administrador modifica la comision por participacion", async() => {
                
                var tx = await reverseAuction.connect(gnosis).setFeePercent(20);
                await tx.wait();

                var commit = await reverseAuction.connect(relayer).createCommitment(numberSelectedCarl,"pass123"); //Se crea el commitment con una clave
                await usdc.connect(carl).approve(reverseAuction.address, tenDolars);
                var tx = await reverseAuction.connect(relayer).participateRandomAuction(commit,1,carl.address);
                await tx.wait();

                var tx = await reverseAuction.connect(gnosis).claimFees();
                await tx.wait();

                var totalFee = ENTRYPRICE_AUCTION * 10/100 + ENTRYPRICE_AUCTION * 20/100;

                await expect(tx)
                    .to.changeTokenBalance(usdc, gnosis.address, totalFee);
                await tx.wait();

            });
        }); 
    });
    describe("Sobre el contrato", function () {

        before(async() => {
            // Se publica el contrato antes de cada test
            await deployReverseAuctionSC();
        });

        it('Intentar inicializarlo nuevamente', async() => {
            await expect(reverseAuction.initialize()).to.be.revertedWith("Initializable: contract is already initialized");
        });

        it('Actualizacion insatisfactoria', async () => {

            await ex(reverseAuction, "revokeRole", [UPGRADER_ROLE, owner.address], "GR");
    
            const ReverseAuctionUpgrade = await ethers.getContractFactory("ReverseAuction");

            var mensajeError = 'AccessControl: account '+owner.address.toLowerCase()+' is missing role '+ UPGRADER_ROLE.toString();
            
            await expect(upgrades.upgradeProxy(reverseAuction.address, ReverseAuctionUpgrade)).to.be.revertedWith(mensajeError);

        });

        it('Actualizacion satisfactoria', async () => {
    
            var ReverseAuctionUpgrade = await ethers.getContractFactory("ReverseAuction");

            ReverseAuctionUpgrade = ReverseAuctionUpgrade.connect(gnosis)
            
            const reverseAuctionV2 = await upgrades.upgradeProxy(reverseAuction.address, ReverseAuctionUpgrade);
            
            await reverseAuctionV2.deployTransaction.wait();

        });
    });
});