'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import VaultModule from '@/components/VaultModule';
import GovernanceModule from '@/components/GovernanceModule';
import SwapModule from '@/components/SwapModule';

// Module unlock configuration
const MODULES = {
  vault: { day: 3, unlocked: true },
  governance: { day: 4, unlocked: true },
  swap: { day: 5, unlocked: false },
};

export default function Home() {
  const { isConnected } = useAccount();
  const [activeModule, setActiveModule] = useState<'vault' | 'governance' | 'swap'>('vault');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-cyber-purple">Blockchain</span>{' '}
          <span className="neon-text-cyan">Discovery Pool</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Test your smart contracts in this cyberpunk interface. 
          Each day unlocks new modules as you progress through the pool.
        </p>
      </section>

      {/* Connection Check */}
      {!isConnected ? (
        <div className="cyber-card p-12 text-center mb-8">
          <div className="text-6xl mb-4">🔌</div>
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to interact with your deployed contracts
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <>
          {/* Module Navigation */}
          <nav className="flex gap-4 mb-8 justify-center flex-wrap">
            {Object.entries(MODULES).map(([key, module]) => (
              <button
                key={key}
                onClick={() => module.unlocked && setActiveModule(key as any)}
                disabled={!module.unlocked}
                className={`
                  px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all
                  ${activeModule === key 
                    ? 'bg-cyber-purple text-white shadow-neon-purple' 
                    : module.unlocked 
                      ? 'bg-cyber-dark border border-cyber-purple/50 text-cyber-purple hover:bg-cyber-purple/10'
                      : 'bg-cyber-dark/50 border border-gray-700 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <span className="mr-2">
                  {module.unlocked ? '🔓' : '🔒'}
                </span>
                Day {module.day}: {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </nav>

          {/* Active Module Content */}
          <div className="mt-8">
            {activeModule === 'vault' && MODULES.vault.unlocked && <VaultModule />}
            {activeModule === 'governance' && MODULES.governance.unlocked && <GovernanceModule />}
            {activeModule === 'swap' && MODULES.swap.unlocked && <SwapModule />}
            
            {!MODULES[activeModule].unlocked && (
              <div className="cyber-card-locked p-12 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-gray-400 mb-4">
                  Module Locked
                </h2>
                <p className="text-gray-500">
                  This module will be unlocked on Day {MODULES[activeModule].day}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Function Reference */}
      <section className="mt-12 cyber-card p-6">
        <h2 className="text-xl font-bold text-cyber-cyan mb-4">
          📋 Required Contract Functions
        </h2>
        <p className="text-gray-400 mb-4">
          Your contracts must implement these exact function signatures for the app to work:
        </p>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Day 03 Functions */}
          <div className={`p-4 rounded border ${MODULES.vault.unlocked ? 'border-cyber-green/50 bg-cyber-green/5' : 'border-gray-700 bg-gray-800/20'}`}>
            <h3 className="font-bold text-cyber-green mb-3">Day 03: Vault</h3>
            <code className="text-xs text-gray-300 block space-y-1">
              <div>• totalAssets() → uint256</div>
              <div>• totalShares() → uint256</div>
              <div>• sharesOf(address) → uint256</div>
              <div>• assetsOf(address) → uint256</div>
              <div>• previewDeposit(uint256) → uint256</div>
              <div>• previewWithdraw(uint256) → uint256</div>
              <div>• currentRatio() → uint256</div>
              <div>• deposit(uint256) → uint256</div>
              <div>• withdraw(uint256) → uint256</div>
            </code>
          </div>

          {/* Day 04 Functions */}
          <div className={`p-4 rounded border ${MODULES.governance.unlocked ? 'border-cyber-cyan/50 bg-cyber-cyan/5' : 'border-gray-700 bg-gray-800/20'}`}>
            <h3 className="font-bold text-cyber-cyan mb-3">Day 04: Governance</h3>
            <code className="text-xs text-gray-300 block space-y-1">
              <div>• delegate(address)</div>
              <div>• getVotes(address) → uint256</div>
              <div>• propose(...) → uint256</div>
              <div>• castVote(uint256, uint8)</div>
              <div>• execute(...)</div>
              <div>• state(uint256) → uint8</div>
            </code>
          </div>

          {/* Day 05 Functions */}
          <div className={`p-4 rounded border ${MODULES.swap.unlocked ? 'border-cyber-pink/50 bg-cyber-pink/5' : 'border-gray-700 bg-gray-800/20'}`}>
            <h3 className="font-bold text-gray-500 mb-3">Day 05: Swap 🔒</h3>
            <code className="text-xs text-gray-500 block space-y-1">
              <div>• getCurrentPrice() → (uint256, bool, uint256)</div>
              <div>• previewSwap(uint256) → (uint256, uint256)</div>
              <div>• swap() payable → uint256</div>
              <div>• getTokenLiquidity() → uint256</div>
              <div>• getMaxSwappableETH() → uint256</div>
              <div>• paused() → bool</div>
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}
