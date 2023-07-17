// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title A Coin for participating in reverse auction.
/// @author Hans Mallma.
/// @notice This contract implements a coin to be used in reverse auction.
/// @dev This contract implements an ERC20 token contract for simulate an USDC (USD Coin).
contract USDCoin is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Returns the number of decimals used by the token.
     * @return The number of decimals.
     */
    function decimals() override public view returns (uint8) {
        return 6;
    }

    /**
     * @dev Mints new tokens and assigns them to the specified address.
     * @param to The address to which the new tokens will be minted.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
