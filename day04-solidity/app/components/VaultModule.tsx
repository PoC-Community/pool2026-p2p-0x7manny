'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { CONTRACTS, VAULT_ABI, ERC20_ABI } from '@/lib/contracts';

export default function VaultModule() {
  const { address } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Read Vault Data
  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
  });

  const { data: totalShares, refetch: refetchTotalShares } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'totalShares',
  });

  const { data: userShares, refetch: refetchUserShares } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'sharesOf',
    args: address ? [address] : undefined,
  });

  const { data: userAssets, refetch: refetchUserAssets } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'assetsOf',
    args: address ? [address] : undefined,
  });

  const { data: currentRatio } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'currentRatio',
  });

  const { data: previewDepositShares } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'previewDeposit',
    args: depositAmount ? [parseEther(depositAmount)] : undefined,
  });

  const { data: previewWithdrawAssets } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'previewWithdraw',
    args: withdrawAmount ? [parseEther(withdrawAmount)] : undefined,
  });

  // Read Token Data
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: CONTRACTS.TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.VAULT_ADDRESS] : undefined,
  });

  // Write functions
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { writeContract: deposit, data: depositHash, isPending: isDepositing } = useWriteContract();
  const { writeContract: withdraw, data: withdrawHash, isPending: isWithdrawing } = useWriteContract();

  // Wait for transactions
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: depositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });
  const { isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // Refetch on success
  useEffect(() => {
    if (approveSuccess || depositSuccess || withdrawSuccess) {
      refetchTotalAssets();
      refetchTotalShares();
      refetchUserShares();
      refetchUserAssets();
      refetchTokenBalance();
      refetchAllowance();
    }
  }, [approveSuccess, depositSuccess, withdrawSuccess]);

  const handleApprove = () => {
    if (!depositAmount) return;
    approve({
      address: CONTRACTS.TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.VAULT_ADDRESS, parseEther(depositAmount)],
    });
  };

  const handleDeposit = () => {
    if (!depositAmount) return;
    deposit({
      address: CONTRACTS.VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [parseEther(depositAmount)],
    });
  };

  const handleWithdraw = () => {
    if (!withdrawAmount) return;
    withdraw({
      address: CONTRACTS.VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [parseEther(withdrawAmount)],
    });
  };

  const needsApproval = depositAmount && allowance !== undefined && 
    parseEther(depositAmount) > (allowance as bigint);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-value">
            {totalAssets ? formatEther(totalAssets as bigint) : '0'}
          </div>
          <div className="stat-label">Total Assets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {totalShares ? formatEther(totalShares as bigint) : '0'}
          </div>
          <div className="stat-label">Total Shares</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {currentRatio ? (Number(currentRatio) / 1e18).toFixed(4) : '1.0000'}
          </div>
          <div className="stat-label">Share Ratio</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-cyber-green">
            {tokenBalance ? formatEther(tokenBalance as bigint) : '0'}
          </div>
          <div className="stat-label">Your Token Balance</div>
        </div>
      </div>

      {/* User Position */}
      <div className="cyber-card p-6">
        <h3 className="text-xl font-bold text-cyber-purple mb-4">📊 Your Position</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-4 bg-cyber-black/50 rounded border border-cyber-purple/20">
            <div className="text-3xl font-bold text-cyber-cyan">
              {userShares ? formatEther(userShares as bigint) : '0'}
            </div>
            <div className="text-gray-400">Your Shares</div>
          </div>
          <div className="p-4 bg-cyber-black/50 rounded border border-cyber-green/20">
            <div className="text-3xl font-bold text-cyber-green">
              {userAssets ? formatEther(userAssets as bigint) : '0'}
            </div>
            <div className="text-gray-400">Your Assets Value</div>
          </div>
        </div>
      </div>

      {/* Deposit & Withdraw */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Deposit Card */}
        <div className="cyber-card p-6">
          <h3 className="text-xl font-bold text-cyber-green mb-4">⬇️ Deposit</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount (tokens)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.0"
                className="cyber-input"
              />
            </div>
            {depositAmount && previewDepositShares && (
              <div className="p-3 bg-cyber-green/10 rounded border border-cyber-green/30">
                <div className="text-sm text-gray-400">You will receive</div>
                <div className="text-xl font-bold text-cyber-green">
                  {formatEther(previewDepositShares as bigint)} shares
                </div>
              </div>
            )}
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="cyber-btn w-full"
              >
                {isApproving ? '⏳ Approving...' : '✓ Approve Tokens'}
              </button>
            ) : (
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || isDepositing}
                className="cyber-btn w-full"
              >
                {isDepositing ? '⏳ Depositing...' : '⬇️ Deposit'}
              </button>
            )}
          </div>
        </div>

        {/* Withdraw Card */}
        <div className="cyber-card p-6">
          <h3 className="text-xl font-bold text-cyber-pink mb-4">⬆️ Withdraw</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Shares to burn</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0"
                className="cyber-input"
              />
              <button
                onClick={() => setWithdrawAmount(userShares ? formatEther(userShares as bigint) : '0')}
                className="text-xs text-cyber-cyan hover:underline mt-1"
              >
                Max: {userShares ? formatEther(userShares as bigint) : '0'}
              </button>
            </div>
            {withdrawAmount && previewWithdrawAssets && (
              <div className="p-3 bg-cyber-pink/10 rounded border border-cyber-pink/30">
                <div className="text-sm text-gray-400">You will receive</div>
                <div className="text-xl font-bold text-cyber-pink">
                  {formatEther(previewWithdrawAssets as bigint)} tokens
                </div>
              </div>
            )}
            <button
              onClick={handleWithdraw}
              disabled={!withdrawAmount || isWithdrawing}
              className="cyber-btn-outline w-full"
            >
              {isWithdrawing ? '⏳ Withdrawing...' : '⬆️ Withdraw'}
            </button>
          </div>
        </div>
      </div>

      {/* Contract Addresses */}
      <div className="cyber-card p-4 text-sm">
        <h4 className="font-bold text-gray-400 mb-2">📍 Contract Addresses</h4>
        <div className="space-y-1 font-mono text-xs">
          <div><span className="text-cyber-purple">Token:</span> {CONTRACTS.TOKEN_ADDRESS}</div>
          <div><span className="text-cyber-cyan">Vault:</span> {CONTRACTS.VAULT_ADDRESS}</div>
        </div>
      </div>
    </div>
  );
}
