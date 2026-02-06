// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AggregatorV3Interface} from "@chainlink/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


contract Swap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // --- Immutables ---
    AggregatorV3Interface public immutable priceFeed;
    IERC20 public immutable token;
    uint8 public immutable feedDecimals;
    uint8 public immutable tokenDecimals;

    // --- Config ---
    uint256 public staleThreshold;
    uint256 public tokenPriceUSD;

    // --- Events ---
    event Swapped(address indexed user, uint256 ethAmount, uint256 tokenAmount, uint256 priceUsed);

    constructor(
        address priceFeedAddress,
        address tokenAddress,
        uint8 tokenDecimals_,
        uint256 tokenPriceUSD_,
        uint256 staleThreshold_
    ) Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(priceFeedAddress);
        token = IERC20(tokenAddress);
        feedDecimals = priceFeed.decimals();
        tokenDecimals = tokenDecimals_;
        tokenPriceUSD = tokenPriceUSD_;
        staleThreshold = staleThreshold_;
    }

    function _getPrice() internal view returns (uint256 priceUSD, uint256 updatedAt) {
        (, int256 answer, , uint256 updatedAt_, ) = priceFeed.latestRoundData();

        require(answer > 0, "Invalid price feed answer");

        // casting to 'uint256' is safe because [explain why]
        // forge-lint: disable-next-line(unsafe-typecast)

        priceUSD = uint256(answer) * 10 ** (18 - feedDecimals);
        updatedAt = updatedAt_;
    }

    function getCurrentPrice() external view returns (uint256 price, bool isStale, uint256 lastUpdate) {
        (price, lastUpdate) = _getPrice();
        isStale = (block.timestamp - lastUpdate) > staleThreshold;
    }
}