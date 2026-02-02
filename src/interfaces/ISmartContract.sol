// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISmartContract {

    error InsufficientBalance(uint256 requested, uint256 available);
    error TransferFailed();

    event BalanceAdded(address indexed user, uint256 amount);
    event BalanceWithdrawn(address indexed user, uint256 amount);

    enum roleEnum {
        STUDENT,
        TEACHER
    }

    struct Informations {
        string firstName;
        string lastName;
        uint8 age;
        string city;
        roleEnum role;
    }

    function getHalfAnswerOfLife() external view returns (uint256);

    function getPoCIsWhat() external view returns (string memory);

    function editMyCity(string calldata _city) external;

    function getMyFullName() external view returns (string memory);

    function completeHalfAnswerOfLife() external;

    function addToBalance() external payable;

    function withdrawFromBalance(uint256 _amount) external;

    function hashMyMessage(string calldata _message)
        external
        pure
        returns (bytes32);
}
