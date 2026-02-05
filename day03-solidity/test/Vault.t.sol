// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import "forge-std/console2.sol";
import {Vault} from "../src/Vault.sol";
import "solady/tokens/ERC20.sol";


contract MockUSDC is ERC20 {
    constructor() {
        _mint(msg.sender, 1_000_000e6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function name() public pure override returns (string memory) {
        return "USD Coin";
    }

    function symbol() public pure override returns (string memory) {
        return "USDC";
    }
}


contract VaultTestHelper is Vault {
    constructor(ERC20 asset) Vault(asset) {}

    function convertToSharesExt(uint assets) external view returns (uint) {
        return _convertToShares(assets);
    }

    function convertToAssetsExt(uint shares) external view returns (uint) {
        return _convertToAssets(shares);
    }

    function getAssetBalanceExt() external view returns (uint) {
        return getAssetBalance();
    }
}

contract VaultTest is Test {
    Vault vault;
    VaultTestHelper helper;
    MockUSDC usdc;

    address alice = makeAddr("Alice");
    address owner;

    function setUp() public {
        owner = address(this);

        usdc = new MockUSDC();
        vault = new Vault(usdc);
        helper = new VaultTestHelper(usdc);

        // Give Alice USDC
        usdc.transfer(alice, 10_000e6);
    }

    function test_convert_roundtrip() public {
        uint assets = 2345e6;

        uint shares = helper.convertToSharesExt(assets);
        uint assetsBack = helper.convertToAssetsExt(shares);

        assertLe(assetsBack, assets);
    }

    function test_asset_metadata() public {
        assertEq(vault.getAssetName(), "USD Coin");
        assertEq(usdc.decimals(), 6);
    }

    function test_deposit_reward_withdraw() public {
        uint depositAmount = 1_000e6;
        uint rewardAmount = 100e6;

        // Alice deposits
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount);
        vm.stopPrank();

        (uint assetsAlice, uint sharesAlice) = vault.assetOf(alice);
        assertEq(assetsAlice, depositAmount);
        assertGt(sharesAlice, 0);

        // Owner adds reward
        usdc.approve(address(vault), rewardAmount);
        vault.addReward(rewardAmount);

        (assetsAlice,) = vault.assetOf(alice);
        assertEq(assetsAlice, depositAmount + rewardAmount);

        // Alice withdraws
        vm.prank(alice);
        vault.withdraw(sharesAlice);

        (assetsAlice, sharesAlice) = vault.assetOf(alice);
        assertEq(assetsAlice, 0);
        assertEq(sharesAlice, 0);
    }
}
