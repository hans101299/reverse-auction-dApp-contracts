// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title A Modifier NFT to be used in reverse auctions.
/// @author Hans Mallma.
/// @notice This contract implements a NFT that can be used to change the number in an auction.
/// @dev This contract implements an ERC721 token contract with modifier functionality.
contract ModifierReverseAuction is Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, ERC721BurnableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

    uint256 private nonce;

    struct ModifierInformation {
        uint256 typeMod;
        uint256 value;
    }

    mapping (uint256 => ModifierInformation) public informationOf;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract.
     */
    function initialize() initializer public {
        __ERC721_init("ModifierReverseAuction", "MODRA");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /// @return The base URI string.
    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }

    /**
     * @dev Safely mints a new modifier token.
     * @param to The address to which the token will be minted.
     * @param tokenId The token ID of the new modifier.
     * @param typeMod The type of the modifier.
     * @param value The value of the modifier.
     */
    function safeMint(address to, uint256 tokenId, uint256 typeMod, uint256 value)
        public
        onlyRole(MINTER_ROLE)
    {
        _safeMint(to, tokenId);
        informationOf[tokenId] = ModifierInformation(typeMod, value);
    }

    /**
     * @dev Sets the token URI for a given token.
     * @param tokenId The token ID for which to set the URI.
     * @param uri The URI string to set for the token.
     */
    function setTokenURI(uint256 tokenId, string memory uri) public onlyRole(URI_SETTER_ROLE) {
        _setTokenURI(tokenId, uri);
    }

    /**
     * @dev Retrieves the type of a given modifier token.
     * @param _tokenId The token ID of the modifier.
     * @return The type of the modifier.
     */
    function tokenType(uint256 _tokenId) public view returns(uint256) {
        return informationOf[_tokenId].typeMod;
    }

    /**
     * @dev Retrieves the value of a given modifier token.
     * @param _tokenId The token ID of the modifier.
     * @return The value of the modifier.
     */
    function tokenValue(uint256 _tokenId) public view returns(uint256) {
        return informationOf[_tokenId].value;
    }

    /**
     * @dev Retrieves the list of modifiers owned by the caller.
     * @return An array of modifier token IDs.
     */
    function getMyModifiers() public view returns(uint[] memory){
        uint256 numberModifiers = balanceOf(msg.sender);
        uint256[] memory modifiers = new uint256[](numberModifiers);
        for(uint256 i = 0; i < numberModifiers; i++){
            modifiers[i] = tokenOfOwnerByIndex(msg.sender, i);
        }
        return modifiers;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
