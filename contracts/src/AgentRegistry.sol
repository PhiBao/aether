// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentRegistry
 * @notice ERC-8004 inspired Agent Identity NFT for on-chain AI reputation
 * @dev Every AI trading agent gets a unique soulbound-like identity
 *      that accumulates verified performance metrics on-chain.
 * @dev SECURITY AUDIT Feynman: This contract bridges off-chain AI inference with on-chain
 *       verifiable reputation. Any bug in reputation calculation poisons
 *       the entire agent economy.
 * @dev SECURITY AUDIT State: reputationScore and tradeCount are tightly coupled.
 *       An update to one without the other creates a desync.
 */
contract AgentRegistry is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error AgentRegistry__AgentNotRegistered(address agent);
    error AgentRegistry__AlreadyRegistered(address agent);
    error AgentRegistry__InvalidScore();
    error AgentRegistry__NotAgentOwner(uint256 tokenId, address caller);
    error AgentRegistry__TransferNotAllowed();
    error AgentRegistry__ZeroAddress();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event AgentRegistered(uint256 indexed tokenId, address indexed agent, string metadataURI);
    event ReputationUpdated(uint256 indexed tokenId, int256 newScore, uint256 totalTrades);
    event SkillAdded(uint256 indexed tokenId, bytes32 skillHash);
    event SkillRevoked(uint256 indexed tokenId, bytes32 skillHash);

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    uint256 private _nextTokenId;

    struct AgentProfile {
        address agentAddress;      // The AI agent's operational wallet
        int256 reputationScore;    // Cumulative PnL-based score (can be negative)
        uint256 tradeCount;        // Number of verified trades executed
        uint256 registerTime;      // Block timestamp of registration
        bytes32[] skills;          // Registered capabilities (keccak256 hashes)
        string metadataURI;        // Off-chain agent config / manifest
        bool active;               // Soft-delete flag
    }

    mapping(uint256 => AgentProfile) public profiles;
    mapping(address => uint256) public agentToTokenId;

    // Role-based authorization for signal loggers / vaults
    mapping(address => bool) public authorizedUpdaters;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner) ERC721("MantleAgent", "MNTAGENT") Ownable(_owner) {
        _nextTokenId = 1;
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register a new AI agent with an identity NFT
     * @param _agentWallet The operational address of the agent
     * @param _metadataURI IPFS or HTTP URI to agent manifest
     * @return tokenId The minted ERC-8004 identity token
     * @dev SECURITY AUDIT Feynman: Why do we mint to msg.sender but store _agentWallet?
     *       This creates a separation between NFT owner and agent operator.
     *       If _agentWallet is compromised, owner can reassign via updateAgentAddress.
     */
    function registerAgent(address _agentWallet, string calldata _metadataURI)
        external
        nonReentrant
        returns (uint256 tokenId)
    {
        if (_agentWallet == address(0)) revert AgentRegistry__ZeroAddress();
        if (agentToTokenId[_agentWallet] != 0) revert AgentRegistry__AlreadyRegistered(_agentWallet);

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        AgentProfile storage p = profiles[tokenId];
        p.agentAddress = _agentWallet;
        p.registerTime = block.timestamp;
        p.metadataURI = _metadataURI;
        p.active = true;

        agentToTokenId[_agentWallet] = tokenId;

        emit AgentRegistered(tokenId, _agentWallet, _metadataURI);
    }

    /**
     * @notice Update reputation score after verified trades
     * @dev Only authorized signal loggers / vaults can call
     * @param _tokenId Agent identity token
     * @param _tradePnL PnL of the latest trade ( wei-denominated, can be negative )
     * @param _tradeHash Commitment hash of the trade details
     */
    function recordTrade(uint256 _tokenId, int256 _tradePnL, bytes32 _tradeHash)
        external
    {
        if (!authorizedUpdaters[msg.sender]) revert AgentRegistry__AgentNotRegistered(msg.sender);
        if (_tokenId == 0 || _tokenId >= _nextTokenId) revert AgentRegistry__AgentNotRegistered(address(0));

        AgentProfile storage p = profiles[_tokenId];
        if (!p.active) revert AgentRegistry__AgentNotRegistered(address(0));
        p.tradeCount += 1;
        p.reputationScore += _tradePnL;

        emit ReputationUpdated(_tokenId, p.reputationScore, p.tradeCount);
    }

    /**
     * @notice Batch update for gas efficiency when multiple trades settle
     * @dev Coupled state update: reputationScore AND tradeCount must update atomically
     */
    function recordTradeBatch(uint256 _tokenId, int256[] calldata _pnls)
        external
    {
        if (!authorizedUpdaters[msg.sender]) revert AgentRegistry__AgentNotRegistered(msg.sender);
        if (_tokenId == 0 || _tokenId >= _nextTokenId) revert AgentRegistry__AgentNotRegistered(address(0));

        AgentProfile storage p = profiles[_tokenId];
        if (!p.active) revert AgentRegistry__AgentNotRegistered(address(0));
        uint256 len = _pnls.length;
        int256 totalPnL;

        for (uint256 i; i < len; ) {
            totalPnL += _pnls[i];
            unchecked { ++i; }
        }

        p.tradeCount += len;
        p.reputationScore += totalPnL;

        emit ReputationUpdated(_tokenId, p.reputationScore, p.tradeCount);
    }

    /**
     * @notice Owner can add/update the operational agent address
     * @dev Safety valve if agent wallet is rotated
     */
    function updateAgentAddress(uint256 _tokenId, address _newAgent)
        external
    {
        if (ownerOf(_tokenId) != msg.sender) revert AgentRegistry__NotAgentOwner(_tokenId, msg.sender);
        if (_newAgent == address(0)) revert AgentRegistry__ZeroAddress();
        if (agentToTokenId[_newAgent] != 0 && agentToTokenId[_newAgent] != _tokenId) {
            revert AgentRegistry__AlreadyRegistered(_newAgent);
        }

        AgentProfile storage p = profiles[_tokenId];
        delete agentToTokenId[p.agentAddress];
        p.agentAddress = _newAgent;
        agentToTokenId[_newAgent] = _tokenId;
    }

    /**
     * @notice Admin function to authorize signal loggers / vaults
     */
    function setAuthorizedUpdater(address _updater, bool _authorized)
        external
        onlyOwner
    {
        authorizedUpdaters[_updater] = _authorized;
    }

    /**
     * @notice Deactivate an agent (soft delete)
     */
    function deactivateAgent(uint256 _tokenId) external {
        if (ownerOf(_tokenId) != msg.sender && msg.sender != owner()) {
            revert AgentRegistry__NotAgentOwner(_tokenId, msg.sender);
        }
        profiles[_tokenId].active = false;
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getProfile(uint256 _tokenId)
        external
        view
        returns (AgentProfile memory)
    {
        return profiles[_tokenId];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721)
        returns (string memory)
    {
        _requireOwned(tokenId);
        return profiles[tokenId].metadataURI;
    }

    /*//////////////////////////////////////////////////////////////
                           HOOK OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Prevent transfers to preserve identity-reputation binding
     * @dev This is soulbound-like: only mint and burn are allowed
     * @dev SECURITY AUDIT Feynman: Disabling transfers makes this non-standard ERC721.
     *       Marketplaces will fail. This is intentional — agent identity
     *       must be non-transferable or reputation becomes meaningless.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = super._update(to, tokenId, auth);
        // Allow mint (from == address(0)) and burn (to == address(0))
        if (from != address(0) && to != address(0)) {
            revert AgentRegistry__TransferNotAllowed();
        }
        return from;
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
