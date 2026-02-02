// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProfileSystem {

    enum Role {
        GUEST,
        USER,
        ADMIN
    }

    struct UserProfile {
        string username;
        uint256 level;
        Role role;
        uint256 lastUpdated;
    }

    mapping(address => UserProfile) public profiles;

    error UserAlreadyExists();
    error EmptyUsername();
    error UserNotRegistered();

    modifier onlyRegistered() {
        if (profiles[msg.sender].level == 0) {
            revert UserNotRegistered();
        }
        _;
    }

    event ProfileCreated(address indexed user, string username);
    event LevelUp(address indexed user, uint256 newLevel);

    function createProfile(string calldata _name) external {
        if (bytes(_name).length == 0) {
            revert EmptyUsername();
        }

        if (profiles[msg.sender].level != 0) {
            revert UserAlreadyExists();
        }

        profiles[msg.sender] = UserProfile({
            username: _name,
            level: 1,
            role: Role.USER,
            lastUpdated: block.timestamp
        });

        emit ProfileCreated(msg.sender, _name);
    }

    function levelUp() external onlyRegistered {
        profiles[msg.sender].level += 1;
        profiles[msg.sender].lastUpdated = block.timestamp;

        emit LevelUp(msg.sender, profiles[msg.sender].level);
    }
}
