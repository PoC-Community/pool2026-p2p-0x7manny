// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import "../src/Vault.sol";
import "../src/VaultGovernor.sol";
import { PoolToken as OZPoolToken } from "../src/PoolToken.sol";

contract DeployGovernance is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        vm.startBroadcast(privateKey);

        OZPoolToken token = new OZPoolToken(1_000_000 ether);

        Vault vault = new Vault(ERC20(address(token)));

        VaultGovernor governor = new VaultGovernor(
            IVotes(address(token)),
            1,
            50,
            4
        );

        vault.setGovernor(address(governor));
        token.delegate(deployer);

        vm.stopBroadcast();

        console.log("Token:", address(token));
        console.log("Vault:", address(vault));
        console.log("Governor:", address(governor));
        console.log("Deployer:", deployer);
    }
}
