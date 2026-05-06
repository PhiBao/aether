// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/SignalLogger.sol";
import "../src/StrategyVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        AgentRegistry registry = new AgentRegistry(deployer);
        SignalLogger logger = new SignalLogger(deployer);
        StrategyVault vault = new StrategyVault(deployer, address(registry), address(0));

        // Authorize vault and logger to interact
        registry.setAuthorizedUpdater(address(vault), true);
        registry.setAuthorizedUpdater(address(logger), true);
        logger.setAuthorizedLogger(address(vault), true);

        vm.stopBroadcast();

        console.log("AgentRegistry deployed at:", address(registry));
        console.log("SignalLogger deployed at:", address(logger));
        console.log("StrategyVault deployed at:", address(vault));
    }
}
