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

        UserProfile storage profile = profiles[msg.sender];

        if (profile.level != 0) {
            revert UserAlreadyExists();
        }

        profile.username = _name;
        profile.level = 1;
        profile.role = Role.USER;
        profile.lastUpdated = block.timestamp;

        emit ProfileCreated(msg.sender, _name);
    }

    function levelUp() external onlyRegistered {
        profiles[msg.sender].level += 1;
        profiles[msg.sender].lastUpdated = block.timestamp;

        emit LevelUp(msg.sender, profiles[msg.sender].level);
    }
}
