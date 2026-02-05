'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from 'wagmi';
import { formatEther, parseEther, keccak256, toBytes, encodeFunctionData, encodeAbiParameters } from 'viem';
import { CONTRACTS, GOVERNOR_ABI, ERC20_VOTES_ABI, VAULT_ABI } from '@/lib/contracts';

// Proposal states from OpenZeppelin Governor
const PROPOSAL_STATES = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

interface Proposal {
  id: string;
  description: string;
  fee: string;
  timestamp: number;
}

export default function GovernanceModule() {
  const { address } = useAccount();
  const { data: blockNumber } = useBlockNumber();
  
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalFee, setProposalFee] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [voteSupport, setVoteSupport] = useState<0 | 1 | 2>(1);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [processedProposalHashes, setProcessedProposalHashes] = useState<Set<string>>(new Set());
  const [mintAmount, setMintAmount] = useState('1000');

  // Read Token Data (with Votes)
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: CONTRACTS.TOKEN_ADDRESS,
    abi: ERC20_VOTES_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: votingPower, refetch: refetchVotingPower } = useReadContract({
    address: CONTRACTS.TOKEN_ADDRESS,
    abi: ERC20_VOTES_ABI,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
  });

  const { data: delegates } = useReadContract({
    address: CONTRACTS.TOKEN_ADDRESS,
    abi: ERC20_VOTES_ABI,
    functionName: 'delegates',
    args: address ? [address] : undefined,
  });

  // Read Governor Data
  const { data: votingDelay } = useReadContract({
    address: CONTRACTS.GOVERNOR_ADDRESS,
    abi: GOVERNOR_ABI,
    functionName: 'votingDelay',
  });

  const { data: votingPeriod } = useReadContract({
    address: CONTRACTS.GOVERNOR_ADDRESS,
    abi: GOVERNOR_ABI,
    functionName: 'votingPeriod',
  });

  const { data: quorum } = useReadContract({
    address: CONTRACTS.GOVERNOR_ADDRESS,
    abi: GOVERNOR_ABI,
    functionName: 'quorum',
    args: blockNumber != null ? [blockNumber - 1n] : undefined,
  });

  const { data: proposalState, refetch: refetchProposalState } = useReadContract({
    address: CONTRACTS.GOVERNOR_ADDRESS,
    abi: GOVERNOR_ABI,
    functionName: 'state',
    args: proposalId && proposalId.trim() !== '' ? (() => {
      try {
        return [BigInt(proposalId.trim())];
      } catch {
        return undefined;
      }
    })() : undefined,
    query: {
      enabled: !!proposalId && proposalId.trim() !== '',
    },
  });

  const { data: proposalSnapshot } = useReadContract({
    address: CONTRACTS.GOVERNOR_ADDRESS,
    abi: GOVERNOR_ABI,
    functionName: 'proposalSnapshot',
    args: proposalId && proposalId.trim() !== '' ? (() => {
      try {
        return [BigInt(proposalId.trim())];
      } catch {
        return undefined;
      }
    })() : undefined,
    query: {
      enabled: !!proposalId && proposalId.trim() !== '',
    },
  });

  const { data: proposalDeadline } = useReadContract({
    address: CONTRACTS.GOVERNOR_ADDRESS,
    abi: GOVERNOR_ABI,
    functionName: 'proposalDeadline',
    args: proposalId && proposalId.trim() !== '' ? (() => {
      try {
        return [BigInt(proposalId.trim())];
      } catch {
        return undefined;
      }
    })() : undefined,
    query: {
      enabled: !!proposalId && proposalId.trim() !== '',
    },
  });

  // Read Vault Data
  const { data: currentFee } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: [...VAULT_ABI, {
      name: 'withdrawalFeeBps',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }],
    }] as const,
    functionName: 'withdrawalFeeBps',
  });

  // Check if user is owner
  const { data: tokenOwner } = useReadContract({
    address: CONTRACTS.TOKEN_ADDRESS,
    abi: ERC20_VOTES_ABI,
    functionName: 'owner',
  });

  const isOwner = address && tokenOwner && address.toLowerCase() === (tokenOwner as string).toLowerCase();

  // Write functions
  const { writeContract: delegate, data: delegateHash, isPending: isDelegating, error: delegateError } = useWriteContract();
  const { writeContract: propose, data: proposeHash, isPending: isProposing, error: proposeError } = useWriteContract();
  const { writeContract: castVote, data: voteHash, isPending: isVoting, error: voteError } = useWriteContract();
  const { writeContract: execute, data: executeHash, isPending: isExecuting, error: executeError } = useWriteContract();
  const { writeContract: mint, data: mintHash, isPending: isMinting, error: mintError } = useWriteContract();

  // Wait for transactions
  const { isSuccess: delegateSuccess, data: delegateReceipt } = useWaitForTransactionReceipt({ hash: delegateHash });
  const { data: proposeReceipt, isSuccess: proposeSuccess } = useWaitForTransactionReceipt({ hash: proposeHash });
  const { isSuccess: voteSuccess } = useWaitForTransactionReceipt({ hash: voteHash });
  const { isSuccess: executeSuccess } = useWaitForTransactionReceipt({ hash: executeHash });
  const { isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  // Load proposals from localStorage on mount
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`proposals_${address}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Proposal[];
          // Remove duplicates based on proposal ID
          const uniqueProposals = parsed.filter((proposal, index, self) =>
            index === self.findIndex(p => p.id === proposal.id)
          );
          setMyProposals(uniqueProposals);
          
          // Also restore last selected proposal if available
          const lastSelected = localStorage.getItem(`lastProposal_${address}`);
          if (lastSelected) {
            try {
              const { id, description, fee } = JSON.parse(lastSelected);
              if (id) setProposalId(id);
              if (description) setProposalDescription(description);
              if (fee) setProposalFee(fee);
            } catch (e) {
              console.error('Failed to load last proposal:', e);
            }
          }
        } catch (e) {
          console.error('Failed to load proposals:', e);
        }
      }
    }
  }, [address]);

  // Save last selected proposal to localStorage
  useEffect(() => {
    if (address && proposalId) {
      localStorage.setItem(`lastProposal_${address}`, JSON.stringify({
        id: proposalId,
        description: proposalDescription,
        fee: proposalFee,
      }));
    }
  }, [address, proposalId, proposalDescription, proposalFee]);

  // Save proposals to localStorage whenever they change (with deduplication)
  useEffect(() => {
    if (address && myProposals.length >= 0) {
      // Remove duplicates before saving
      const uniqueProposals = myProposals.filter((proposal, index, self) =>
        index === self.findIndex(p => p.id === proposal.id)
      );
      localStorage.setItem(`proposals_${address}`, JSON.stringify(uniqueProposals));
      
      // Update state if duplicates were removed
      if (uniqueProposals.length !== myProposals.length) {
        setMyProposals(uniqueProposals);
      }
    }
  }, [myProposals, address]);

  // Extract proposal ID from transaction receipt
  useEffect(() => {
    if (proposeSuccess && proposeReceipt && proposalDescription && proposalFee) {
      // Create a unique hash for this transaction to avoid processing it multiple times
      const txHash = proposeReceipt.transactionHash;
      const processingKey = `${txHash}-${proposalDescription}-${proposalFee}`;
      
      // Check if we've already processed this transaction
      if (processedProposalHashes.has(processingKey)) {
        return; // Already processed, skip
      }
      
      // Extract proposal ID from ProposalCreated event logs
      let proposalIdFromLog: string | null = null;
      
      if (proposeReceipt.logs) {
        // Event signature: ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)
        const eventSignature = 'ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)';
        const eventTopic = keccak256(toBytes(eventSignature));
        
        for (const log of proposeReceipt.logs) {
          if (log.topics && log.topics[0] === eventTopic && log.topics.length > 1) {
            // Proposal ID is the first indexed parameter (topics[1])
            proposalIdFromLog = BigInt(log.topics[1]).toString();
            break;
          }
        }
      }
      
      // If we couldn't extract from logs, calculate it manually
      if (!proposalIdFromLog) {
        const descriptionHash = keccak256(toBytes(proposalDescription));
        const calldata = encodeFunctionData({
          abi: [{
            name: 'setWithdrawalFee',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'newFeeBps', type: 'uint256' }],
            outputs: [],
          }],
          functionName: 'setWithdrawalFee',
          args: [BigInt(proposalFee)],
        });
        
        // Proposal ID = hashProposal(targets, values, calldatas, descriptionHash)
        // hashProposal = keccak256(abi.encode(targets, values, calldatas, descriptionHash))
        try {
          const encoded = encodeAbiParameters(
            [
              { type: 'address[]' },
              { type: 'uint256[]' },
              { type: 'bytes[]' },
              { type: 'bytes32' },
            ],
            [[CONTRACTS.VAULT_ADDRESS], [BigInt(0)], [calldata], descriptionHash]
          );
          proposalIdFromLog = BigInt(keccak256(encoded)).toString();
        } catch (e) {
          console.error('Failed to calculate proposal ID:', e);
          // Fallback: use a placeholder that user can update manually
          proposalIdFromLog = 'pending';
        }
      }
      
      if (proposalIdFromLog) {
        // Mark this transaction as processed
        setProcessedProposalHashes(prev => new Set([...prev, processingKey]));
        
        // Check if this proposal already exists to avoid duplicates
        setMyProposals(prev => {
          // Check if proposal with this ID already exists
          const exists = prev.some(p => p.id === proposalIdFromLog);
          if (exists) {
            // Proposal already exists, don't add it again
            return prev;
          }
          
          // Add new proposal
          const newProposal: Proposal = {
            id: proposalIdFromLog,
            description: proposalDescription,
            fee: proposalFee,
            timestamp: Date.now(),
          };
          
          return [newProposal, ...prev];
        });
        
        setProposalId(proposalIdFromLog); // Auto-fill the proposal ID
        
        // Clear form
        setProposalDescription('');
        setProposalFee('');
      }
    }
  }, [proposeSuccess, proposeReceipt, proposalDescription, proposalFee, processedProposalHashes]);

  const handleDelegate = () => {
    if (!address) return;
    delegate({
      address: CONTRACTS.TOKEN_ADDRESS,
      abi: ERC20_VOTES_ABI,
      functionName: 'delegate',
      args: [address],
    });
  };

  const handleMint = () => {
    if (!address || !mintAmount) return;
    const amount = parseEther(mintAmount);
    mint({
      address: CONTRACTS.TOKEN_ADDRESS,
      abi: ERC20_VOTES_ABI,
      functionName: 'mint',
      args: [address, amount],
    });
  };

  // Check if user has delegated
  const hasDelegated = delegates && delegates !== '0x0000000000000000000000000000000000000000';

  // Mint and then delegate in sequence
  const handleMintAndDelegate = async () => {
    if (!address || !mintAmount) return;
    const amount = parseEther(mintAmount);
    
    // First mint
    mint({
      address: CONTRACTS.TOKEN_ADDRESS,
      abi: ERC20_VOTES_ABI,
      functionName: 'mint',
      args: [address, amount],
    });
  };

  // Auto-delegate after successful mint
  useEffect(() => {
    if (mintSuccess && address && !hasDelegated) {
      // Auto-delegate after mint succeeds
      delegate({
        address: CONTRACTS.TOKEN_ADDRESS,
        abi: ERC20_VOTES_ABI,
        functionName: 'delegate',
        args: [address],
      });
    }
  }, [mintSuccess, address, hasDelegated]);

  // Refresh all data
  const handleRefreshAll = () => {
    refetchTokenBalance();
    refetchVotingPower();
    if (proposalId) {
      refetchProposalState();
    }
  };

  const handlePropose = async () => {
    if (!proposalDescription || !proposalFee) return;
    
    const calldata = encodeFunctionData({
      abi: [{
        name: 'setWithdrawalFee',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'newFeeBps', type: 'uint256' }],
        outputs: [],
      }],
      functionName: 'setWithdrawalFee',
      args: [BigInt(proposalFee)],
    });

    // Calculate proposal ID before creating (so we can store it immediately)
    const descriptionHash = keccak256(toBytes(proposalDescription));
    
    // We can calculate the proposal ID using getProposalId if available
    // Otherwise we'll extract it from the transaction receipt
    const targets = [CONTRACTS.VAULT_ADDRESS];
    const values = [BigInt(0)];
    const calldatas = [calldata];

    propose({
      address: CONTRACTS.GOVERNOR_ADDRESS,
      abi: GOVERNOR_ABI,
      functionName: 'propose',
      args: [
        targets,
        values,
        calldatas,
        proposalDescription,
      ],
    });
  };

  const handleVote = async () => {
    if (!proposalId) {
      alert('Please enter a Proposal ID');
      return;
    }
    
    // Validate proposal ID is a valid number
    let proposalIdBigInt: bigint;
    try {
      // Remove any whitespace
      const cleanProposalId = proposalId.trim();
      if (!cleanProposalId || cleanProposalId === '') {
        alert('Please enter a valid Proposal ID');
        return;
      }
      proposalIdBigInt = BigInt(cleanProposalId);
    } catch (e) {
      alert(`Invalid Proposal ID: "${proposalId}". Please enter a valid number.`);
      console.error('Proposal ID conversion error:', e);
      return;
    }
    
    // Check if user has delegated
    if (!hasDelegated) {
      alert('Please delegate your voting power first before voting.');
      return;
    }
    
    // Check if user has tokens
    if (!tokenBalance || BigInt(tokenBalance.toString()) === 0n) {
      alert('You have no tokens. You need tokens to vote.');
      return;
    }
    
    // Check if user has delegated
    if (!hasDelegated) {
      alert('Please delegate your voting power first. Click "Delegate to Self" in the Delegation section.');
      return;
    }
    
    // Check if user has voting power (after delegation)
    if (!votingPower || BigInt(votingPower.toString()) === 0n) {
      alert('You have tokens but no voting power. This might be because:\n- You need to delegate again\n- The delegation checkpoint hasn\'t been created yet (wait a block)\n\nTry clicking "Delegate to Self" again and wait a moment.');
      return;
    }
    
    // Check if proposal is Active (state 1) - but don't block if state is undefined (still loading)
    if (proposalState !== undefined && Number(proposalState) !== 1) {
      const stateName = PROPOSAL_STATES[Number(proposalState)];
      alert(`Cannot vote: Proposal is in "${stateName}" state. You can only vote when the proposal is "Active".\n\nPlease wait for the voting delay to pass (${votingDelay?.toString() || '?'} blocks) after proposal creation.`);
      return;
    }
    
    // Ensure voteSupport is a valid uint8 (0, 1, or 2)
    const voteSupportUint8 = Number(voteSupport);
    if (voteSupportUint8 < 0 || voteSupportUint8 > 2) {
      alert(`Invalid vote support value: ${voteSupport}. Must be 0 (Against), 1 (For), or 2 (Abstain).`);
      return;
    }
    
    console.log('Casting vote with:', {
      proposalId: proposalIdBigInt.toString(),
      proposalIdHex: '0x' + proposalIdBigInt.toString(16),
      voteSupport: voteSupportUint8,
      proposalState: proposalState !== undefined ? PROPOSAL_STATES[Number(proposalState)] : 'loading',
      votingPower: votingPower?.toString(),
      hasDelegated,
    });
    
    try {
      await castVote({
        address: CONTRACTS.GOVERNOR_ADDRESS,
        abi: GOVERNOR_ABI,
        functionName: 'castVote',
        args: [proposalIdBigInt, voteSupportUint8 as 0 | 1 | 2],
      });
    } catch (error: any) {
      console.error('Vote error:', error);
      const errorMessage = error?.message || error?.shortMessage || error?.toString() || 'Unknown error';
      alert(`Failed to cast vote: ${errorMessage}\n\nCommon issues:\n- Proposal must be Active (wait for voting delay)\n- You must have voting power\n- You cannot vote twice\n- Check the console for more details`);
    }
  };

  const handleExecute = () => {
    if (!proposalId || !proposalDescription || !proposalFee) return;
    
    const calldata = encodeFunctionData({
      abi: [{
        name: 'setWithdrawalFee',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'newFeeBps', type: 'uint256' }],
        outputs: [],
      }],
      functionName: 'setWithdrawalFee',
      args: [BigInt(proposalFee)],
    });

    const descriptionHash = keccak256(toBytes(proposalDescription));

    execute({
      address: CONTRACTS.GOVERNOR_ADDRESS,
      abi: GOVERNOR_ABI,
      functionName: 'execute',
      args: [
        [CONTRACTS.VAULT_ADDRESS],
        [BigInt(0)],
        [calldata],
        descriptionHash,
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Start Guide */}
      {(!tokenBalance || BigInt(tokenBalance.toString()) === 0n) && (
        <div className="cyber-card p-6 bg-gradient-to-r from-cyber-purple/20 to-cyber-cyan/20 border-2 border-cyber-purple/50">
          <h3 className="text-xl font-bold text-cyber-cyan mb-3">🚀 Quick Start Guide</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <span className="text-cyber-yellow font-bold">1.</span>
              <div>
                <strong>Get Tokens:</strong> {isOwner ? (
                  <>Use the "Mint Tokens" section below to mint tokens for yourself.</>
                ) : (
                  <>Ask the contract owner to mint tokens for your address: <code className="text-xs bg-cyber-dark px-1 rounded">{address?.slice(0, 10)}...</code></>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyber-yellow font-bold">2.</span>
              <div>
                <strong>Delegate:</strong> Click "Delegate to Self" to activate your voting power.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyber-yellow font-bold">3.</span>
              <div>
                <strong>Create Proposal:</strong> Fill in description and fee, then create a proposal.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyber-yellow font-bold">4.</span>
              <div>
                <strong>Wait & Vote:</strong> Wait for proposal to become "Active" (1 block), then vote!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-value">
              {tokenBalance ? formatEther(tokenBalance as bigint) : '0'}
            </div>
            <div className="stat-label">Token Balance</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-cyber-cyan">
              {votingPower ? formatEther(votingPower as bigint) : '0'}
            </div>
            <div className="stat-label">Voting Power</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {quorum ? formatEther(quorum as bigint) : '0'}
            </div>
            <div className="stat-label">Quorum Required</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-cyber-yellow">
              {currentFee !== undefined ? `${Number(currentFee) / 100}%` : '0%'}
            </div>
            <div className="stat-label">Current Fee</div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleRefreshAll}
            className="text-xs px-3 py-1 bg-cyber-purple/20 text-cyber-purple rounded hover:bg-cyber-purple/30 border border-cyber-purple/30"
          >
            Refresh All Data
          </button>
        </div>
      </div>

      {/* Mint Tokens (Owner only) */}
      {isOwner && (
        <div className="cyber-card p-6">
          <h3 className="text-xl font-bold text-cyber-yellow mb-4">🪙 Mint Tokens (Owner)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount to Mint</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="1000"
                  className="cyber-input flex-1"
                  min="1"
                />
                <button
                  onClick={handleMint}
                  disabled={!mintAmount || isMinting || parseFloat(mintAmount) <= 0}
                  className="cyber-btn px-4"
                >
                  {isMinting ? '⏳...' : '🪙 Mint'}
                </button>
                <button
                  onClick={handleMintAndDelegate}
                  disabled={!mintAmount || isMinting || isDelegating || parseFloat(mintAmount) <= 0}
                  className="cyber-btn px-4 bg-gradient-to-r from-cyber-yellow to-cyber-purple"
                >
                  {isMinting || isDelegating ? '⏳...' : '🪙+🗳️ Mint & Delegate'}
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setMintAmount('1000')}
                  className="text-xs px-2 py-1 bg-cyber-dark border border-cyber-yellow/30 text-cyber-yellow rounded hover:bg-cyber-yellow/10"
                >
                  1K
                </button>
                <button
                  onClick={() => setMintAmount('10000')}
                  className="text-xs px-2 py-1 bg-cyber-dark border border-cyber-yellow/30 text-cyber-yellow rounded hover:bg-cyber-yellow/10"
                >
                  10K
                </button>
                <button
                  onClick={() => setMintAmount('100000')}
                  className="text-xs px-2 py-1 bg-cyber-dark border border-cyber-yellow/30 text-cyber-yellow rounded hover:bg-cyber-yellow/10"
                >
                  100K
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {mintAmount && `= ${parseFloat(mintAmount).toLocaleString()} POOL tokens`}
              </div>
            </div>
            {mintSuccess && (
              <div className="p-3 bg-cyber-green/10 rounded border border-cyber-green/30 text-center">
                <div className="text-cyber-green font-bold">✓ Tokens Minted Successfully!</div>
                <div className="text-sm text-gray-400 mt-1">
                  {mintAmount} POOL tokens added to your balance
                </div>
                <div className="text-xs text-cyber-cyan mt-2">
                  Auto-delegating... Click "Refresh Data" after a few seconds.
                </div>
              </div>
            )}
            {mintError && (
              <div className="p-3 bg-red-500/10 rounded border border-red-500/30 text-center">
                <div className="text-red-400 font-bold">✗ Mint Failed</div>
                <div className="text-xs text-red-300 mt-1">
                  {mintError.message || 'Transaction reverted'}
                </div>
              </div>
            )}
            <div className="p-3 bg-cyber-purple/10 rounded border border-cyber-purple/30 text-xs">
              <div className="font-bold text-cyber-purple mb-1">Important: Ordre des operations</div>
              <ol className="list-decimal list-inside text-gray-400 space-y-1">
                <li>Mint tokens (vous donne des tokens)</li>
                <li>Delegate (active votre voting power)</li>
                <li>Attendre 1 bloc</li>
                <li>Creer une proposition (le snapshot est pris ICI)</li>
                <li>Voter</li>
              </ol>
              <div className="text-yellow-400 mt-2">
                Si vous avez cree une proposition AVANT de deleguer, votre voting power au snapshot etait 0!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delegation */}
      <div className="cyber-card p-6">
        <h3 className="text-xl font-bold text-cyber-purple mb-4">🗳️ Delegation</h3>
        <div className="space-y-4">
          {hasDelegated && (
            <div className="p-4 bg-cyber-green/10 rounded border border-cyber-green/30 text-center">
              <div className="text-cyber-green font-bold">✓ Delegation Active</div>
              <div className="text-sm text-gray-400 mt-1">
                Delegated to: {delegates === address ? 'Yourself' : (delegates as string)?.slice(0, 10) + '...'}
              </div>
            </div>
          )}
          
          <div className="text-center">
            {!hasDelegated && (
              <p className="text-gray-400 mb-4">
                You must delegate your voting power to yourself before you can vote.
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleDelegate}
                disabled={isDelegating || !tokenBalance || BigInt(tokenBalance.toString()) === 0n}
                className="cyber-btn"
              >
                {isDelegating ? '⏳ Delegating...' : hasDelegated ? '🔄 Re-delegate' : '✓ Delegate to Self'}
              </button>
              <button
                onClick={handleRefreshAll}
                className="cyber-btn-outline"
              >
                🔄 Refresh
              </button>
            </div>
            {(!tokenBalance || BigInt(tokenBalance.toString()) === 0n) && (
              <div className="text-xs text-yellow-400 mt-2">
                ⚠️ You need tokens first. {isOwner ? 'Use the Mint Tokens section above.' : 'Ask the owner to mint tokens for you.'}
              </div>
            )}
            {delegateSuccess && (
              <div className="text-xs text-cyber-green mt-2">
                ✓ Delegation successful! Click "Refresh" to update your voting power.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My Proposals */}
      {myProposals.length > 0 && (
        <div className="cyber-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-cyber-cyan">📋 My Proposals</h3>
            {myProposals.length > new Set(myProposals.map(p => p.id)).size && (
              <button
                onClick={() => {
                  // Remove duplicates, keep the first occurrence of each ID
                  const uniqueProposals = myProposals.filter((proposal, index, self) =>
                    index === self.findIndex(p => p.id === proposal.id)
                  );
                  setMyProposals(uniqueProposals);
                }}
                className="px-3 py-1 text-xs bg-cyber-yellow/20 text-cyber-yellow rounded hover:bg-cyber-yellow/30"
              >
                🧹 Remove Duplicates
              </button>
            )}
          </div>
          <div className="space-y-2">
            {myProposals
              .filter((proposal, index, self) =>
                index === self.findIndex(p => p.id === proposal.id)
              )
              .map((proposal) => (
                <div
                  key={proposal.id}
                  className="p-3 bg-cyber-dark/50 rounded border border-cyber-cyan/30 hover:border-cyber-cyan/60 cursor-pointer transition-colors"
                  onClick={() => {
                    setProposalId(proposal.id);
                    setProposalDescription(proposal.description);
                    setProposalFee(proposal.fee);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-cyber-cyan mb-1">
                        Proposal #{proposal.id}
                      </div>
                      <div className="text-sm text-gray-400 mb-1">
                        {proposal.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        Fee: {Number(proposal.fee) / 100}% • {new Date(proposal.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProposalId(proposal.id);
                      }}
                      className="ml-2 px-3 py-1 text-xs bg-cyber-cyan/20 text-cyber-cyan rounded hover:bg-cyber-cyan/30"
                    >
                      Use ID
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create Proposal */}
      <div className="cyber-card p-6">
        <h3 className="text-xl font-bold text-cyber-cyan mb-4">📝 Create Proposal</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Description</label>
            <input
              type="text"
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              placeholder="Proposal #1: Set withdrawal fee to 2.5%"
              className="cyber-input"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">New Fee (basis points, 100 = 1%)</label>
            <input
              type="number"
              value={proposalFee}
              onChange={(e) => setProposalFee(e.target.value)}
              placeholder="250"
              className="cyber-input"
            />
            <div className="text-xs text-gray-500 mt-1">
              {proposalFee && `= ${Number(proposalFee) / 100}%`}
            </div>
          </div>
          <button
            onClick={handlePropose}
            disabled={!proposalDescription || !proposalFee || isProposing || !hasDelegated}
            className="cyber-btn w-full"
          >
            {isProposing ? '⏳ Creating...' : '📝 Create Proposal'}
          </button>
          {proposeSuccess && (
            <div className="p-3 bg-cyber-green/10 rounded border border-cyber-green/30 text-center">
              <div className="text-cyber-green font-bold">✓ Proposal Created!</div>
              <div className="text-sm text-gray-400 mt-1">
                Proposal ID: {proposalId || 'Check transaction logs'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vote & Execute */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Vote */}
        <div className="cyber-card p-6">
          <h3 className="text-xl font-bold text-cyber-green mb-4">🗳️ Vote</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Proposal ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={proposalId}
                  onChange={(e) => setProposalId(e.target.value)}
                  placeholder="123..."
                  className="cyber-input flex-1"
                />
                {myProposals.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const proposal = myProposals.find(p => p.id === e.target.value);
                        if (proposal) {
                          setProposalId(proposal.id);
                          setProposalDescription(proposal.description);
                          setProposalFee(proposal.fee);
                        }
                      }
                    }}
                    className="cyber-input w-32"
                    value=""
                  >
                    <option value="">Select...</option>
                    {myProposals.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => refetchProposalState()}
                  disabled={!proposalId}
                  className="px-3 py-2 text-xs bg-cyber-green/20 text-cyber-green rounded hover:bg-cyber-green/30 border border-cyber-green/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Refresh
                </button>
              </div>
            <div className="text-xs text-gray-500 mt-1">
              💡 Tip: Click on a proposal above or select from dropdown to auto-fill
            </div>
            {proposalId && proposalState === undefined && (
              <div className="text-xs text-yellow-400 mt-1">
                ⏳ Loading proposal state...
              </div>
            )}
            {!proposalId && (
              <div className="text-xs text-gray-500 mt-1">
                Enter a Proposal ID to check its state and vote
              </div>
            )}
            </div>
            {proposalId && proposalState !== undefined && (
              <div className={`p-3 rounded border ${
                Number(proposalState) === 1 
                  ? 'bg-cyber-green/10 border-cyber-green/30' 
                  : 'bg-cyber-purple/10 border-cyber-purple/30'
              }`}>
                <div className="text-sm text-gray-400">Proposal State</div>
                <div className={`font-bold ${
                  Number(proposalState) === 1 
                    ? 'text-cyber-green' 
                    : 'text-cyber-purple'
                }`}>
                  {PROPOSAL_STATES[Number(proposalState)]}
                </div>
                {Number(proposalState) !== 1 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {Number(proposalState) === 0 && '⏳ Wait for voting delay to pass'}
                    {Number(proposalState) === 3 && '❌ Proposal was defeated'}
                    {Number(proposalState) === 4 && '✅ Proposal succeeded - ready to execute'}
                    {Number(proposalState) === 7 && '✓ Proposal already executed'}
                  </div>
                )}
                {proposalSnapshot && proposalDeadline && blockNumber && (
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <div>Snapshot Block: {proposalSnapshot.toString()}</div>
                    <div>Deadline Block: {proposalDeadline.toString()}</div>
                    {Number(proposalState) === 1 && (
                      <div className="text-cyber-green mt-1">
                        {Number(proposalDeadline) > Number(blockNumber) 
                          ? `⏰ ${Number(proposalDeadline) - Number(blockNumber)} blocks remaining`
                          : '⏰ Voting period ended'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setVoteSupport(1)}
                className={`flex-1 py-2 rounded font-bold ${voteSupport === 1 ? 'bg-cyber-green text-black' : 'bg-cyber-dark border border-cyber-green/50 text-cyber-green'}`}
              >
                For
              </button>
              <button
                onClick={() => setVoteSupport(0)}
                className={`flex-1 py-2 rounded font-bold ${voteSupport === 0 ? 'bg-cyber-red text-white' : 'bg-cyber-dark border border-cyber-red/50 text-cyber-red'}`}
              >
                Against
              </button>
              <button
                onClick={() => setVoteSupport(2)}
                className={`flex-1 py-2 rounded font-bold ${voteSupport === 2 ? 'bg-cyber-yellow text-black' : 'bg-cyber-dark border border-cyber-yellow/50 text-cyber-yellow'}`}
              >
                Abstain
              </button>
            </div>
            <button
              onClick={handleVote}
              disabled={
                !proposalId || 
                isVoting || 
                !hasDelegated || 
                !tokenBalance ||
                BigInt(tokenBalance.toString()) === 0n ||
                (proposalState !== undefined && Number(proposalState) !== 1) ||
                !votingPower ||
                BigInt(votingPower.toString()) === 0n
              }
              className="cyber-btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !proposalId ? 'Enter a Proposal ID' :
                !hasDelegated ? 'You must delegate first' :
                !tokenBalance || BigInt(tokenBalance.toString()) === 0n ? 'You need tokens' :
                !votingPower || BigInt(votingPower.toString()) === 0n ? 'No voting power' :
                (proposalState !== undefined && Number(proposalState) !== 1) ? `Proposal is ${PROPOSAL_STATES[Number(proposalState)]}, must be Active` :
                'Cast your vote'
              }
            >
              {isVoting ? '⏳ Voting...' : '🗳️ Cast Vote'}
            </button>
            {!hasDelegated && (
              <div className="p-2 bg-red-500/10 rounded border border-red-500/30 text-xs text-red-400 mt-2">
                ⚠️ <strong>You must delegate your voting power first</strong>
                <div className="mt-1 text-gray-400">
                  Click the "✓ Delegate to Self" button in the Delegation section above.
                </div>
              </div>
            )}
            {hasDelegated && (!tokenBalance || BigInt(tokenBalance.toString()) === 0n) && (
              <div className="p-2 bg-red-500/10 rounded border border-red-500/30 text-xs text-red-400 mt-2">
                ⚠️ <strong>You have no tokens</strong>
                <div className="mt-1 text-gray-400">
                  You need tokens to vote. Your token balance is 0.
                </div>
              </div>
            )}
            {hasDelegated && tokenBalance && BigInt(tokenBalance.toString()) > 0n && (!votingPower || BigInt(votingPower.toString()) === 0n) && (
              <div className="p-2 bg-yellow-500/10 rounded border border-yellow-500/30 text-xs text-yellow-400 mt-2">
                ⚠️ <strong>Voting power is 0</strong>
                <div className="mt-1 text-gray-400">
                  You have tokens but your voting power is 0. This might be because:
                  <ul className="list-disc list-inside mt-1 ml-2">
                    <li>You need to delegate again (try clicking "Delegate to Self" again)</li>
                    <li>The delegation checkpoint hasn't been created yet (wait a block)</li>
                  </ul>
                </div>
              </div>
            )}
            {proposalState !== undefined && Number(proposalState) !== 1 && proposalId && (
              <div className="p-2 bg-orange-500/10 rounded border border-orange-500/30 text-xs text-orange-400 mt-2">
                ⚠️ <strong>Proposal must be "Active" to vote</strong>
                <div className="mt-1 text-gray-400">
                  Current state: <strong>{PROPOSAL_STATES[Number(proposalState)]}</strong>
                  {Number(proposalState) === 0 && (
                    <div className="mt-1">
                      ⏳ Wait for the voting delay ({votingDelay?.toString() || '?'} blocks) to pass after proposal creation.
                      <br />
                      The proposal will automatically become "Active" after the delay.
                    </div>
                  )}
                </div>
              </div>
            )}
            {voteSuccess && (
              <div className="p-3 bg-cyber-green/10 rounded border border-cyber-green/30 text-center">
                <div className="text-cyber-green font-bold">✓ Vote Cast Successfully!</div>
              </div>
            )}
            {voteError && (
              <div className="p-3 bg-red-500/10 rounded border border-red-500/30 text-center">
                <div className="text-red-400 font-bold">✗ Vote Failed</div>
                <div className="text-xs text-red-300 mt-1">
                  {voteError.message || 'Transaction reverted. Check console for details.'}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Common causes: Proposal not Active, already voted, or no voting power
                </div>
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <div>💡 You can vote on your own proposals! Just select your proposal from the list above.</div>
              {proposalState !== undefined && Number(proposalState) === 0 && (
                <div className="text-yellow-400 mt-2">
                  📌 <strong>Proposal is Pending</strong> - Wait {votingDelay?.toString() || '?'} blocks after creation for it to become Active.
                  <br />
                  You can check the proposal state above. Once it shows "Active" (green), you can vote.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Execute */}
        <div className="cyber-card p-6">
          <h3 className="text-xl font-bold text-cyber-pink mb-4">⚡ Execute</h3>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Execute a passed proposal. Select a proposal from "My Proposals" above to auto-fill.
            </p>
            
            {/* Current Selection */}
            <div className="p-3 bg-cyber-dark/50 rounded border border-cyber-pink/30 space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400">Current Selection:</div>
                <button
                  onClick={() => refetchProposalState()}
                  disabled={!proposalId}
                  className="text-xs px-2 py-1 bg-cyber-pink/20 text-cyber-pink rounded hover:bg-cyber-pink/30 border border-cyber-pink/30 disabled:opacity-50"
                >
                  🔄 Refresh State
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1 text-sm">
                <div>
                  <span className="text-gray-500">Proposal ID: </span>
                  <span className={proposalId ? 'text-cyber-pink font-mono' : 'text-red-400'}>
                    {proposalId ? `#${proposalId.slice(0, 20)}...` : 'Not selected'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Description: </span>
                  <span className={proposalDescription ? 'text-white' : 'text-red-400'}>
                    {proposalDescription || 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Fee: </span>
                  <span className={proposalFee ? 'text-cyber-yellow' : 'text-red-400'}>
                    {proposalFee ? `${Number(proposalFee) / 100}% (${proposalFee} bps)` : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">State: </span>
                  <span className={
                    proposalState === undefined ? 'text-gray-400' :
                    Number(proposalState) === 4 ? 'text-cyber-green font-bold' :
                    Number(proposalState) === 7 ? 'text-cyber-cyan' :
                    'text-yellow-400'
                  }>
                    {proposalState !== undefined ? PROPOSAL_STATES[Number(proposalState)] : 'Select a proposal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {proposalState !== undefined && Number(proposalState) === 4 && (
              <div className="p-3 bg-cyber-green/10 rounded border border-cyber-green/30">
                <div className="text-cyber-green font-bold">✓ Proposal Succeeded - Ready to Execute!</div>
              </div>
            )}
            {proposalState !== undefined && Number(proposalState) === 7 && (
              <div className="p-3 bg-cyber-cyan/10 rounded border border-cyber-cyan/30">
                <div className="text-cyber-cyan font-bold">✓ Already Executed</div>
              </div>
            )}
            {proposalState !== undefined && Number(proposalState) === 1 && (
              <div className="p-3 bg-yellow-500/10 rounded border border-yellow-500/30">
                <div className="text-yellow-400 text-sm font-bold">
                  ⏳ Voting in Progress - Cannot Execute Yet
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  La proposition est en cours de vote. Vous devez attendre:
                  <ol className="list-decimal list-inside mt-1 ml-2">
                    <li>Que la periode de vote se termine (0 blocks remaining)</li>
                    <li>Que l'etat passe a "Succeeded"</li>
                  </ol>
                </div>
                {proposalDeadline && blockNumber && (
                  <div className="text-xs text-cyber-cyan mt-2">
                    Blocs restants: {Number(proposalDeadline) - Number(blockNumber) > 0 
                      ? `${Number(proposalDeadline) - Number(blockNumber)} blocks`
                      : 'Terminé - Cliquez Refresh State'}
                  </div>
                )}
              </div>
            )}
            {proposalState !== undefined && Number(proposalState) === 0 && (
              <div className="p-3 bg-orange-500/10 rounded border border-orange-500/30">
                <div className="text-orange-400 text-sm">
                  ⏳ Proposal is Pending - Waiting for voting to start
                </div>
              </div>
            )}
            {proposalState !== undefined && Number(proposalState) === 3 && (
              <div className="p-3 bg-red-500/10 rounded border border-red-500/30">
                <div className="text-red-400 text-sm">
                  ❌ Proposal was Defeated - Cannot execute
                </div>
              </div>
            )}
            {(!proposalId || !proposalDescription || !proposalFee) && (
              <div className="p-3 bg-red-500/10 rounded border border-red-500/30">
                <div className="text-red-400 text-sm">
                  ⚠️ Missing data: {!proposalId && 'Proposal ID '}{!proposalDescription && 'Description '}{!proposalFee && 'Fee'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Click on a proposal in "My Proposals" to auto-fill all fields.
                </div>
              </div>
            )}

            <button
              onClick={handleExecute}
              disabled={!proposalId || !proposalDescription || !proposalFee || isExecuting || Number(proposalState) !== 4}
              className="cyber-btn w-full disabled:opacity-50"
            >
              {isExecuting ? '⏳ Executing...' : '⚡ Execute Proposal'}
            </button>
            
            {executeSuccess && (
              <div className="p-3 bg-cyber-green/10 rounded border border-cyber-green/30 text-center">
                <div className="text-cyber-green font-bold">✓ Proposal Executed Successfully!</div>
                <div className="text-sm text-gray-400 mt-1">The withdrawal fee has been updated.</div>
              </div>
            )}
            {executeError && (
              <div className="p-3 bg-red-500/10 rounded border border-red-500/30 text-center">
                <div className="text-red-400 font-bold">✗ Execution Failed</div>
                <div className="text-xs text-red-300 mt-1">
                  {executeError.message || 'Transaction reverted'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="cyber-card p-4 text-sm">
        <h4 className="font-bold text-gray-400 mb-2">ℹ️ Governor Parameters</h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div><span className="text-cyber-purple">Voting Delay:</span> {votingDelay?.toString()} blocks</div>
          <div><span className="text-cyber-cyan">Voting Period:</span> {votingPeriod?.toString()} blocks</div>
        </div>
      </div>
    </div>
  );
}
