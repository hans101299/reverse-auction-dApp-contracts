// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface INFTTicket is IERC721Upgradeable {
    function safeMint(address to, uint256 tokenId) external;
}

interface INFTModifier is IERC721Upgradeable {
    function safeMint(address to, uint256 tokenId, uint256 typeMod, uint256 value) external;
    function tokenType(uint256 _tokenId) external view returns(uint256);
    function tokenValue(uint256 _tokenId) external view returns(uint256);
    function burn(uint256 _tokenId) external virtual;
}


/// @title A dApp to play with reverse auctions
/// @author Hans Mallma
/// @notice This contract implements a Reverse Auction mechanism where participants can bid for a prize in a descending price format, the lowest non-repeated number wins.
/// @dev A contract for reverse auctions with NFT tickets and modifiers.
contract ReverseAuction is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    struct AuctionMetadata{
        uint256 id;
        address auctioneer;
        string title;
        string description;
        uint256 prize;
        uint256 entryPrice;
        uint256 startTime;
        uint256 endTimeCommit;
        uint256 endTimeModifiers;
        uint256 endTimeReveal;
        bytes32 typeA;
        uint256 totalBidders;
        uint256 lowestBid;
        bool exists;
        address winner;
        bool claimed;
    }

    struct Auction{
        uint256 id;
        address auctioneer;
        string title;
        string description;
        uint256 prize;
        uint256 entryPrice;
        uint256 startTime;
        uint256 endTimeCommit;
        uint256 endTimeModifiers;
        uint256 endTimeReveal;
        bytes32 typeA;
        uint256 totalBidders;
        uint256 lowestBid;
        bool exists;
        bool isNew;
        mapping(uint256 => bytes32) commitments;
        mapping(address => uint256[]) ticketsByAddress;
        mapping(uint256 => uint256) usedCountNumber;
        mapping(uint256 => uint256) lastNumberTicketWinner;
        mapping(uint256 => bool) ticketInAuction;
        address winner;
        bool checkedWinner;
        bool claimed;
        uint256 profits;
    }
    
    /// @custom:constants Represent the type of a normal random auction.
    bytes32 public constant NORMAL_RANDOM_TYPE = keccak256("NORMAL_RANDOM");
    /// @custom:constants Represent the type of a normal select auction.
    bytes32 public constant NORMAL_SELECT_TYPE = keccak256("NORMAL_SELECT");
    /// @custom:constants Represent the type of a random auction with modifiers.
    bytes32 public constant MODIFIERS_RANDOM_TYPE = keccak256("WITH_MODIFIERS_RANDOM");
    /// @custom:constants Represent the type of a select auction with modifiers.
    bytes32 public constant MODIFIERS_SELECT_TYPE = keccak256("WITH_MODIFIERS_SELECT");

    /// @custom:constants Represent the recorder role that can buy random number and random modifiers for users.
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    /// @custom:constants Represent the upgrader role that can upgrade the contract.
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @custom:constants Represent the type of a modifier that add a digit to the value.
    uint256 public constant ADD_DIGIT_MODIFIER = 0;
    /// @custom:constants Represent the type of a modifier that divide the value.
    uint256 public constant DIVIDE_MODIFIER = 1;
    /// @custom:constants Represent the type of a modifier that subtract the value.
    uint256 public constant SUBTRACT_MODIFIER = 2;
    /// @custom:constants Represent the type of a modifier that increment the value.
    uint256 public constant ADD_MODIFIER = 3;
    /// @custom:constants Represent the type of a modifier that multiply the value.
    uint256 public constant MULTIPLY_MODIFIER = 4;

    IERC20 usdcCoin;
    INFTTicket ticketNFT;
    INFTModifier modifierNFT;

    mapping(uint256 => Auction) auctions;
    mapping(address => uint256[]) inProgressAuctionsByAdrress;
    mapping(address => uint256[]) pastAuctionsByAdrress;
    mapping(address => mapping(uint256 => uint256)) inProgressAuctionsByAdrressIndex;
    mapping(uint256 => uint256[]) modifiersUsedInTicket;

    ///@return The commit for a ticket.
    mapping(uint256 => uint256) public ticketToNumber;
    
    uint256[] public newAuctions;
    mapping(uint256 => uint256) newAuctionsIndex;

    /// @return The total number of auctions.
    uint256 public totalAuctions;
    ///@return The total number of tickets.
    uint256 public totalTickets;
    ///@return The total number of modifiers.
    uint256 public totalModifiers;
    ///@return The cost of a modifier.
    uint public modifierCost;

    uint256 feePercent;
    uint256 private totalFees;

    /// @dev Event emitted when an auction is created.
    event CreateAuction(address auctioneer, uint256 auctionId);
    /// @dev Event emitted when a bidder participate in an auction.
    event Commit(address bidder, uint256 auctionId, uint256 ticketId);
    /// @dev Event emitted when a user buy a modifier.
    event BuyModifier(address owner, uint256 modifierId, uint256 typeMod, uint256 value);
    /// @dev Event emitted when a user reveal his bid.
    event Reveal(address bidder, uint256 auctionId, uint256 number);
    /// @dev Event emitted when a user claim the prize.
    event ClaimPrize(address winner, uint256 auctionId, uint256 number);


    modifier auctionExists(uint256 _auctionId){
        Auction storage auction = auctions[_auctionId];
        require(auction.exists, "Reverse Auction: The selected Auction id doesn't exist");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the ReverseAuction contract.
     */
    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        modifierCost = 1 * 10 ** 6;
        feePercent = 10;
    }


    /**
     * @notice Creates a commitment for a given number and password.
     * @param _number The number to be committed.
     * @param _password The password associated with the commitment.
     * @return The commitment hash generated using the number and password.
    */
    function createCommitment(uint256 _number, string memory _password) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_number, _password));
        
    }

    /**
     * @dev Sets the fee percentage for the auction, when a bidder bid in auction this percent of the entry price go to fees.
     * @param _percent The fee percentage to be set.
     */
    function setFeePercent(uint _percent) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_percent <= 100, "Reverse Auction: Percent out of range 0-100");
        feePercent = _percent;
    }

    /**
     * @dev Sets the USDC Coin contract address.
     * @param _usdcAddress The address of the USDC Coin contract.
     */
    function setUSDCCoin(address _usdcAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        usdcCoin = IERC20(_usdcAddress);
    }

    /**
     * @dev Sets the NFT Ticket contract address.
     * @param _nftAddress The address of the NFT Ticket contract.
     */
    function setTicketNFT(address _nftAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        ticketNFT = INFTTicket(_nftAddress);
    }

    /**
     * @dev Sets the NFT Modifier contract address.
     * @param _nftAddress The address of the NFT Modifier contract.
     */
    function setModifierNFT(address _nftAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        modifierNFT = INFTModifier(_nftAddress);
    }

    /**
     * @dev Creates a new auction.
     * @notice Creates a new auction.
     * @param _title The title of the auction.
     * @param _description The description of the auction.
     * @param _prize The prize amount for the auction.
     * @param _entryPrice The entry price for participating in the auction.
     * @param _startTime The start time of the auction.
     * @param _endTimeCommit The end time for committing to the auction.
     * @param _endTimeModifiers The end time for using modifiers in the auction.
     * @param _endTimeReveal The end time for revealing the auction.
     * @param _typeAuction The type of auction.
     */
    function createAuction(
        string memory _title, 
        string memory _description, 
        uint256 _prize, 
        uint256 _entryPrice,
        uint256 _startTime,
        uint256 _endTimeCommit, 
        uint256 _endTimeModifiers,
        uint256 _endTimeReveal,
        bytes32 _typeAuction
    ) public {
        require(usdcCoin.allowance(msg.sender, address(this)) >= _prize, "Reverse Auction: Not enough allowance");
        require(usdcCoin.balanceOf(msg.sender) >= _prize, "Reverse Auction: Not enough token balance");
        require(_typeAuction == NORMAL_RANDOM_TYPE || _typeAuction == NORMAL_SELECT_TYPE || _typeAuction == MODIFIERS_RANDOM_TYPE || _typeAuction == MODIFIERS_SELECT_TYPE,
        "Reverse Auction: Not allowed type of auction");
        usdcCoin.transferFrom(msg.sender, address(this), _prize);
        totalAuctions++;
        Auction storage auction = auctions[totalAuctions];
        auction.id = totalAuctions;
        auction.auctioneer = msg.sender;
        auction.title = _title;
        auction.description = _description;
        auction.prize = _prize;
        auction.entryPrice = _entryPrice;
        auction.startTime = _startTime;
        auction.endTimeCommit = _endTimeCommit;
        if(_typeAuction == NORMAL_RANDOM_TYPE || _typeAuction == NORMAL_SELECT_TYPE){
            auction.endTimeModifiers = _endTimeCommit;
        }
        else{
            auction.endTimeModifiers = _endTimeModifiers;
        }
        auction.endTimeReveal = _endTimeReveal;
        auction.typeA = _typeAuction;
        auction.exists = true;
        auction.isNew = true;
        auction.lowestBid = type(uint256).max;

        newAuctionsIndex[auction.id] = newAuctions.length;
        newAuctions.push(auction.id);

        emit CreateAuction(msg.sender, totalAuctions);
        
    }

    /**
     * @dev Allows a participant to participate in a select auction by committing a bid.
     * @notice Allows you to participate in a selection auction, where you can create your own commit with your number and password. 
     * @param _commit The commitment hash for the bid.
     * @param _auctionId The ID of the auction.
     */
    function participateSelectAuction(bytes32 _commit, uint256 _auctionId) public auctionExists(_auctionId) {
        //Este metodo solo puede ser utilizado en subastas del tipo select
        Auction storage auction = auctions[_auctionId];
        require(auction.typeA == NORMAL_SELECT_TYPE || auction.typeA == MODIFIERS_SELECT_TYPE, "Reverse Auction: This auction is of a random type, so you cannot commit, the relayer must do it");
        require(block.timestamp < auction.endTimeCommit && block.timestamp >= auction.startTime, "Reverse Auction: It is out of time to make a commit");
        require(usdcCoin.allowance(msg.sender, address(this)) >= auction.entryPrice, "Reverse Auction: Not enough allowance");
        require(usdcCoin.balanceOf(msg.sender) >= auction.entryPrice, "Reverse Auction: Not enough token balance");

        usdcCoin.transferFrom(msg.sender, address(this), auction.entryPrice);
        totalFees += auction.entryPrice * feePercent / 100;
        auction.profits += auction.entryPrice - (auction.entryPrice * feePercent / 100);
        
        //Crear NFT id
        totalTickets++;
        
        ticketNFT.safeMint(msg.sender, totalTickets);
        
        auction.commitments[totalTickets] = _commit;
        auction.ticketsByAddress[msg.sender].push(totalTickets);
        auction.ticketInAuction[totalTickets] = true;

        inProgressAuctionsByAdrressIndex[msg.sender][_auctionId] = inProgressAuctionsByAdrress[msg.sender].length;
        inProgressAuctionsByAdrress[msg.sender].push(_auctionId);

        emit Commit(msg.sender, _auctionId, totalTickets);

    }

    /**
     * @dev Allows a participant to participate in a random auction by committing a bid, it needs a recorder as oracle to create a real random number.
     * @param _commit The commitment hash for the bid.
     * @param _auctionId The ID of the auction.
     * @param _participant The address of the participant.
     */
    function participateRandomAuction(bytes32 _commit, uint256 _auctionId, address _participant) public auctionExists(_auctionId) onlyRole(RECORDER_ROLE){
        //Este metodo solo puede ser utilizado en subastas del tipo select
        Auction storage auction = auctions[_auctionId];
        require(auction.typeA == NORMAL_RANDOM_TYPE || auction.typeA == MODIFIERS_RANDOM_TYPE, "Reverse Auction: This auction is of a normal type, so you cannot commit, the participant must do it");
        require(block.timestamp < auction.endTimeCommit && block.timestamp >= auction.startTime, "Reverse Auction: It is out of time to make a commit");
        require(usdcCoin.allowance(_participant, address(this)) >= auction.entryPrice, "Reverse Auction: Not enough allowance");
        require(usdcCoin.balanceOf(_participant) >= auction.entryPrice, "Reverse Auction: Not enough token balance");

        usdcCoin.transferFrom(_participant, address(this), auction.entryPrice);
        totalFees += auction.entryPrice * feePercent / 100;
        auction.profits += auction.entryPrice - (auction.entryPrice * feePercent / 100);

        //Crear NFT id
        totalTickets++;
        
        ticketNFT.safeMint(_participant, totalTickets);

        auction.commitments[totalTickets] = _commit;
        auction.ticketsByAddress[_participant].push(totalTickets);
        auction.ticketInAuction[totalTickets] = true;

        inProgressAuctionsByAdrressIndex[_participant][_auctionId] = inProgressAuctionsByAdrress[_participant].length;
        inProgressAuctionsByAdrress[_participant].push(_auctionId);

        emit Commit(_participant, _auctionId, totalTickets);

    }

    /**
     * @dev Reveals the bid for a given ticket in an auction.
     * @param _auctionId The ID of the auction.
     * @param _tokenId The ID of the ticket.
     * @param _number The number to reveal.
     * @param _password The password used to reveal.
     */
    function revealAuction(uint256 _auctionId, uint256 _tokenId ,uint256 _number, string memory _password) public auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.endTimeModifiers && block.timestamp <= auction.endTimeReveal, "Reverse Auction: It is out of time to reveal");
        require(ticketNFT.ownerOf(_tokenId) == msg.sender, "Reverse Auction: Only the owner of the ticket can reveal the bid");
        bytes32 commitOriginal = auction.commitments[_tokenId];
        bytes32 commitToReveal = keccak256(abi.encodePacked(_number, _password));

        require(commitToReveal == commitOriginal, "Reverse Auction: Number and/or password incorrect for this ticket");

        _number = _number * 10;

        if(auction.typeA == MODIFIERS_RANDOM_TYPE || auction.typeA == MODIFIERS_SELECT_TYPE){
            _number = applyModifiers(_number, _tokenId);
        }

        auction.usedCountNumber[_number]++;
        auction.lastNumberTicketWinner[_number] = _tokenId;
        ticketToNumber[_tokenId] = _number;

        if(auction.isNew){
            auction.isNew = false;
            newAuctionsIndex[newAuctions[newAuctions.length - 1]] = newAuctionsIndex[_auctionId];
            newAuctions[newAuctionsIndex[_auctionId]] = newAuctions[newAuctions.length - 1];
            newAuctions.pop();
        }

        emit Reveal(msg.sender, _auctionId, _number);
    }

    /**
     * @dev Claims the prize for a given ticket in an auction.
     * @notice Claims the prize if your ticket has the lowest number non-repeated.
     * @param _auctionId The ID of the auction.
     * @param _tokenId The ID of the ticket.
     */
    function claimAuctionPrize(uint256 _auctionId, uint256 _tokenId) public auctionExists(_auctionId) {
        require(ticketNFT.ownerOf(_tokenId) == msg.sender, "Reverse Auction: Only the owner of the ticket can claim the prize");
        Auction storage auction = auctions[_auctionId];
        uint256 winnerNumber;
        //If the auction hasn't been checked for a winner it do it.
        if(!auction.checkedWinner){
            winnerNumber = checkWinner(_auctionId);
            auction.lowestBid = winnerNumber;
            if(auction.lastNumberTicketWinner[winnerNumber] != 0 ){
                auction.winner = ticketNFT.ownerOf(auction.lastNumberTicketWinner[winnerNumber]);
            }
            else {
                auction.winner = address(0);
            }
            auction.checkedWinner = true;
        }
        //If the auction hasn't been claimed and the caller is the winner it transfer the prize
        if(!auction.claimed && msg.sender == auction.winner){
            usdcCoin.transfer(msg.sender, auction.prize);
            auction.claimed = true;
            emit ClaimPrize(auction.winner, _auctionId, winnerNumber);
        }

        //If it's not the auctioneer the auction it's eliminated from the list of auctions where a user has participated.
        if(auction.auctioneer != msg.sender){
            inProgressAuctionsByAdrressIndex[msg.sender][inProgressAuctionsByAdrress[msg.sender][inProgressAuctionsByAdrress[msg.sender].length - 1]] = inProgressAuctionsByAdrressIndex[msg.sender][_auctionId];
            inProgressAuctionsByAdrress[msg.sender][inProgressAuctionsByAdrressIndex[msg.sender][_auctionId]] = inProgressAuctionsByAdrress[msg.sender][inProgressAuctionsByAdrress[msg.sender].length - 1];
            inProgressAuctionsByAdrress[msg.sender].pop();
        }
    }

    /**
     * @dev Returns an array of ticket IDs that a participant has in a specific auction.
     * @param _auctionId The ID of the auction.
     * @return An array of ticket IDs.
     */
    function getMyBidsInAuction(uint256 _auctionId) public view returns(uint256[] memory) {
        Auction storage auction = auctions[_auctionId];        
        return auction.ticketsByAddress[msg.sender];
    }

    /**
     * @dev Returns the commitment for a specific ticket in an auction.
     * @param _auctionId The ID of the auction.
     * @param _ticketId The ID of the ticket.
     * @return The commitment hash.
     */
    function getCommitInAuction(uint256 _auctionId, uint256 _ticketId) public view returns(bytes32) {
        Auction storage auction = auctions[_auctionId];
        return auction.commitments[_ticketId];
    }

    /**
     * @dev Checks the winner number for a given auction.
     * @param _auctionId The ID of the auction.
     * @return winnerNumber The winner number.
     */
    function checkWinner(uint256 _auctionId) public view returns(uint256 winnerNumber) {
        Auction storage auction = auctions[_auctionId];
        uint index;
        for(index=0;index<1000;index++){
            if(auction.usedCountNumber[index]==1){
                break;
            }
        }
        return index;
    }

    /**
     * @dev Claims the profits for a given auction, only by the auctioneer.
     * @param _auctionId The ID of the auction.
     */
    function claimAuctionProfits(uint256 _auctionId) public auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp > auction.endTimeCommit, "Reverse Auction: Profits can only be claimed after commits");
        require(msg.sender == auction.auctioneer, "Reverse Auction: You are not the auctioneer");

        inProgressAuctionsByAdrressIndex[msg.sender][inProgressAuctionsByAdrress[msg.sender][inProgressAuctionsByAdrress[msg.sender].length - 1]] = inProgressAuctionsByAdrressIndex[msg.sender][_auctionId];
        inProgressAuctionsByAdrress[msg.sender][inProgressAuctionsByAdrressIndex[msg.sender][_auctionId]] = inProgressAuctionsByAdrress[msg.sender][inProgressAuctionsByAdrress[msg.sender].length - 1];
        inProgressAuctionsByAdrress[msg.sender].pop();

        usdcCoin.transfer(msg.sender, auction.profits);
    }

    /**
     * @dev Transfer the fees to caller who is admin.
     */
    function claimFees() public onlyRole(DEFAULT_ADMIN_ROLE) {
        usdcCoin.transfer(msg.sender, totalFees);
    }

    /**
     * @dev Returns the metadata for a specific auction.
     * @param _idAuction The ID of the auction.
     * @return The auction metadata.
     */
    function getAuction(uint256 _idAuction) public view returns(AuctionMetadata memory){
        AuctionMetadata memory auctMD;
        Auction storage auction = auctions[_idAuction];
        auctMD.auctioneer = auction.auctioneer;
        auctMD.claimed = auction.claimed;
        auctMD.description = auction.description;
        auctMD.endTimeCommit = auction.endTimeCommit;
        auctMD.endTimeModifiers = auction.endTimeModifiers;
        auctMD.endTimeReveal = auction.endTimeReveal;
        auctMD.entryPrice = auction.entryPrice;
        auctMD.exists = auction.exists;
        auctMD.id = auction.id;
        auctMD.lowestBid = auction.lowestBid;
        auctMD.prize = auction.prize;
        auctMD.startTime = auction.startTime;
        auctMD.title = auction.title;
        auctMD.totalBidders = auction.totalBidders;
        auctMD.typeA = auction.typeA;
        auctMD.winner = auction.winner;

        return auctMD;
    }

    /**
     * @dev Returns an array of auction IDs for a specific page.
     * @param page The page number.
     * @param pageSize The size of each page.
     * @return An array of auction IDs and the total number of auctions.
     */
    function getAuctionsPage(uint256 page, uint256 pageSize) external view returns (uint256[] memory, uint256) {
        require(pageSize > 0, "Reverse Auction: Page size must be positive");
        require(page == 0 || page*pageSize <= newAuctions.length, "Reverse Auction: Out of bounds");
        uint256 actualSize = pageSize;
        if ((page+1)*pageSize > newAuctions.length) {
            actualSize = newAuctions.length - page*pageSize;
        }
        uint256[] memory res = new uint256[](actualSize);
        for (uint256 i = 0; i < actualSize; i++) {
            res[i] = newAuctions[page*pageSize+i];
        }
        return (res, newAuctions.length);
    }

    /**
     * @dev Returns an array of auction where user participate IDs for a specific page.
     * @param page The page number.
     * @param pageSize The size of each page.
     * @return An array of auction IDs and the total number of auctions.
     */
    function getMyAuctionsPage(uint256 page, uint256 pageSize) external view returns (uint256[] memory, uint256) {
        require(pageSize > 0, "Reverse Auction: Page size must be positive");
        require(page == 0 || page*pageSize <= inProgressAuctionsByAdrress[msg.sender].length, "Reverse Auction: Out of bounds");
        uint256 actualSize = pageSize;
        if ((page+1)*pageSize > inProgressAuctionsByAdrress[msg.sender].length) {
            actualSize = inProgressAuctionsByAdrress[msg.sender].length - page*pageSize;
        }
        uint256[] memory res = new uint256[](actualSize);
        for (uint256 i = 0; i < actualSize; i++) {
            res[i] = inProgressAuctionsByAdrress[msg.sender][page*pageSize+i];
        }
        return (res, inProgressAuctionsByAdrress[msg.sender].length);
    }

    /**
    * @dev Allows the designated `RECORDER_ROLE` to purchase a modifier NFT for a buyer.
    * @param _buyer The address of the buyer.
    * @param typeMod The type of the modifier.
    * @param value The value associated with the modifier.
    * @dev The `BuyModifier` event is emitted to log the purchase details.
    */
    function buyModifier(address _buyer, uint256 typeMod, uint256 value) public onlyRole(RECORDER_ROLE) {
        require(usdcCoin.allowance(_buyer, address(this)) >= modifierCost, "Reverse Auction: Not enough allowance");
        require(usdcCoin.balanceOf(_buyer) >= modifierCost, "Reverse Auction: Not enough token balance");
        totalModifiers++;
        modifierNFT.safeMint(_buyer, totalModifiers, typeMod, value);
        emit BuyModifier(_buyer, totalModifiers, typeMod, value);
    }

    /**
    * @notice Allows the usage of a modifier NFT in an auction.
    * @param _auctionId The ID of the auction.
    * @param _modifierId The ID of the modifier NFT.
    * @param _ticketId The ID of the ticket associated with the auction.
    * @dev This function can only be called when the auction exists and is within the allowed time range for modifier usage.
    * @dev It verifies that the modifier NFT is approved to be burned by the contract.
    * @dev It checks ownership of the modifier NFT and the associated ticket by the caller.
    * @dev Additionally, it ensures that the ticket is part of the specified auction.
    * @dev The modifier NFT is added to the list of modifiers used in the ticket, and then burned.
    */
    function useModifier(uint256 _auctionId, uint256 _modifierId, uint256 _ticketId) public auctionExists(_auctionId){
        require(modifierNFT.getApproved(_modifierId) == address(this), "Reverse Auction: The modifier need to be approve to the contract for burn");
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp>auction.endTimeCommit && block.timestamp<= auction.endTimeModifiers, "Reverse Auction: It is out of time to use a modifier");
        require(modifierNFT.ownerOf(_modifierId) == msg.sender, "Reverse Auction: The modifier isn't yours");
        require(ticketNFT.ownerOf(_ticketId) == msg.sender, "Reverse Auction: The ticket isn't yours");
        require(auction.ticketInAuction[_ticketId], "Reverse Auction: This ticket is not in this auction");
        uint256[] storage modifiersInTicket = modifiersUsedInTicket[_ticketId];
        modifiersInTicket.push(_modifierId);
        modifierNFT.burn(_modifierId);
    }

    /**
     * @dev Applies the modifiers to the given number.
     * @param _number The number to apply the modifiers to.
     * @param _ticketId The ID of the ticket.
     * @return finalNumber The modified number.
     */
    function applyModifiers(uint256 _number, uint256 _ticketId) private view returns(uint256 finalNumber) {
        uint256[] storage modifiersInTicket = modifiersUsedInTicket[_ticketId];
        uint256 arraySize = modifiersInTicket.length;
        uint256 numerToModify = _number;
        for (uint i=0; i<arraySize; i++) {
            numerToModify = applyModifier(numerToModify, modifierNFT.tokenType(modifiersInTicket[i]), modifierNFT.tokenValue(modifiersInTicket[i]));
        }
        return numerToModify;
    }

    /**
     * @dev Apply a modifier to the given number.
     * @param _typeModifier The type of the modifier.
     * @param _valueModifier The value of the modifier.
     * @return modifiedNumber The modified number.
     */
    function applyModifier(uint256 _number, uint256 _typeModifier, uint256 _valueModifier) private pure returns(uint256 modifiedNumber) {
        //All modifications works with a number that have 1 decimal
        if(_typeModifier == ADD_DIGIT_MODIFIER){
            _number = _number/10;
            return _number*10 + _valueModifier;
        }
        else if(_typeModifier == DIVIDE_MODIFIER){
            //Adds a decimal for after round the number
            _number = _number * 10;
            uint256 result = _number / _valueModifier;
            if(result % 10 >= 5){
                result += 5;
            }
            return result / 10;
        }
        else if(_typeModifier == SUBTRACT_MODIFIER){
            uint256 result;
            //Validate if the modifier is too big for the operation, if its greater than the number returns 1 with 1 decimal (The lowest integer)
            if(_valueModifier*10 >= _number){
                result = 10;
            }
            else{
                result = _number - (_valueModifier * 10);
            }
            return result;
        }
        else if(_typeModifier == ADD_MODIFIER){
            return _number + _valueModifier * 10;
        }
        else{
            return _number * _valueModifier;
        }
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
}