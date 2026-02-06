// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Swap.sol";
import "./mocks/MockPriceFeed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockTokenSec is ERC20 {
    constructor() ERC20("Mock", "MCK") {
        _mint(msg.sender, 1_000_000 ether);
    }
}

contract SwapSecurityTest is Test {
    Swap public swap;
    MockPriceFeed public mockFeed;
    MockTokenSec public mockToken;

    function setUp() public {
        mockFeed = new MockPriceFeed();
        mockFeed.setPrice(300000000000);

        mockToken = new MockTokenSec();

        swap = new Swap(
            address(mockFeed),
            address(mockToken),
            18,
            1e18,
            3600
        );

        mockToken.transfer(address(swap), 100_000 ether);
    }

    function testRevertOnStalePrice() public {
        vm.warp(10_000);
        mockFeed.setUpdatedAt(block.timestamp - 2 hours);
        vm.deal(address(this), 1 ether);
        vm.expectRevert();
        swap.swap{value: 1 ether}();
    }

    function testRevertOnZeroPrice() public {
        mockFeed.setPrice(0);
        vm.deal(address(this), 1 ether);
        vm.expectRevert();
        swap.swap{value: 1 ether}();
    }

    function testRevertOnNegativePrice() public {
        mockFeed.setPrice(-100);
        vm.deal(address(this), 1 ether);
        vm.expectRevert();
        swap.swap{value: 1 ether}();
    }

    function testPauseBlocksSwap() public {
        swap.pause();
        vm.deal(address(this), 1 ether);
        vm.expectRevert();
        swap.swap{value: 1 ether}();
    }

    function testUnpauseAllowsSwap() public {
        swap.pause();
        swap.unpause();
        vm.deal(address(this), 1 ether);
        uint256 tokensOut = swap.swap{value: 1 ether}();
        assertGt(tokensOut, 0);
    }

    function testOnlyOwnerCanPause() public {
        vm.prank(address(0x999));
        vm.expectRevert();
        swap.pause();
    }
}
