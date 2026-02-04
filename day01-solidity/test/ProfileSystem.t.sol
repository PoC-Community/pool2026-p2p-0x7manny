// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProfileSystem.sol";

contract ProfileSystemTest is Test {

    ProfileSystem profileSystem;

    address user = address(0x1);
    address otherUser = address(0x2);

    function setUp() public {
        profileSystem = new ProfileSystem();
    }

    function testCreateProfile() public {
        vm.prank(user);
        profileSystem.createProfile("manny");

        (
            string memory username,
            uint256 level,
            ProfileSystem.Role role,
            uint256 lastUpdated
        ) = profileSystem.profiles(user);

        assertEq(username, "manny");
        assertEq(level, 1);
        assertEq(uint(role), uint(ProfileSystem.Role.USER));
        assertGt(lastUpdated, 0);
    }

    function testCannotCreateEmptyProfile() public {
        vm.prank(user);
        vm.expectRevert(ProfileSystem.EmptyUsername.selector);

        profileSystem.createProfile("");
    }

    function testCannotCreateDuplicateProfile() public {
        vm.prank(user);
        profileSystem.createProfile("manny");

        vm.prank(user);
        vm.expectRevert(ProfileSystem.UserAlreadyExists.selector);

        profileSystem.createProfile("manny");
    }

    function testLevelUp() public {
        vm.prank(user);
        profileSystem.createProfile("manny");

        vm.prank(user);
        profileSystem.levelUp();

        (, uint256 level,,) = profileSystem.profiles(user);
        assertEq(level, 2);
    }

    function testCannotLevelUpIfNotRegistered() public {
        vm.prank(otherUser);
        vm.expectRevert(ProfileSystem.UserNotRegistered.selector);

        profileSystem.levelUp();
    }
}
