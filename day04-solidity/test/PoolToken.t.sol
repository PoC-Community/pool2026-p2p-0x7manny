// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PoolToken.sol";

contract PoolTokenVotesTest is Test {
    PoolToken token;

    address owner = address(this);
    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;

    function setUp() public {
        token = new PoolToken(INITIAL_SUPPLY);

        token.transfer(alice, 100 ether);
        token.transfer(bob, 50 ether);
    }

    function testInitialVotingPowerIsZero() public view {
        assertEq(token.getVotes(alice), 0);
        assertEq(token.getVotes(bob), 0);
    }

    function testDelegateToSelf() public {
        vm.prank(alice);
        token.delegate(alice);

        assertEq(token.getVotes(alice), 100 ether);
    }

    function testDelegateToOther() public {
        vm.prank(alice);
        token.delegate(bob);

        assertEq(token.getVotes(alice), 0);
        assertEq(token.getVotes(bob), 100 ether);
    }

    function testGetPastVotes() public {
        vm.prank(alice);
        token.delegate(alice);

        uint256 snapshotBlock = block.number;

        vm.roll(block.number + 1);

        assertEq(
            token.getPastVotes(alice, snapshotBlock),
            100 ether
        );
    }
}
