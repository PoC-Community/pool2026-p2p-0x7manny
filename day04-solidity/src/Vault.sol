// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "solady/tokens/ERC20.sol";
import "solady/utils/SafeTransferLib.sol";
import "solady/utils/ReentrancyGuard.sol";
import "solady/auth/Ownable.sol";

contract Vault is ReentrancyGuard, Ownable {
    error ZeroAssets();
    error InsufficientShares();
    error ZeroShares();
    error OnlyGovernor();
    error FeeTooHigh();

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);
    event RewardAdded(uint256 amount);
    event WithdrawalFeeUpdated(uint256 oldFee, uint256 newFee);
    event GovernorUpdated(address indexed oldGovernor, address indexed newGovernor);

    uint256 public withdrawalFeeBps;
    address public governor;
    uint256 public constant MAX_FEE = 1000;

    using SafeTransferLib for address;

    ERC20 private immutable ASSET;
    uint256 private totalShares;
    mapping(address => uint256) private sharesOf;

    modifier onlyGovernor() {
        if (msg.sender != governor) revert OnlyGovernor();
        _;
    }

    constructor(ERC20 _asset) {
        ASSET = _asset;
        _initializeOwner(msg.sender);
    }

    function setGovernor(address newGovernor) external onlyOwner {
        address oldGovernor = governor;
        governor = newGovernor;
        emit GovernorUpdated(oldGovernor, newGovernor);
    }

    function setWithdrawalFee(uint256 newFeeBps) external onlyGovernor {
        if (newFeeBps > MAX_FEE) revert FeeTooHigh();
        uint256 oldFee = withdrawalFeeBps;
        withdrawalFeeBps = newFeeBps;
        emit WithdrawalFeeUpdated(oldFee, newFeeBps);
    }

    function getAssetBalance() internal view returns (uint256) {
        return ASSET.balanceOf(address(this));
    }

    function getAsset() external view returns (address) {
        return address(ASSET);
    }

    function assetOf(address user) external view returns (uint256 assets, uint256 shares) {
        shares = sharesOf[user];
        assets = _convertToAssets(shares);
    }

    function _convertToShares(uint256 assets) internal view returns (uint256) {
        uint256 totalAssets = getAssetBalance();
        if (totalShares == 0) return assets;
        return (assets * totalShares) / totalAssets;
    }

    function _convertToAssets(uint256 shares) internal view returns (uint256) {
        uint256 totalAssets = getAssetBalance();
        if (totalShares == 0) return 0;
        return (shares * totalAssets) / totalShares;
    }

    function deposit(uint256 assets) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert ZeroAssets();
        shares = _convertToShares(assets);
        if (shares == 0) revert ZeroShares();
        sharesOf[msg.sender] += shares;
        totalShares += shares;
        address(ASSET).safeTransferFrom(msg.sender, address(this), assets);
        emit Deposit(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) public nonReentrant returns (uint256 assets) {
        if (shares == 0) revert ZeroShares();

        uint256 userShares = sharesOf[msg.sender];
        if (userShares < shares) revert InsufficientShares();

        assets = _convertToAssets(shares);
        if (assets == 0) revert ZeroAssets();

        uint256 fee = (assets * withdrawalFeeBps) / 10000;
        uint256 assetsAfterFee = assets - fee;

        sharesOf[msg.sender] = userShares - shares;
        totalShares -= shares;

        address(ASSET).safeTransfer(msg.sender, assetsAfterFee);

        emit Withdraw(msg.sender, assetsAfterFee, shares);

        assets = assetsAfterFee;
    }


    function withdrawAll() external returns (uint256 assets) {
        assets = withdraw(sharesOf[msg.sender]);
    }

    function addReward(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAssets();
        if (totalShares == 0) revert ZeroShares();
        address(ASSET).safeTransferFrom(msg.sender, address(this), amount);
        emit RewardAdded(amount);
    }

    receive() external payable {}
    fallback() external payable {}
}