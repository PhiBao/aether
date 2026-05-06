// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SignalLogger
 * @notice On-chain benchmarking contract for AI trading decisions
 * @dev Every swarm signal is permanently logged on Mantle for transparency
 *      and verifiable backtesting. Creates an immutable audit trail.
 * @dev SECURITY AUDIT Feynman: This contract is append-only by design. If we ever allow
 *       editing logs, the entire benchmark becomes worthless. Verify no
 *       update/delete functions exist outside emergency pause.
 * @dev SECURITY AUDIT State: signalId and blockTimestamp are monotonically increasing.
 *       Overflow on signalId is theoretically possible after 2^256-1 signals
 *       but practically impossible. Still, verify no overflow check is needed.
 */
contract SignalLogger is Ownable, ReentrancyGuard {

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error SignalLogger__NotAuthorized();
    error SignalLogger__InvalidSignal();
    error SignalLogger__Paused();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event SignalLogged(
        uint256 indexed signalId,
        address indexed agent,
        string symbol,
        int8 direction,        // -1 = SHORT, 0 = HOLD, 1 = LONG
        uint16 confidenceBps,  // 0-10000 (100.00%)
        int256 vibeScore,      // -10000 to 10000 scaled
        bytes32 strategyHash,  // keccak256 of active strategies
        uint256 timestamp
    );

    event ExecutionLogged(
        uint256 indexed signalId,
        bytes32 indexed txHash,
        bool executed,
        uint256 size,
        uint256 entryPrice,
        uint256 slippageBps
    );

    event AuthorizerUpdated(address indexed caller, bool authorized);

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    struct Signal {
        uint256 id;
        address agent;
        string symbol;
        int8 direction;
        uint16 confidenceBps;
        int256 vibeScore;
        bytes32 strategyHash;
        uint256 blockTimestamp;
        uint256 blockNumber;
    }

    struct Execution {
        uint256 signalId;
        bytes32 txHash;
        bool executed;
        uint256 size;
        uint256 entryPrice;
        uint256 slippageBps;
    }

    uint256 public signalCount;
    bool public paused;

    mapping(uint256 => Signal) public signals;
    mapping(uint256 => Execution) public executions;
    mapping(address => bool) public authorizedLoggers;

    // Symbol-level statistics for quick lookup
    mapping(string => uint256) public symbolSignalCount;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner) Ownable(_owner) {}

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    modifier whenNotPaused() {
        if (paused) revert SignalLogger__Paused();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedLoggers[msg.sender] && msg.sender != owner()) {
            revert SignalLogger__NotAuthorized();
        }
        _;
    }

    /**
     * @notice Log a single swarm signal on-chain
     * @param _agent The AI agent wallet that generated the signal
     * @param _symbol Trading pair symbol, e.g. "BTCUSDT"
     * @param _direction -1 for SHORT, 0 for HOLD, 1 for LONG
     * @param _confidenceBps Signal confidence in basis points (0-10000)
     * @param _vibeScore Composite sentiment score, scaled by 10000
     * @param _strategyHash Hash of the strategy configuration used
     * @return signalId The unique ID of this logged signal
     * @dev SECURITY AUDIT Feynman: Why is _agent passed as param instead of derived?
     *       Because the logger may be a relayer or vault, not the agent itself.
     *       This creates a trust assumption: logger must verify agent identity.
     */
    function logSignal(
        address _agent,
        string calldata _symbol,
        int8 _direction,
        uint16 _confidenceBps,
        int256 _vibeScore,
        bytes32 _strategyHash
    )
        external
        onlyAuthorized
        whenNotPaused
        nonReentrant
        returns (uint256 signalId)
    {
        if (_confidenceBps > 10000) revert SignalLogger__InvalidSignal();
        if (_direction < -1 || _direction > 1) revert SignalLogger__InvalidSignal();
        if (_agent == address(0)) revert SignalLogger__InvalidSignal();

        signalId = ++signalCount;

        signals[signalId] = Signal({
            id: signalId,
            agent: _agent,
            symbol: _symbol,
            direction: _direction,
            confidenceBps: _confidenceBps,
            vibeScore: _vibeScore,
            strategyHash: _strategyHash,
            blockTimestamp: block.timestamp,
            blockNumber: block.number
        });

        symbolSignalCount[_symbol] += 1;

        emit SignalLogged(
            signalId,
            _agent,
            _symbol,
            _direction,
            _confidenceBps,
            _vibeScore,
            _strategyHash,
            block.timestamp
        );
    }

    /**
     * @notice Log execution result for a previously emitted signal
     * @dev Links off-chain trade hash to on-chain signal for full auditability
     */
    function logExecution(
        uint256 _signalId,
        bytes32 _txHash,
        bool _executed,
        uint256 _size,
        uint256 _entryPrice,
        uint256 _slippageBps
    )
        external
        onlyAuthorized
        whenNotPaused
    {
        if (signals[_signalId].id == 0) revert SignalLogger__InvalidSignal();
        if (executions[_signalId].signalId != 0) revert SignalLogger__InvalidSignal();

        executions[_signalId] = Execution({
            signalId: _signalId,
            txHash: _txHash,
            executed: _executed,
            size: _size,
            entryPrice: _entryPrice,
            slippageBps: _slippageBps
        });

        emit ExecutionLogged(_signalId, _txHash, _executed, _size, _entryPrice, _slippageBps);
    }

    /**
     * @notice Batch log signals for gas efficiency
     * @dev All signals must pass validation; partial failures revert entire batch
     */
    function logSignalBatch(
        address[] calldata _agents,
        string[] calldata _symbols,
        int8[] calldata _directions,
        uint16[] calldata _confidences,
        int256[] calldata _vibeScores,
        bytes32[] calldata _strategyHashes
    )
        external
        onlyAuthorized
        whenNotPaused
        nonReentrant
    {
        uint256 len = _agents.length;
        if (
            len == 0 ||
            len != _symbols.length ||
            len != _directions.length ||
            len != _confidences.length ||
            len != _vibeScores.length ||
            len != _strategyHashes.length
        ) revert SignalLogger__InvalidSignal();

        for (uint256 i; i < len; ) {
            uint16 conf = _confidences[i];
            int8 dir = _directions[i];
            if (conf > 10000 || dir < -1 || dir > 1 || _agents[i] == address(0)) {
                revert SignalLogger__InvalidSignal();
            }

            uint256 signalId = ++signalCount;
            signals[signalId] = Signal({
                id: signalId,
                agent: _agents[i],
                symbol: _symbols[i],
                direction: dir,
                confidenceBps: conf,
                vibeScore: _vibeScores[i],
                strategyHash: _strategyHashes[i],
                blockTimestamp: block.timestamp,
                blockNumber: block.number
            });

            symbolSignalCount[_symbols[i]] += 1;

            emit SignalLogged(
                signalId,
                _agents[i],
                _symbols[i],
                dir,
                conf,
                _vibeScores[i],
                _strategyHashes[i],
                block.timestamp
            );

            unchecked { ++i; }
        }
    }

    /**
     * @notice Admin controls
     */
    function setAuthorizedLogger(address _logger, bool _authorized) external onlyOwner {
        authorizedLoggers[_logger] = _authorized;
        emit AuthorizerUpdated(_logger, _authorized);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getSignal(uint256 _signalId) external view returns (Signal memory) {
        return signals[_signalId];
    }

    function getExecution(uint256 _signalId) external view returns (Execution memory) {
        return executions[_signalId];
    }

    function getSignalsInRange(uint256 _start, uint256 _end)
        external
        view
        returns (Signal[] memory)
    {
        if (_end > signalCount) _end = signalCount;
        if (_start > _end || _start == 0) revert SignalLogger__InvalidSignal();

        uint256 len = _end - _start + 1;
        Signal[] memory result = new Signal[](len);
        for (uint256 i; i < len; ) {
            result[i] = signals[_start + i];
            unchecked { ++i; }
        }
        return result;
    }
}
