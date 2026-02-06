// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AggregatorV3Interface} from "@chainlink/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


contract Swap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    error InvalidPrice(int256 price);
    error StalePrice(uint256 updatedAt, uint256 threshold);
    error ContractPaused();

    // --- Pause state ---
    bool public paused;

    // --- Events ---
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event StaleThresholdUpdated(uint256 oldValue, uint256 newValue);
    event TokenPriceUpdated(uint256 oldValue, uint256 newValue);

    // --- Modifier ---
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

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
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt_,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        if (answer <= 0) {
            revert InvalidPrice(answer);
        }

        if (updatedAt_ > block.timestamp) {
            revert StalePrice(updatedAt_, staleThreshold);
        }

        if (block.timestamp - updatedAt_ > staleThreshold) {
            revert StalePrice(updatedAt_, staleThreshold);
        }

        if (answeredInRound < roundId) {
            revert StalePrice(updatedAt_, staleThreshold);
        }

        uint256 price = uint256(answer);

        if (feedDecimals < 18) {
            priceUSD = price * (10 ** (18 - feedDecimals));
        } else if (feedDecimals > 18) {
            priceUSD = price / (10 ** (feedDecimals - 18));
        } else {
            priceUSD = price;
        }

        updatedAt = updatedAt_;
    }


    function getCurrentPrice() external view returns (uint256 price, bool isStale, uint256 lastUpdate) {
        (price, lastUpdate) = _getPrice();
        isStale = (block.timestamp - lastUpdate) > staleThreshold;
    }

    function swap() external payable nonReentrant whenNotPaused returns (uint256 tokensOut) {
    // --- Checks ---
        require(msg.value > 0, "Must send ETH");

        (uint256 priceETH, uint256 updatedAt) = _getPrice();
        require(block.timestamp - updatedAt <= staleThreshold, "Stale price");

        // --- Effects ---
        // priceETH = price of 1 ETH in USD, scaled to 1e8 or 1e18 depending on oracle
        // tokenPriceUSD = price of 1 token in USD, same scale as priceETH
        // tokenDecimals = ERC20 decimals (e.g. 18)

        tokensOut =
            (msg.value * priceETH * (10 ** tokenDecimals)) /
            (1e18 * tokenPriceUSD);

        require(tokensOut > 0, "Zero output");
        require(token.balanceOf(address(this)) >= tokensOut, "Insufficient liquidity");

        // --- Interactions ---
        token.safeTransfer(msg.sender, tokensOut);

        emit Swapped(msg.sender, msg.value, tokensOut, priceETH);
    }

    function previewSwap(uint256 ethAmount)
    external
    view
    returns (uint256 tokensOut, uint256 priceUsed)
    {
        require(ethAmount > 0, "Zero ETH");

        (priceUsed, ) = _getPrice();

        tokensOut =
            (ethAmount * priceUsed * (10 ** tokenDecimals)) /
            (1e18 * tokenPriceUSD);
    }
    
    function getTokenLiquidity() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getMaxSwappableETH() external view returns (uint256 maxEth) {
        (uint256 priceETH, ) = _getPrice();
        uint256 tokenBalance = getTokenLiquidity();

        if (priceETH == 0 || tokenBalance == 0) return 0;

        // Inverse formula: tokens → max ETH
        maxEth =
            (tokenBalance * 1e18 * tokenPriceUSD) /
            (priceETH * (10 ** tokenDecimals));
    }

    function addLiquidity(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero amount");

        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function removeLiquidity(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero amount");
        require(token.balanceOf(address(this)) >= amount, "Insufficient liquidity");

        token.safeTransfer(msg.sender, amount);
    }

    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "ETH transfer failed");
    }

    function pause() external onlyOwner {
    paused = true;
    emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function setStaleThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold >= 60 && newThreshold <= 86400, "Invalid threshold");

        uint256 old = staleThreshold;
        staleThreshold = newThreshold;

        emit StaleThresholdUpdated(old, newThreshold);
    }

    function setTokenPriceUSD(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");

        uint256 old = tokenPriceUSD;
        tokenPriceUSD = newPrice;

        emit TokenPriceUpdated(old, newPrice);
    }

}