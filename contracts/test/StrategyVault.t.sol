// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/StrategyVault.sol";
import "../src/AgentRegistry.sol";

contract StrategyVaultTest is Test {
    StrategyVault public vault;
    AgentRegistry public registry;
    address public owner = address(1);
    address public agent = address(2);
    address public depositor = address(3);

    function setUp() public {
        vm.prank(owner);
        registry = new AgentRegistry(owner);

        vm.prank(owner);
        vault = new StrategyVault(owner, address(registry), address(0));
    }

    function test_Deposit() public {
        vm.deal(depositor, 10 ether);
        vm.prank(depositor);
        vault.deposit{value: 5 ether}();

        assertEq(vault.deposits(depositor), 5 ether);
        assertEq(vault.totalDeposits(), 5 ether);
    }

    function test_Withdraw() public {
        vm.deal(depositor, 10 ether);
        vm.prank(depositor);
        vault.deposit{value: 5 ether}();

        uint256 preBal = depositor.balance;
        vm.prank(depositor);
        vault.withdraw(2 ether);

        assertEq(vault.deposits(depositor), 3 ether);
        assertEq(vault.totalDeposits(), 3 ether);
        assertEq(depositor.balance, preBal + 2 ether);
    }

    function test_RevertWithdrawInsufficient() public {
        vm.deal(depositor, 10 ether);
        vm.prank(depositor);
        vault.deposit{value: 1 ether}();

        vm.prank(depositor);
        vm.expectRevert(StrategyVault.StrategyVault__InsufficientBalance.selector);
        vault.withdraw(2 ether);
    }

    function test_AllocateToAgent() public {
        // Register agent
        vm.prank(owner);
        uint256 tokenId = registry.registerAgent(agent, "ipfs://agent");

        // Deposit
        vm.deal(depositor, 10 ether);
        vm.prank(depositor);
        vault.deposit{value: 10 ether}();

        // Authorize vault as updater in registry
        vm.prank(owner);
        registry.setAuthorizedUpdater(address(vault), true);

        // Allocate
        vm.prank(owner);
        vault.allocateToAgent(agent, 2 ether);

        assertEq(vault.allocated(agent), 2 ether);
    }

    function test_SettlePnL() public {
        // Setup
        vm.prank(owner);
        registry.registerAgent(agent, "ipfs://agent");

        vm.deal(depositor, 10 ether);
        vm.prank(depositor);
        vault.deposit{value: 10 ether}();

        vm.prank(owner);
        registry.setAuthorizedUpdater(address(vault), true);

        vm.prank(owner);
        vault.allocateToAgent(agent, 2 ether);

        // Settle profit
        vm.prank(owner);
        vault.settleAgentPnL(agent, 500e18);

        assertEq(vault.agentPnL(agent), 500e18);
    }

    function test_ReceiveFallback() public {
        vm.deal(depositor, 5 ether);
        vm.prank(depositor);
        (bool ok,) = address(vault).call{value: 3 ether}("");
        assertTrue(ok);
        assertEq(vault.deposits(depositor), 3 ether);
    }

    function testFuzz_DepositWithdraw(uint96 amount) public {
        vm.assume(amount > 0.001 ether);
        vm.deal(depositor, amount);

        vm.prank(depositor);
        vault.deposit{value: amount}();

        vm.prank(depositor);
        vault.withdraw(amount);

        assertEq(vault.deposits(depositor), 0);
        assertEq(vault.totalDeposits(), 0);
    }
}
