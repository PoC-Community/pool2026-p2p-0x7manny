// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Vault.sol";
import "../src/VaultGovernor.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        address TOKEN = 0x614073092E9B48c41C97D27F8B1F9c43919fd2eC;

        Vault vault = new Vault(ERC20(TOKEN));

        VaultGovernor governor = new VaultGovernor(
            IVotes(TOKEN),
            1,
            45818,
            25
        );


        vault.setGovernor(address(governor));

        vm.stopBroadcast();

        console2.log("Vault:", address(vault));
        console2.log("Governor:", address(governor));
        console2.log("Token:", TOKEN);
    }
}
