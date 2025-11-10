# 🚀 План разработки - Часть 3

[← Назад к части 2](./DEVELOPMENT_PLAN_PART2.md)

## Iteration 5: Mock Crypto Wallet

**Длительность:** 5-6 дней
**Backend required:** ✅

### Цель
Добавить mock crypto wallet для тестирования UI без реального blockchain.

### Задачи

#### 1. Mock Wallet Provider

**File:** `src/wallet/mockWallet.ts`
```typescript
export interface WalletAccount {
  address: string;
  network: string;
  chainId: number;
}

export interface Transaction {
  hash: string;
  status: 'pending' | 'success' | 'failed';
  from: string;
  to: string;
  value: string;
  blockNumber?: number;
}

export class MockWalletProvider {
  private connected: boolean = false;
  private account: WalletAccount | null = null;

  async connect(): Promise<WalletAccount> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.account = {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      network: 'ethereum',
      chainId: 11155111, // Sepolia testnet
    };

    this.connected = true;
    return this.account;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.account = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getAccount(): WalletAccount | null {
    return this.account;
  }

  async sendTransaction(to: string, amount: string): Promise<Transaction> {
    if (!this.connected || !this.account) {
      throw new Error('Wallet not connected');
    }

    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const tx: Transaction = {
      hash: '0x' + Math.random().toString(16).substring(2).padEnd(64, '0'),
      status: 'success',
      from: this.account.address,
      to,
      value: amount,
      blockNumber: Math.floor(Math.random() * 1000000) + 5000000,
    };

    return tx;
  }

  async getBalance(): Promise<string> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    // Return mock balance (10 ETH)
    return '10.0';
  }
}
```

#### 2. Payment Method Selector

**File:** `src/components/Payment/PaymentMethodSelector.tsx`
```typescript
import { useState } from 'react';
import { CryptoWalletConnect } from './CryptoWalletConnect';
import './PaymentMethodSelector.css';

type PaymentMethod = 'card' | 'crypto';

export function PaymentMethodSelector() {
  const [method, setMethod] = useState<PaymentMethod>('card');

  return (
    <div className="payment-method-selector">
      <h2>Select Payment Method</h2>

      <div className="payment-methods">
        <button
          className={`method-btn ${method === 'card' ? 'active' : ''}`}
          onClick={() => setMethod('card')}
          data-testid="payment-method-card"
        >
          💳 Credit Card
        </button>

        <button
          className={`method-btn ${method === 'crypto' ? 'active' : ''}`}
          onClick={() => setMethod('crypto')}
          data-testid="payment-method-crypto"
        >
          🪙 Crypto Wallet
        </button>
      </div>

      <div className="payment-content">
        {method === 'card' && (
          <div className="card-payment">
            <p>Credit card payment coming soon...</p>
          </div>
        )}

        {method === 'crypto' && <CryptoWalletConnect />}
      </div>
    </div>
  );
}
```

#### 3. Crypto Wallet Connect Component

**File:** `src/components/Payment/CryptoWalletConnect.tsx`
```typescript
import { useState } from 'react';
import { MockWalletProvider } from '../../wallet/mockWallet';
import { useCartStore } from '../../store/cartStore';
import { features } from '../../config/features';
import './CryptoWalletConnect.css';

export function CryptoWalletConnect() {
  const [wallet, setWallet] = useState<MockWalletProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const cartMandate = useCartStore(state => state.cartMandate);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const provider = new MockWalletProvider();
      const acc = await provider.connect();
      const bal = await provider.getBalance();

      setWallet(provider);
      setAccount(acc.address);
      setBalance(bal);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!wallet || !cartMandate) return;

    setLoading(true);
    try {
      const amount = cartMandate.contents.payment_request.details.total.amount.value.toString();
      const merchantAddress = '0x1234567890123456789012345678901234567890'; // Mock merchant

      const tx = await wallet.sendTransaction(merchantAddress, amount);

      setTxHash(tx.hash);

      // TODO: Send PaymentMandate to backend
      // await completePayment(tx.hash);

      alert('Payment successful!');
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="wallet-connect">
        <p>Connect your crypto wallet to pay with cryptocurrency</p>
        <button
          className="connect-btn"
          onClick={handleConnect}
          disabled={loading}
          data-testid="connect-wallet"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {features.useMockWallet && (
          <p className="mock-notice">🧪 Using mock wallet for testing</p>
        )}
      </div>
    );
  }

  return (
    <div className="wallet-connected">
      <div className="wallet-info">
        <h3>Connected Wallet</h3>
        <div className="address" data-testid="wallet-address">
          {account.substring(0, 6)}...{account.substring(account.length - 4)}
        </div>
        <div className="balance">Balance: {balance} ETH (Sepolia)</div>
      </div>

      {cartMandate && (
        <div className="payment-details">
          <h3>Payment Summary</h3>
          <div className="amount">
            Amount: {cartMandate.contents.payment_request.details.total.amount.value}{' '}
            {cartMandate.contents.payment_request.details.total.amount.currency}
          </div>
        </div>
      )}

      {!txHash ? (
        <button
          className="pay-btn"
          onClick={handlePay}
          disabled={loading}
          data-testid="pay-button"
        >
          {loading ? 'Processing...' : 'Pay with Crypto'}
        </button>
      ) : (
        <div className="payment-success">
          <h3>✅ Payment Successful!</h3>
          <div className="tx-hash" data-testid="tx-hash">
            Transaction: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Etherscan
          </a>
        </div>
      )}
    </div>
  );
}
```

#### 4. Backend Mock Verification

**File:** `samples/python/src/roles/merchant_payment_processor_agent/tools.py`
```python
async def verify_crypto_payment_mock(payment_mandate: PaymentMandate):
    """Mock crypto payment verification for testing."""
    details = payment_mandate.payment_mandate_contents.payment_response.details

    if details.get('method_name') != 'CRYPTO_WALLET':
        raise ValueError('Not a crypto payment')

    tx_hash = details.get('transaction_hash')
    if not tx_hash:
        raise ValueError('Transaction hash missing')

    # Mock verification
    if not tx_hash.startswith('0x'):
        raise ValueError('Invalid transaction hash format')

    # Simulate verification delay
    import asyncio
    await asyncio.sleep(1)

    return {
        'status': 'SUCCESS',
        'tx_hash': tx_hash,
        'network': 'sepolia',
        'verified': True,
    }
```

### Как тестировать

#### Regression Testing
```bash
# 1. Previous features still work
VITE_FEATURE_MOCK_WALLET=true npm run dev

# 2. Run regression tests
npx playwright test tests/e2e/checkout-flow.spec.ts

# Card payment option should still be visible
```

#### New Feature Testing

**File:** `tests/e2e/mock-crypto-payment.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Mock Crypto Payment', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Telegram environment
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initDataUnsafe: { user: { id: 123, first_name: 'Test' } },
          expand: () => {},
          ready: () => {},
        },
      };
    });
  });

  test('should complete mock crypto payment flow', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Add product to cart (assuming products are displayed)
    // This part depends on Iteration 4 being complete
    await page.click('[data-testid="product-0"] [data-testid="add-to-cart"]');
    await page.click('[data-testid="checkout-button"]');

    // Navigate through checkout
    await page.click('text=Continue to Shipping');

    // Fill shipping form
    await page.fill('[name="addressLine"]', '123 Test St');
    await page.fill('[name="city"]', 'San Francisco');
    await page.fill('[name="postalCode"]', '94102');
    await page.click('[data-testid="continue-to-payment"]');

    // Select crypto payment
    await page.click('[data-testid="payment-method-crypto"]');

    // Connect mock wallet
    await page.click('[data-testid="connect-wallet"]');

    // Wait for connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible({ timeout: 3000 });

    // Verify wallet address is displayed
    const address = await page.locator('[data-testid="wallet-address"]').textContent();
    expect(address).toMatch(/0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}/);

    // Pay with crypto
    await page.click('[data-testid="pay-button"]');

    // Wait for transaction
    await expect(page.locator('text=Payment Successful')).toBeVisible({ timeout: 5000 });

    // Verify transaction hash is shown
    await expect(page.locator('[data-testid="tx-hash"]')).toBeVisible();
    const txHash = await page.locator('[data-testid="tx-hash"]').textContent();
    expect(txHash).toContain('0x');

    // Verify Etherscan link
    const etherscanLink = page.locator('a[href*="etherscan.io"]');
    await expect(etherscanLink).toBeVisible();
  });

  test('should show mock notice when using mock wallet', async ({ page }) => {
    await page.goto('http://localhost:5173/checkout?step=payment');

    await page.click('[data-testid="payment-method-crypto"]');

    await expect(page.locator('text=Using mock wallet for testing')).toBeVisible();
  });

  test('should handle wallet connection errors', async ({ page }) => {
    // Mock wallet error
    await page.addInitScript(() => {
      (window as any).MockWalletProvider = class {
        async connect() {
          throw new Error('User rejected connection');
        }
      };
    });

    await page.goto('http://localhost:5173/checkout?step=payment');
    await page.click('[data-testid="payment-method-crypto"]');
    await page.click('[data-testid="connect-wallet"]');

    // Should show error
    const dialog = await page.waitForEvent('dialog');
    expect(dialog.message()).toContain('Failed to connect wallet');
    await dialog.accept();
  });
});
```

**Manual Testing Checklist:**
```
□ Open Telegram Mini App
□ Add product to cart
□ Go through checkout to payment step
□ Select "Crypto Wallet" payment method
□ See "Using mock wallet" notice
□ Click "Connect Wallet"
□ Wallet connects in ~1 second
□ Mock address displayed (0x742d35Cc...)
□ Mock balance shown (10.0 ETH)
□ Click "Pay with Crypto"
□ Transaction completes in ~2 seconds
□ Success message shown
□ Transaction hash displayed
□ Etherscan link present (but won't work - it's mock)
□ Can go back and select Card payment instead
```

### Критерии успеха
- [ ] Mock crypto payment flow работает end-to-end
- [ ] UI показывает wallet address корректно
- [ ] UI показывает mock transaction hash
- [ ] Mock wallet подключается быстро (<2 sec)
- [ ] Transaction симулируется реалистично
- [ ] Previous features не сломались (can still select card)
- [ ] E2E тесты проходят
- [ ] Mock notice виден пользователю

### Rollback Strategy

**Option 1: Feature Flag**
```bash
# .env.local
VITE_FEATURE_CRYPTO_WALLET=false
```

**Option 2: Hide crypto option in UI**
```typescript
// src/components/Payment/PaymentMethodSelector.tsx
export function PaymentMethodSelector() {
  const showCrypto = features.useCryptoPayment;

  return (
    <div>
      <button>💳 Credit Card</button>
      {showCrypto && <button>🪙 Crypto Wallet</button>}
    </div>
  );
}
```

---

## Iteration 6: Real Blockchain Integration

**Длительность:** 7-8 дней
**Backend required:** ✅

### Цель
Заменить mock wallet на реальный Wagmi + WalletConnect для Sepolia testnet.

### Задачи

#### 1. Install Wagmi Dependencies

```bash
npm install wagmi viem@2.x @tanstack/react-query
npm install @web3modal/wagmi @web3modal/ethereum
```

#### 2. Wagmi Configuration

**File:** `src/wallet/wagmiConfig.ts`
```typescript
import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is required');
}

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(`https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`),
  },
  connectors: [
    walletConnect({
      projectId,
      metadata: {
        name: 'Shopping Assistant',
        description: 'Shop with crypto payments',
        url: 'https://your-app.com',
        icons: ['https://your-app.com/icon.png'],
      },
    }),
    injected(),
    coinbaseWallet({
      appName: 'Shopping Assistant',
    }),
  ],
});
```

#### 3. Wagmi Provider Setup

**File:** `src/App.tsx`
```typescript
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wallet/wagmiConfig';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* Your app */}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

#### 4. Real Wallet Hook

**File:** `src/wallet/useRealWallet.ts`
```typescript
import { useAccount, useConnect, useDisconnect, useSendTransaction, useBalance } from 'wagmi';
import { parseEther } from 'viem';
import { sepolia } from 'wagmi/chains';

export function useRealWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransaction, isPending: isSending, data: txHash } = useSendTransaction();
  const { data: balance } = useBalance({ address, chainId: sepolia.id });

  const pay = async (to: string, amount: string) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (chain?.id !== sepolia.id) {
      throw new Error('Please switch to Sepolia network');
    }

    const hash = await sendTransaction({
      to: to as `0x${string}`,
      value: parseEther(amount),
    });

    return { hash };
  };

  const formattedBalance = balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0 ETH';

  return {
    address,
    isConnected,
    isConnecting,
    isSending,
    balance: formattedBalance,
    connectors,
    connect,
    disconnect,
    pay,
    txHash,
    chainId: chain?.id,
  };
}
```

#### 5. Real Crypto Payment Component

**File:** `src/components/Payment/RealCryptoWallet.tsx`
```typescript
import { useState, useEffect } from 'react';
import { useRealWallet } from '../../wallet/useRealWallet';
import { useCartStore } from '../../store/cartStore';
import { sepolia } from 'wagmi/chains';
import './CryptoWallet.css';

export function RealCryptoWallet() {
  const {
    address,
    isConnected,
    isConnecting,
    isSending,
    balance,
    connectors,
    connect,
    pay,
    txHash,
    chainId,
  } = useRealWallet();

  const [paymentComplete, setPaymentComplete] = useState(false);
  const cartMandate = useCartStore(state => state.cartMandate);

  useEffect(() => {
    if (txHash && !paymentComplete) {
      setPaymentComplete(true);
      // TODO: Send PaymentMandate to backend with txHash
    }
  }, [txHash, paymentComplete]);

  const handlePay = async () => {
    if (!cartMandate) return;

    try {
      const amount = cartMandate.contents.payment_request.details.total.amount.value.toString();
      const merchantAddress = '0x1234567890123456789012345678901234567890'; // Replace with real merchant

      await pay(merchantAddress, amount);
    } catch (error: any) {
      console.error('Payment failed:', error);
      alert(error.message || 'Payment failed');
    }
  };

  if (!isConnected) {
    return (
      <div className="wallet-connect">
        <h3>Connect Your Wallet</h3>
        <p>Choose a wallet to connect:</p>

        <div className="connector-list">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
              disabled={isConnecting}
              className="connector-btn"
              data-testid={`connector-${connector.id}`}
            >
              {connector.name}
            </button>
          ))}
        </div>

        <p className="network-notice">
          ⚠️ Make sure you're on Sepolia testnet
        </p>
      </div>
    );
  }

  if (chainId !== sepolia.id) {
    return (
      <div className="wrong-network">
        <h3>⚠️ Wrong Network</h3>
        <p>Please switch to Sepolia testnet in your wallet</p>
        <p>Current chain ID: {chainId}</p>
      </div>
    );
  }

  return (
    <div className="wallet-connected">
      <div className="wallet-info">
        <h3>Connected Wallet</h3>
        <div className="address" data-testid="wallet-address">
          {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
        </div>
        <div className="balance">Balance: {balance}</div>
        <div className="network">Network: Sepolia Testnet</div>
      </div>

      {cartMandate && (
        <div className="payment-details">
          <h3>Payment Summary</h3>
          <div className="amount">
            Amount: {cartMandate.contents.payment_request.details.total.amount.value}{' '}
            {cartMandate.contents.payment_request.details.total.amount.currency}
          </div>
        </div>
      )}

      {!paymentComplete ? (
        <button
          className="pay-btn"
          onClick={handlePay}
          disabled={isSending}
          data-testid="pay-button"
        >
          {isSending ? 'Confirming in wallet...' : 'Pay with Crypto'}
        </button>
      ) : (
        <div className="payment-success">
          <h3>✅ Payment Successful!</h3>
          <div className="tx-hash" data-testid="tx-hash">
            Transaction: {txHash?.substring(0, 10)}...{txHash?.substring(txHash.length - 8)}
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Etherscan →
          </a>
        </div>
      )}
    </div>
  );
}
```

#### 6. Wallet Switcher (Mock/Real)

**File:** `src/components/Payment/CryptoWalletConnect.tsx`
```typescript
import { features } from '../../config/features';
import { MockWalletProvider } from './MockCryptoWallet';
import { RealCryptoWallet } from './RealCryptoWallet';

export function CryptoWalletConnect() {
  if (features.useMockWallet) {
    return <MockWalletProvider />;
  }

  return <RealCryptoWallet />;
}
```

#### 7. Backend: Real Blockchain Verification

**File:** `samples/python/src/roles/merchant_payment_processor_agent/tools.py`
```python
from web3 import Web3
from web3.exceptions import TransactionNotFound
import os

async def verify_crypto_payment_real(payment_mandate: PaymentMandate):
    """Verify crypto payment on Sepolia testnet."""
    details = payment_mandate.payment_mandate_contents.payment_response.details

    if details.get('method_name') != 'CRYPTO_WALLET':
        raise ValueError('Not a crypto payment')

    tx_hash = details.get('transaction_hash')
    wallet_address = details.get('wallet_address')
    network = details.get('network', 'ethereum')
    chain_id = details.get('chain_id', 11155111)  # Sepolia

    if chain_id != 11155111:
        raise ValueError(f'Unsupported network. Expected Sepolia (11155111), got {chain_id}')

    # Connect to Sepolia
    infura_key = os.getenv('INFURA_API_KEY')
    w3 = Web3(Web3.HTTPProvider(f'https://sepolia.infura.io/v3/{infura_key}'))

    if not w3.is_connected():
        raise ValueError('Failed to connect to Sepolia network')

    # Get transaction receipt
    try:
        tx_receipt = w3.eth.get_transaction_receipt(tx_hash)
    except TransactionNotFound:
        raise ValueError(f'Transaction not found: {tx_hash}')

    # Verify transaction succeeded
    if tx_receipt['status'] != 1:
        raise ValueError('Transaction failed on blockchain')

    # Get transaction details
    tx = w3.eth.get_transaction(tx_hash)

    # Verify sender
    if tx['from'].lower() != wallet_address.lower():
        raise ValueError('Transaction sender does not match wallet address')

    # Verify amount
    expected_amount_wei = w3.to_wei(
        payment_mandate.payment_mandate_contents.payment_details_total.amount.value,
        'ether'
    )

    if tx['value'] != expected_amount_wei:
        raise ValueError(f'Amount mismatch. Expected {expected_amount_wei}, got {tx["value"]}')

    # Verify recipient (merchant address)
    # TODO: Check against registered merchant address

    return {
        'status': 'SUCCESS',
        'tx_hash': tx_hash,
        'block_number': tx_receipt['blockNumber'],
        'gas_used': tx_receipt['gasUsed'],
        'network': 'sepolia',
        'verified': True,
    }
```

### Как тестировать

#### Regression Testing
```bash
# 1. Mock wallet still works
VITE_FEATURE_MOCK_WALLET=true npm run dev

# 2. Run all previous E2E tests
npx playwright test

# Should all pass ✅
```

#### Manual Testing (Real Sepolia)

**Prerequisites:**
1. Install MetaMask browser extension
2. Create/import test wallet
3. Add Sepolia network to MetaMask
4. Get test ETH from faucet: https://sepoliafaucet.com/
5. Get WalletConnect Project ID: https://cloud.walletconnect.com/
6. Get Infura API Key: https://infura.io/

**Environment Variables:**
```bash
# .env.local
VITE_FEATURE_MOCK_WALLET=false
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_INFURA_API_KEY=your_infura_key
```

**Test Steps:**
```
1. Open Telegram Mini App (via ngrok)
2. Add product to cart
3. Go through checkout
4. Select "Crypto Wallet" payment
5. Click connector (MetaMask / WalletConnect)
6. Approve connection in wallet
7. Verify:
   - Real wallet address shown
   - Real balance shown
   - Network = Sepolia
8. Click "Pay with Crypto"
9. Approve transaction in wallet
10. Wait for confirmation (15-30 seconds)
11. Verify:
    - Success message shown
    - Real tx hash displayed
    - Etherscan link works
    - Can see transaction on Etherscan
12. Backend verifies transaction ✅
```

#### Integration Tests

**File:** `tests/integration/blockchain-verification.test.ts`
```typescript
import { test, expect } from 'vitest';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

test.skip('Real blockchain verification', async () => {
  // This test requires actual Sepolia transaction
  const client = createPublicClient({
    chain: sepolia,
    transport: http(`https://sepolia.infura.io/v3/${process.env.VITE_INFURA_API_KEY}`),
  });

  // Replace with actual tx hash from manual test
  const txHash = '0x...';

  const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });

  expect(receipt.status).toBe('success');
  expect(receipt.blockNumber).toBeGreaterThan(0);
});
```

### Критерии успеха
- [ ] Mock wallet mode всё ещё работает (regression)
- [ ] Real wallet подключается через WalletConnect
- [ ] MetaMask integration работает
- [ ] Injected wallet (browser extension) работает
- [ ] Network validation работает (reject wrong network)
- [ ] Транзакция отправляется на Sepolia
- [ ] Backend верифицирует транзакцию on-chain
- [ ] Etherscan link работает и показывает реальную транзакцию
- [ ] Error handling для всех edge cases
- [ ] E2E тесты проходят в mock mode
- [ ] Manual testing на Sepolia успешен

### Rollback Strategy

**Instant Rollback:**
```bash
# .env.local
VITE_FEATURE_MOCK_WALLET=true

# Restart
npm run dev
```

**Graceful Degradation:**
```typescript
// src/components/Payment/CryptoWalletConnect.tsx
export function CryptoWalletConnect() {
  const [useMock, setUseMock] = useState(features.useMockWallet);

  return (
    <div>
      {/* Debug toggle */}
      <button onClick={() => setUseMock(!useMock)}>
        {useMock ? 'Try Real Wallet' : 'Use Test Mode'}
      </button>

      {useMock ? <MockWalletProvider /> : <RealCryptoWallet />}
    </div>
  );
}
```

---

*Continued in DEVELOPMENT_PLAN_PART4.md...*
