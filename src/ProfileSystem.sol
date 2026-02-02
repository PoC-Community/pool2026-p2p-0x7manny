// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProfileSystem {
    // ========== ENUMS ==========
    // TODO: Create enum Role { GUEST, USER, ADMIN }
    enum Role {
        GUEST,
        USER,
        ADMIN
    }

    // ========== STRUCTS ==========
    // TODO: Create struct UserProfile with:
    //   - string username
    //   - uint256 level
    //   - Role role
    //   - uint256 lastUpdated

    struct UserProfile {
        string username;
        uint256 level;
        Role role;
        uint256 lastUpdated;
    }


    // ========== MAPPINGS ==========
    // TODO: mapping(address => UserProfile) public profiles
    mapping(address => UserProfile) public profiles;

    // ========== CUSTOM ERRORS ==========
    // TODO: error UserAlreadyExists()
    // TODO: error EmptyUsername()
    // TODO: error UserNotRegistered()
    error UserAlreadyExists();
    error EmptyUsername();
    error UserNotRegistered();
    
    modifier onlyRegistered() {
    if (profiles[msg.sender].level == 0) {
        revert UserNotRegistered();
    }
    _;
}

}