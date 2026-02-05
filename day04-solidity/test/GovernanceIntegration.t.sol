// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VaultGovernor.sol";

interface IVault {
    function setWithdrawalFee(uint256) external;
    function withdrawalFeeBps() external view returns (uint256);
}

interface IERC20Votes {
    function transfer(address, uint256) external returns (bool);
    function delegate(address) external;
}

contract MockVotesToken is IERC20Votes {
    mapping(address => uint256) public balanceOf;
    mapping(address => address) public delegates;
    uint256 public totalSupply;

    constructor(uint256 supply) {
        balanceOf[msg.sender] = supply;
        totalSupply = supply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function delegate(address to) external {
        delegates[msg.sender] = to;
    }

    function getVotes(address account) external view returns (uint256) {
        return balanceOf[account];
    }

    function getPastVotes(address account, uint256) external view returns (uint256) {
        return balanceOf[account];
    }

    function getPastTotalSupply(uint256) external view returns (uint256) {
        return totalSupply;
    }
}

contract MockVault is IVault {
    uint256 public withdrawalFeeBps;
    address public governor;

    function setGovernor(address g) external {
        governor = g;
    }

    function setWithdrawalFee(uint256 fee) external {
        require(msg.sender == governor);
        withdrawalFeeBps = fee;
    }
}

contract GovernanceIntegrationTest is Test {
    MockVotesToken token;
    MockVault vault;
    VaultGovernor governor;

    address proposer = address(0xA11CE);
    address voter = address(0xB0B);

    function setUp() public {
        token = new MockVotesToken(1_000_000 ether);

        token.transfer(proposer, 200_000 ether);
        token.transfer(voter, 200_000 ether);

        vm.prank(proposer);
        token.delegate(proposer);

        vm.prank(voter);
        token.delegate(voter);

        vm.roll(block.number + 1);

        vault = new MockVault();

        governor = new VaultGovernor(
            IVotes(address(token)),
            1,
            10,
            25
        );

        vault.setGovernor(address(governor));
    }

    function _buildProposal(uint256 newFee)
        internal
        view
        returns (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas
        )
    {
        targets = new address[](1);
        values = new uint256[](1);
        calldatas = new bytes[](1);

        targets[0] = address(vault);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(
            IVault.setWithdrawalFee.selector,
            newFee
        );
    }

    function testFullGovernanceWorkflow() public {
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas
        ) = _buildProposal(250);

        string memory description = "Set withdrawal fee to 2.5%";

        vm.prank(proposer);
        uint256 proposalId = governor.propose(
            targets,
            values,
            calldatas,
            description
        );

        vm.roll(block.number + governor.votingDelay() + 1);

        vm.prank(proposer);
        governor.castVote(proposalId, 1);

        vm.prank(voter);
        governor.castVote(proposalId, 1);

        vm.roll(block.number + governor.votingPeriod() + 1);

        governor.execute(
            targets,
            values,
            calldatas,
            keccak256(bytes(description))
        );

        assertEq(vault.withdrawalFeeBps(), 250);
    }

    function testCannotVoteTwice() public {
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas
        ) = _buildProposal(300);

        string memory description = "Set fee to 3%";

        vm.prank(proposer);
        uint256 proposalId = governor.propose(
            targets,
            values,
            calldatas,
            description
        );

        vm.roll(block.number + governor.votingDelay() + 1);

        vm.prank(proposer);
        governor.castVote(proposalId, 1);

        vm.expectRevert();
        vm.prank(proposer);
        governor.castVote(proposalId, 1);
    }

    function testProposalFailsWithoutQuorum() public {
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas
        ) = _buildProposal(400);

        string memory description = "Set fee to 4%";

        vm.prank(proposer);
        uint256 proposalId = governor.propose(
            targets,
            values,
            calldatas,
            description
        );

        vm.roll(block.number + governor.votingDelay() + 1);

        vm.prank(proposer);
        governor.castVote(proposalId, 1);

        vm.roll(block.number + governor.votingPeriod() + 1);

        assertEq(uint8(governor.state(proposalId)), 3);
    }
}
