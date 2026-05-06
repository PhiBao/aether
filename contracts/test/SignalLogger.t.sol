// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SignalLogger.sol";

contract SignalLoggerTest is Test {
    SignalLogger public logger;
    address public owner = address(1);
    address public loggerAddr = address(2);
    address public agent = address(3);

    function setUp() public {
        vm.prank(owner);
        logger = new SignalLogger(owner);
        vm.prank(owner);
        logger.setAuthorizedLogger(loggerAddr, true);
    }

    function test_LogSignal() public {
        vm.prank(loggerAddr);
        uint256 id = logger.logSignal(agent, "BTCUSDT", 1, 8500, 6500, keccak256("strat"));
        assertEq(id, 1);
        assertEq(logger.signalCount(), 1);

        SignalLogger.Signal memory s = logger.getSignal(1);
        assertEq(s.agent, agent);
        assertEq(s.symbol, "BTCUSDT");
        assertEq(s.direction, 1);
        assertEq(s.confidenceBps, 8500);
    }

    function test_LogExecution() public {
        vm.prank(loggerAddr);
        logger.logSignal(agent, "BTCUSDT", 1, 8500, 6500, keccak256("strat"));

        vm.prank(loggerAddr);
        logger.logExecution(1, keccak256("tx"), true, 1e18, 65000e18, 10);

        SignalLogger.Execution memory e = logger.getExecution(1);
        assertTrue(e.executed);
        assertEq(e.size, 1e18);
    }

    function test_RevertInvalidConfidence() public {
        vm.prank(loggerAddr);
        vm.expectRevert(SignalLogger.SignalLogger__InvalidSignal.selector);
        logger.logSignal(agent, "BTCUSDT", 1, 10001, 6500, keccak256("strat"));
    }

    function test_RevertInvalidDirection() public {
        vm.prank(loggerAddr);
        vm.expectRevert(SignalLogger.SignalLogger__InvalidSignal.selector);
        logger.logSignal(agent, "BTCUSDT", 2, 5000, 6500, keccak256("strat"));
    }

    function test_BatchLog() public {
        address[] memory agents = new address[](2);
        agents[0] = agent;
        agents[1] = address(4);

        string[] memory symbols = new string[](2);
        symbols[0] = "BTCUSDT";
        symbols[1] = "ETHUSDT";

        int8[] memory dirs = new int8[](2);
        dirs[0] = 1;
        dirs[1] = -1;

        uint16[] memory confs = new uint16[](2);
        confs[0] = 8000;
        confs[1] = 7200;

        int256[] memory vibes = new int256[](2);
        vibes[0] = 5000;
        vibes[1] = -3000;

        bytes32[] memory hashes = new bytes32[](2);
        hashes[0] = keccak256("s1");
        hashes[1] = keccak256("s2");

        vm.prank(loggerAddr);
        logger.logSignalBatch(agents, symbols, dirs, confs, vibes, hashes);

        assertEq(logger.signalCount(), 2);
        assertEq(logger.symbolSignalCount("BTCUSDT"), 1);
        assertEq(logger.symbolSignalCount("ETHUSDT"), 1);
    }

    function test_Pause() public {
        vm.prank(owner);
        logger.setPaused(true);

        vm.prank(loggerAddr);
        vm.expectRevert(SignalLogger.SignalLogger__Paused.selector);
        logger.logSignal(agent, "BTCUSDT", 1, 5000, 0, keccak256("s"));
    }

    function test_GetSignalsInRange() public {
        for (uint256 i; i < 5; i++) {
            vm.prank(loggerAddr);
            logger.logSignal(agent, "BTCUSDT", 1, 5000, 0, keccak256(abi.encodePacked(i)));
        }

        SignalLogger.Signal[] memory batch = logger.getSignalsInRange(2, 4);
        assertEq(batch.length, 3);
        assertEq(batch[0].id, 2);
        assertEq(batch[2].id, 4);
    }
}
