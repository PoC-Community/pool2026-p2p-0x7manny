// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.3;

import "solady/tokens/ERC20.sol";
import "solady/utils/SafeTransferLib.sol";
import "solady/utils/ReentrancyGuard.sol";
import "solady/auth/Ownable.sol";

contract Vault is ReentrancyGuard, Ownable {
    error ZeroAssets();
    error InsufficientShares();
    error ZeroShares();

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);
    event RewardAdded(uint256 amount);

    using SafeTransferLib for address;

    ERC20 private immutable ASSET;
    uint256 private totalShares;

    mapping(address => uint256) private sharesOf;

    constructor(ERC20 _asset) {
        ASSET = _asset;
    }

    function getAsset() external view returns (address) {
        return address(ASSET);
    }

    function getAssetBalance() internal view returns (uint256) {
        return ASSET.balanceOf(address(this));
    }

    function getAssetName() external view returns (string memory) {
        try ASSET.name() returns (string memory name) {
            if (bytes(name).length == 0) return "Unknown Asset";
            return name;
        } catch {
            return "Unknown Asset";
        }
    }

    function currentRatio() external view returns (uint256) {
        if (totalShares == 0) return 1e18;
        return (getAssetBalance() * 1e18) / totalShares;
    }

    function assetOf(address user)
        external
        view
        returns (uint256 assets, uint256 shares)
    {
        shares = sharesOf[user];
        assets = _convertToAssets(shares);
    }

    function previewDeposit(uint256 assets) external view returns (uint256) {
        return _convertToShares(assets);
    }

    function previewWithdraw(uint256 shares) external view returns (uint256) {
        return _convertToAssets(shares);
    }

    function _convertToShares(uint256 assets)
        internal
        view
        returns (uint256)
    {
        if (totalShares == 0) return assets;
        return (assets * totalShares) / getAssetBalance();
    }

    function _convertToAssets(uint256 shares)
        internal
        view
        returns (uint256)
    {
        if (totalShares == 0) return 0;
        return (shares * getAssetBalance()) / totalShares;
    }

    function deposit(uint256 assets)
        external
        nonReentrant
        returns (uint256 shares)
    {
        if (assets == 0) revert ZeroAssets();

        shares = _convertToShares(assets);
        if (shares == 0) revert ZeroShares();

        address user = msg.sender;

        sharesOf[user] += shares;
        totalShares += shares;

        address(ASSET).safeTransferFrom(user, address(this), assets);

        emit Deposit(user, assets, shares);
    }

    function withdraw(uint256 shares)
        public
        nonReentrant
        returns (uint256 assets)
    {
        if (shares == 0) revert ZeroShares();

        address user = msg.sender;
        uint256 userShares = sharesOf[user];

        if (userShares < shares) revert InsufficientShares();

        assets = _convertToAssets(shares);
        if (assets == 0) revert ZeroAssets();

        sharesOf[user] = userShares - shares;
        totalShares -= shares;

        address(ASSET).safeTransfer(user, assets);

        emit Withdraw(user, assets, shares);
    }

    function withdrawAll() external returns (uint256 assets) {
        assets = withdraw(sharesOf[msg.sender]);
    }

    function addReward(uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        if (amount == 0) revert ZeroAssets();
        if (totalShares == 0) revert ZeroShares();

        address(ASSET).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        emit RewardAdded(amount);
    }

    receive() external payable {}
    fallback() external payable {}
}
