// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ISmartContract.sol";

contract SmartContract is ISmartContract {

    uint256 public halfAnswerOfLife = 21;
    address public myEthereumContractAddress = address(this);
    address public myEthereumAddress = msg.sender;
    string public PoCIsWhat = "PoC is good, PoC is life.";

    bool internal _areYouABadPerson = false;
    int256 private _youAreACheater = -42;

    bytes32 public whoIsTheBest =
        0x4c75636173206327657374206c65206265737400000000000000000000000000;

    mapping(string => uint256) public myGrades;
    string[5] public myPhoneNumber = ["06", "65", "70", "67", "61"];

    Informations public myInformations =
        Informations("Yannis", "Manicord", 21, "Paris", roleEnum.STUDENT);

    mapping(address => uint256) public balances;
    address private owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    function getHalfAnswerOfLife()
        external
        view
        override
        returns (uint256)
    {
        return halfAnswerOfLife;
    }

    function getPoCIsWhat()
        external
        view
        override
        returns (string memory)
    {
        return PoCIsWhat;
    }

    function editMyCity(string calldata _city)
        external
        override
    {
        myInformations.city = _city;
    }

    function getMyFullName()
        external
        view
        override
        returns (string memory)
    {
        return string(
            abi.encodePacked(
                myInformations.firstName,
                " ",
                myInformations.lastName
            )
        );
    }

    function completeHalfAnswerOfLife()
        external
        override
        onlyOwner
    {
        halfAnswerOfLife += 21;
    }

    function addToBalance()
        external
        payable
        override
    {
        balances[msg.sender] += msg.value;
        emit BalanceAdded(msg.sender, msg.value);
    }

    function withdrawFromBalance(uint256 _amount)
        external
        override
    {
        if (balances[msg.sender] < _amount) {
            revert InsufficientBalance(_amount, balances[msg.sender]);
        }

        balances[msg.sender] -= _amount;

        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        if (!success) revert TransferFailed();

        emit BalanceWithdrawn(msg.sender, _amount);
    }

    function hashMyMessage(string calldata _message)
        external
        pure
        override
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_message));
    }

    function getMyBalance() public view returns (uint256) {
        return balances[msg.sender];
    }


    function _setAreYouABadPerson(bool status) internal {
        _areYouABadPerson = status;
    }
}
