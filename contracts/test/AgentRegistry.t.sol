// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public owner = address(1);
    address public agent = address(2);
    address public user = address(3);
    address public updater = address(4);

    function setUp() public {
        vm.prank(owner);
        registry = new AgentRegistry(owner);
    }

    function test_RegisterAgent() public {
        vm.prank(user);
        uint256 tokenId = registry.registerAgent(agent, "ipfs://test");
        assertEq(tokenId, 1);
        assertEq(registry.ownerOf(1), user);

        AgentRegistry.AgentProfile memory p = registry.getProfile(1);
        assertEq(p.agentAddress, agent);
        assertTrue(p.active);
    }

    function test_RevertDoubleRegistration() public {
        vm.prank(user);
        registry.registerAgent(agent, "ipfs://test");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.AgentRegistry__AlreadyRegistered.selector, agent));
        registry.registerAgent(agent, "ipfs://test2");
    }

    function test_RevertZeroAddress() public {
        vm.prank(user);
        vm.expectRevert(AgentRegistry.AgentRegistry__ZeroAddress.selector);
        registry.registerAgent(address(0), "ipfs://test");
    }

    function test_AuthorizedUpdaterCanRecordTrade() public {
        vm.prank(user);
        uint256 tokenId = registry.registerAgent(agent, "ipfs://test");

        vm.prank(owner);
        registry.setAuthorizedUpdater(updater, true);

        vm.prank(updater);
        registry.recordTrade(tokenId, 100e18, keccak256("trade1"));

        AgentRegistry.AgentProfile memory p = registry.getProfile(tokenId);
        assertEq(p.tradeCount, 1);
        assertEq(p.reputationScore, 100e18);
    }

    function test_RevertUnauthorizedRecordTrade() public {
        vm.prank(user);
        uint256 tokenId = registry.registerAgent(agent, "ipfs://test");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.AgentRegistry__AgentNotRegistered.selector, user));
        registry.recordTrade(tokenId, 100e18, keccak256("trade1"));
    }

    function test_SoulboundTransferReverts() public {
        vm.prank(user);
        uint256 tokenId = registry.registerAgent(agent, "ipfs://test");

        vm.prank(user);
        vm.expectRevert(AgentRegistry.AgentRegistry__TransferNotAllowed.selector);
        registry.transferFrom(user, address(5), tokenId);
    }

    function test_BatchRecordTrade() public {
        vm.prank(user);
        uint256 tokenId = registry.registerAgent(agent, "ipfs://test");

        vm.prank(owner);
        registry.setAuthorizedUpdater(updater, true);

        int256[] memory pnls = new int256[](3);
        pnls[0] = 100e18;
        pnls[1] = -50e18;
        pnls[2] = 25e18;

        vm.prank(updater);
        registry.recordTradeBatch(tokenId, pnls);

        AgentRegistry.AgentProfile memory p = registry.getProfile(tokenId);
        assertEq(p.tradeCount, 3);
        assertEq(p.reputationScore, 75e18);
    }

    function test_UpdateAgentAddress() public {
        vm.prank(user);
        uint256 tokenId = registry.registerAgent(agent, "ipfs://test");

        address newAgent = address(5);
        vm.prank(user);
        registry.updateAgentAddress(tokenId, newAgent);

        assertEq(registry.agentToTokenId(newAgent), tokenId);
        assertEq(registry.agentToTokenId(agent), 0);
    }

    function test_RevertUpdateToExistingAgent() public {
        vm.prank(user);
        uint256 tokenId = registry.registerAgent(agent, "ipfs://test");

        address otherAgent = address(5);
        vm.prank(user);
        registry.registerAgent(otherAgent, "ipfs://other");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.AgentRegistry__AlreadyRegistered.selector, otherAgent));
        registry.updateAgentAddress(tokenId, otherAgent);
    }

    function test_RevertRecordTradeOnInactiveAgent() public {
        vm.prank(user);
        uint256 tokenId = registry.registerAgent(agent, "ipfs://test");

        vm.prank(owner);
        registry.setAuthorizedUpdater(updater, true);

        vm.prank(user);
        registry.deactivateAgent(tokenId);

        vm.prank(updater);
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.AgentRegistry__AgentNotRegistered.selector, address(0)));
        registry.recordTrade(tokenId, 100e18, keccak256("trade1"));
    }

    function testFuzz_RegisterManyAgents(uint8 count) public {
        vm.assume(count > 0 && count < 50);
        for (uint256 i; i < count; i++) {
            address a = address(uint160(i + 100));
            vm.prank(user);
            uint256 tid = registry.registerAgent(a, "ipfs://test");
            assertEq(tid, i + 1);
        }
    }
}
