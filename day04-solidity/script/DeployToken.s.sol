pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PoolToken.sol";

contract DeployToken is Script {
    function run() external {
        uint256 key = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(key);

        PoolToken token = new PoolToken(1_000_000 ether);

        vm.stopBroadcast();

        console2.log("Token:", address(token));
    }
}
