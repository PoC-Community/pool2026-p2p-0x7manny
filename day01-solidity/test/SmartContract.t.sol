// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SmartContract.sol";
import "../src/interfaces/ISmartContract.sol";

contract SmartContractHelper is SmartContract {

    function exposedSetAreYouABadPerson(bool status) public {
        _setAreYouABadPerson(status);
    }

    function exposedAreYouABadPerson() public view returns (bool) {
        return _areYouABadPerson;
    }

    function exposedMyInformations()
        public
        view
        returns (ISmartContract.Informations memory)
    {
        return myInformations;
    }
}

contract SmartContractTest is Test {

    SmartContractHelper smartContract;
    address owner = address(0x1);

    function setUp() public {
        vm.prank(owner);
        smartContract = new SmartContractHelper();
    }

    function testGetHalfAnswerOfLife() public {
        assertEq(smartContract.getHalfAnswerOfLife(), 21);
    }

    function testSetAreYouABadPerson() public {
        smartContract.exposedSetAreYouABadPerson(true);
        assertTrue(smartContract.exposedAreYouABadPerson());
    }

    function testMyInformations() public {
        ISmartContract.Informations memory info =
            smartContract.exposedMyInformations();

        assertEq(info.firstName, "Yannis");
        assertEq(info.lastName, "Manicord");
        assertEq(info.age, 21);
        assertEq(info.city, "Paris");
    }

    function testEditMyCity() public {
        smartContract.editMyCity("Toronto");

        ISmartContract.Informations memory info =
            smartContract.exposedMyInformations();

        assertEq(info.city, "Toronto");
    }

    function testGetFullName() public {
        string memory fullName = smartContract.getMyFullName();
        assertEq(fullName, "Yannis Manicord");
    }

    function testCompleteHalfAnswerOfLifeAsOwner() public {
        vm.prank(owner);
        smartContract.completeHalfAnswerOfLife();

        assertEq(smartContract.getHalfAnswerOfLife(), 42);
    }


    function testCompleteHalfAnswerOfLifeAsNotOwner() public {
        address attacker = address(0xBEEF);

        vm.prank(attacker);
        vm.expectRevert("Not the owner");

        smartContract.completeHalfAnswerOfLife();
    }

    function testHashMyMessage() public {
        bytes32 hash = smartContract.hashMyMessage("hello");
        bytes32 expected = keccak256(abi.encodePacked("hello"));

        assertEq(hash, expected);
    }
}
