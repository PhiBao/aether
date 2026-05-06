// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentRegistry.sol";

/**
 * @title StrategyVault
 * @notice Lightweight vault for agent strategy collateral and fee distribution
 * @dev Holds user deposits that agents trade against. Integrates with
 *      AgentRegistry for reputation-weighted position sizing limits.
 * @dev SECURITY AUDIT Feynman: This vault is intentionally minimal. It does NOT auto-trade;
 *       it only holds collateral and releases it based on authorized agent
 *       signals. The actual perp execution happens off-chain via Byreal.
 * @dev SECURITY AUDIT State: deposits[msg.sender] and totalDeposits must always satisfy:
 *       sum(deposits[user]) == totalDeposits. Verify this in every
 *       mutation path.
 */
contract StrategyVault is Ownable, ReentrancyGuard {

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error StrategyVault__ZeroAmount();
    error StrategyVault__InsufficientBalance();
    error StrategyVault__AgentNotRegistered();
    error StrategyVault__AgentNotTrusted();
    error StrategyVault__TransferFailed();
    error StrategyVault__InvalidReputation();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event StrategyAllocated(address indexed agent, uint256 amount);
    event StrategySettled(address indexed agent, int256 pnl);

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    AgentRegistry public immutable registry;
    address public immutable asset; // WETH, USDC, etc. For Mantle native: could be USDC or MNT

    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;

    mapping(address => uint256) public allocated;   // Agent => allocated capital
    mapping(address => int256) public agentPnL;     // Cumulative PnL per agent

    uint256 public constant MIN_REPUTATION_FOR_ALLOCATION = 0; // Can be tuned
    uint256 public maxAllocationRatioBps = 2000; // 20% of vault per agent

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner, address _registry, address _asset) Ownable(_owner) {
        registry = AgentRegistry(_registry);
        asset = _asset;
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deposit collateral into the vault
     * @dev For hackathon demo, native MNT deposits. Production would use ERC20.
     * @dev SECURITY AUDIT Feynman: Using native token means receive() must be present.
     *       Without it, direct transfers brick funds. Verify receive() exists.
     */
    function deposit() external payable nonReentrant {
        if (msg.value == 0) revert StrategyVault__ZeroAmount();

        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw collateral from vault
     * @dev Full withdrawal only for simplicity
     * @dev SECURITY AUDIT State: Must update deposits[user] AND totalDeposits atomically.
     *       ReentrancyGuard prevents reentrancy but verify ordering.
     */
    function withdraw(uint256 _amount) external nonReentrant {
        if (_amount == 0) revert StrategyVault__ZeroAmount();
        if (deposits[msg.sender] < _amount) revert StrategyVault__InsufficientBalance();

        deposits[msg.sender] -= _amount;
        totalDeposits -= _amount;

        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        if (!success) revert StrategyVault__TransferFailed();

        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @notice Allocate vault capital to an agent for trading
     * @dev Off-chain keeper calls this after verifying agent reputation
     * @param _agent The agent wallet registered in AgentRegistry
     * @param _amount Amount of capital to allocate
     */
    function allocateToAgent(address _agent, uint256 _amount)
        external
        onlyOwner
        nonReentrant
    {
        if (_amount == 0) revert StrategyVault__ZeroAmount();
        if (_amount > (totalDeposits * maxAllocationRatioBps) / 10000) {
            revert StrategyVault__InsufficientBalance();
        }

        uint256 tokenId = registry.agentToTokenId(_agent);
        if (tokenId == 0) revert StrategyVault__AgentNotRegistered();

        AgentRegistry.AgentProfile memory profile = registry.getProfile(tokenId);
        if (!profile.active) revert StrategyVault__AgentNotTrusted();

        // Optional: reputation gating
        // if (profile.reputationScore < int256(MIN_REPUTATION_FOR_ALLOCATION)) {
        //     revert StrategyVault__InvalidReputation();
        // }

        allocated[_agent] += _amount;

        emit StrategyAllocated(_agent, _amount);
    }

    /**
     * @notice Settle agent PnL after trading cycle
     * @param _agent Agent that traded
     * @param _pnl Positive for profit, negative for loss
     */
    function settleAgentPnL(address _agent, int256 _pnl)
        external
        onlyOwner
        nonReentrant
    {
        agentPnL[_agent] += _pnl;

        // Update registry reputation
        uint256 tokenId = registry.agentToTokenId(_agent);
        if (tokenId != 0) {
            registry.recordTrade(tokenId, _pnl, keccak256(abi.encodePacked(_agent, block.timestamp)));
        }

        emit StrategySettled(_agent, _pnl);
    }

    receive() external payable {
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getAvailableCapital() external view returns (uint256) {
        return address(this).balance;
    }

    function getUserDeposit(address _user) external view returns (uint256) {
        return deposits[_user];
    }
}
