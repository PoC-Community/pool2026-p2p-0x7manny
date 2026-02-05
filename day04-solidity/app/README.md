# 🎮 PoC DeFi App - Frontend

A **cyberpunk-themed** frontend to test your smart contracts from the Blockchain Discovery Pool.

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Configure contracts

After deploying your Token, Vault, and Governor contracts on Sepolia (or Anvil locally), configure your contract addresses:

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your deployed addresses:
```env
NEXT_PUBLIC_TOKEN_ADDRESS=0x...your_token_address...
NEXT_PUBLIC_VAULT_ADDRESS=0x...your_vault_address...
NEXT_PUBLIC_GOVERNOR_ADDRESS=0x...your_governor_address...
```

> ⚠️ **Important**: Never commit `.env.local` to git. It contains your specific configuration.

### 3. Configure WalletConnect (optional)

Get a free project ID at [WalletConnect Cloud](https://cloud.walletconnect.com) and update `lib/wagmi.ts`:

```typescript
projectId: 'YOUR_PROJECT_ID',
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Structure

```
app/
├── app/
│   ├── layout.tsx      # Main layout with Web3 providers
│   ├── page.tsx        # Home page with module navigation
│   └── globals.css     # Cyberpunk styles
├── components/
│   ├── VaultModule.tsx       # Day 03 - Vault interactions
│   ├── GovernanceModule.tsx  # Day 04 - DAO governance (unlocked)
│   └── SwapModule.tsx        # Day 05 - Oracle swap (locked)
├── lib/
│   ├── contracts.ts    # ABIs and addresses
│   └── wagmi.ts        # Web3 configuration
└── package.json
```

---

## 🔓 Module Unlock System

| Day | Module | Status |
|-----|--------|--------|
| Day 03 | Vault | 🔓 Unlocked |
| Day 04 | Governance | 🔓 Unlocked |
| Day 05 | Swap | 🔒 Locked |

Each day's app folder comes with the appropriate modules unlocked.

---

## ⚠️ Required Function Names

Your contracts **must** implement these exact function signatures for the app to work:

### Day 03: Vault

| Function | Signature |
|----------|-----------|
| `totalAssets` | `totalAssets() → uint256` |
| `totalShares` | `totalShares() → uint256` |
| `sharesOf` | `sharesOf(address) → uint256` |
| `assetsOf` | `assetsOf(address) → uint256` |
| `previewDeposit` | `previewDeposit(uint256) → uint256` |
| `previewWithdraw` | `previewWithdraw(uint256) → uint256` |
| `currentRatio` | `currentRatio() → uint256` |
| `deposit` | `deposit(uint256) → uint256` |
| `withdraw` | `withdraw(uint256) → uint256` |

### Day 04: Governance

| Function | Signature |
|----------|-----------|
| `delegate` | `delegate(address)` |
| `getVotes` | `getVotes(address) → uint256` |
| `propose` | `propose(address[], uint256[], bytes[], string) → uint256` |
| `castVote` | `castVote(uint256, uint8) → uint256` |
| `execute` | `execute(address[], uint256[], bytes[], bytes32) → uint256` |
| `state` | `state(uint256) → uint8` |

### Day 05: Swap

| Function | Signature |
|----------|-----------|
| `getCurrentPrice` | `getCurrentPrice() → (uint256, bool, uint256)` |
| `previewSwap` | `previewSwap(uint256) → (uint256, uint256)` |
| `swap` | `swap() payable → uint256` |
| `getTokenLiquidity` | `getTokenLiquidity() → uint256` |
| `getMaxSwappableETH` | `getMaxSwappableETH() → uint256` |
| `paused` | `paused() → bool` |

---

## 🛠️ Testing Locally with Anvil

1. Start Anvil (local blockchain):
```bash
anvil
```

2. Deploy your contracts to localhost:
```bash
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

3. Copy the deployed addresses to `.env.local`:
```bash
cp .env.example .env.local
# Edit .env.local with your deployed addresses
```

4. Switch MetaMask to "Localhost 8545" network
5. Import an Anvil test account into MetaMask (use one of the private keys displayed by Anvil)

---

## 🎨 Cyberpunk Theme

The app uses a custom cyberpunk theme with:
- Neon purple, cyan, pink, and green accents
- Dark background with grid pattern
- Glowing effects and animations
- Futuristic card designs

---

## 📚 Resources

- [RainbowKit Docs](https://www.rainbowkit.com/docs)
- [wagmi Docs](https://wagmi.sh)
- [viem Docs](https://viem.sh)

---

_PoC Innovation - Blockchain Discovery Pool_
