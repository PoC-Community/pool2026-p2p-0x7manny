// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Swap.sol";
import "./mocks/MockPriceFeed.sol";

// Simple ERC-20 for testing
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock", "MCK") {
        _mint(msg.sender, 1_000_000 ether);
    }
}

contract SwapTest is Test {
    Swap public swap;
    MockPriceFeed public mockFeed;
    MockToken public mockToken;

    function setUp() public {
        mockFeed = new MockPriceFeed();
        mockFeed.setPrice(300000000000); // $3000 with 8 decimals

        mockToken = new MockToken();

        swap = new Swap(
            address(mockFeed),
            address(mockToken),
            18,
            1e18,       // token price = $1
            3600        // stale threshold = 1 hour
        );

        mockToken.transfer(address(swap), 100_000 ether);
    }

    function testGetCurrentPrice() public view {
        (uint256 price, bool isStale, ) = swap.getCurrentPrice();

        assertEq(price, 3000e18, "Price should be 3000 USD scaled to 18 decimals");
        assertFalse(isStale, "Price should not be stale");
    }
}