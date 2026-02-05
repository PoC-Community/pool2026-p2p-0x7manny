'use client';

// ============================================================================
// 🔒 LOCKED MODULE - Day 05
// This module will be unlocked when students reach Day 05
// ============================================================================

export default function SwapModule() {
  return (
    <div className="cyber-card-locked p-12 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-gray-400 mb-4">
        Swap Module Locked
      </h2>
      <p className="text-gray-500 max-w-md mx-auto">
        This module requires the Swap contract with Chainlink Oracle from Day 05.
        Complete Day 05 exercises to unlock swap features.
      </p>
      
      <div className="mt-8 p-4 bg-cyber-dark rounded border border-gray-700">
        <h3 className="font-bold text-gray-500 mb-3">Coming in Day 05:</h3>
        <ul className="text-left text-gray-500 text-sm space-y-2">
          <li>• Real-time ETH/USD price from Chainlink</li>
          <li>• Swap ETH for tokens</li>
          <li>• Preview swap amounts</li>
          <li>• Check liquidity and max swappable</li>
          <li>• Pause/unpause circuit breaker</li>
        </ul>
      </div>
    </div>
  );
}
