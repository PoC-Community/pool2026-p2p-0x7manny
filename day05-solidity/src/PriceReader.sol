// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "chainlink-evm/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract PriceReader {
    AggregatorV3Interface public priceFeed;

    constructor(address feed) {
        priceFeed = AggregatorV3Interface(feed);
    }

    function getLatestPrice() public view returns (int256) {
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        return answer;
    }

    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }

    function getPriceIn18Decimals() public view returns (uint256) {
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        require(answer > 0);

        uint8 decimals = priceFeed.decimals();

        // casting to uint256 is safe because Chainlink prices are always positive
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(answer) * 10 ** (18 - decimals);
    }

}
