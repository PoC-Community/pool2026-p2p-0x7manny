// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Vault.sol";
import "solady/tokens/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() {
        _mint(msg.sender, 1_000_000 ether);
    }

    function name() public pure override returns (string memory) {
        return "MockToken";
    }

    function symbol() public pure override returns (string memory) {
        return "MOCK";
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}

contract VaultGovernanceTest is Test {
    Vault vault;
    MockERC20 token;

    address owner = address(0xBEEF);
    address alice = address(0xA11CE);

    function setUp() public {
        token = new MockERC20();
        vm.prank(owner);
        vault = new Vault(token);
        token.transfer(alice, 1000 ether);
        vm.prank(alice);
        token.approve(address(vault), type(uint256).max);
    }

    function testSetWithdrawalFee() public {
        vm.prank(owner);
        vault.setGovernor(address(this));
        vault.setWithdrawalFee(250);
        assertEq(vault.withdrawalFeeBps(), 250);
    }

    function testNonGovernorCannotSetFee() public {
        vm.expectRevert(Vault.OnlyGovernor.selector);
        vm.prank(alice);
        vault.setWithdrawalFee(100);
    }

    function testFeeCannotExceedMax() public {
        vm.prank(owner);
        vault.setGovernor(address(this));
        vm.expectRevert(Vault.FeeTooHigh.selector);
        vault.setWithdrawalFee(1500);
    }

    function testWithdrawalWithFee() public {
        vm.prank(owner);
        vault.setGovernor(address(this));
        vault.setWithdrawalFee(250);
        vm.prank(alice);
        vault.deposit(1000 ether);
        vm.prank(alice);
        uint256 received = vault.withdrawAll();
        assertEq(received, 975 ether);
    }
}
