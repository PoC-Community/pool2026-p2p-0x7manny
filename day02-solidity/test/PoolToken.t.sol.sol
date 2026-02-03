// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PoolToken.sol";

contract PoolTokenTest is Test {
    PoolToken token;

    address owner = address(this);
    address user = address(0x1);

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;

    function setUp() public {
        token = new PoolToken(INITIAL_SUPPLY);
    }

    function testInitialSupply() public view {
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
    }

    function testOnlyOwnerCanMint() public {
        vm.prank(user);
        vm.expectRevert();
        token.mint(user, 1000 ether);
    }
}
