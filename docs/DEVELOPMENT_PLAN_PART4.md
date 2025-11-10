# 🚀 План разработки - Часть 4 (Final)

[← Назад к части 3](./DEVELOPMENT_PLAN_PART3.md)

## Iteration 7: E2E Tests & Polish

**Длительность:** 5-6 дней
**Backend required:** ✅

### Цель
Comprehensive testing suite + production readiness.

### Задачи

#### 1. Complete E2E Test Suite

**File:** `tests/e2e/complete-flow.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete Shopping Flow - All Features', () => {
  test('Happy Path: Search → Add → Checkout → Crypto Payment (Mock)', async ({ page }) => {
    // Mock Telegram environment
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initDataUnsafe: { user: { id: 123, first_name: 'TestUser' } },
          expand: () => {},
          ready: () => {},
        },
      };
    });

    await page.goto('http://localhost:5173');

    // 1. App loads
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();
    await expect(page.locator('text=Welcome, TestUser')).toBeVisible();

    // 2. Search products
    await page.fill('[data-testid="chat-input"]', 'I want to buy a coffee maker');
    await page.click('[data-testid="send-button"]');

    // 3. Products appear
    await expect(page.locator('[data-testid="product-list"]')).toBeVisible({ timeout: 10000 });
    const productCount = await page.locator('[data-testid^="product-"]').count();
    expect(productCount).toBeGreaterThan(0);

    // 4. Add to cart
    await page.click('[data-testid="product-0"] [data-testid="add-to-cart"]');
    await expect(page.locator('text=✓ Added')).toBeVisible();

    // 5. View cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();

    // 6. Checkout
    await page.click('[data-testid="checkout-button"]');
    await page.click('text=Continue to Shipping');

    // 7. Fill shipping address
    await page.fill('[name="addressLine"]', '123 Test Street');
    await page.fill('[name="city"]', 'San Francisco');
    await page.fill('[name="postalCode"]', '94102');
    await page.selectOption('[name="country"]', 'US');
    await page.click('[data-testid="continue-to-payment"]');

    // 8. Select crypto payment
    await expect(page.locator('text=Select Payment Method')).toBeVisible();
    await page.click('[data-testid="payment-method-crypto"]');

    // 9. Connect mock wallet
    await page.click('[data-testid="connect-wallet"]');
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible({ timeout: 3000 });

    // 10. Complete payment
    await page.click('[data-testid="pay-button"]');
    await expect(page.locator('text=Payment Successful')).toBeVisible({ timeout: 5000 });

    // 11. Verify receipt
    await expect(page.locator('[data-testid="tx-hash"]')).toBeVisible();
    await expect(page.locator('a[href*="etherscan.io"]')).toBeVisible();
  });

  test('Error Handling: Network timeout', async ({ page }) => {
    await page.route('**/a2a/**', route => route.abort());

    await page.goto('http://localhost:5173');
    await page.fill('[data-testid="chat-input"]', 'test');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('text=Network error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('Edge Case: Empty cart checkout attempt', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('[data-testid="checkout-button"]');

    await expect(page.locator('text=Your cart is empty')).toBeVisible();
  });

  test('Edge Case: Form validation', async ({ page }) => {
    await page.goto('http://localhost:5173/checkout?step=shipping');

    // Try empty form
    await page.click('[data-testid="continue-to-payment"]');

    await expect(page.locator('text=Address is required')).toBeVisible();
    await expect(page.locator('text=City is required')).toBeVisible();
    await expect(page.locator('text=Postal code is required')).toBeVisible();
  });

  test('Accessibility: Keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focused);
  });
});
```

#### 2. Visual Regression Tests

**File:** `tests/visual/screenshots.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('Homepage snapshot', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('Chat interface snapshot', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.locator('[data-testid="chat-interface"]')).toHaveScreenshot('chat.png');
  });

  test('Product list snapshot', async ({ page }) => {
    await page.goto('http://localhost:5173?mock=true');
    await page.fill('[data-testid="chat-input"]', 'shoes');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="product-list"]');

    await expect(page.locator('[data-testid="product-list"]')).toHaveScreenshot('products.png');
  });

  test('Checkout flow snapshots', async ({ page }) => {
    // Cart step
    await page.goto('http://localhost:5173/checkout');
    await expect(page.locator('.checkout-page')).toHaveScreenshot('checkout-cart.png');

    // Shipping step
    await page.goto('http://localhost:5173/checkout?step=shipping');
    await expect(page.locator('.checkout-page')).toHaveScreenshot('checkout-shipping.png');

    // Payment step
    await page.goto('http://localhost:5173/checkout?step=payment');
    await expect(page.locator('.checkout-page')).toHaveScreenshot('checkout-payment.png');
  });
});
```

#### 3. Performance Tests

**File:** `tests/performance/metrics.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  test('App loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="app-ready"]');
    const loadTime = Date.now() - startTime;

    console.log(`App load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('Chat message response under 2 seconds (mock)', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const startTime = Date.now();
    await page.fill('[data-testid="chat-input"]', 'hello');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="message-agent"]');
    const responseTime = Date.now() - startTime;

    console.log(`Chat response time: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(2000);
  });

  test('Bundle size is reasonable', async ({ page }) => {
    const response = await page.goto('http://localhost:5173');
    const size = (await response?.body())?.length || 0;

    console.log(`Initial bundle size: ${(size / 1024).toFixed(2)} KB`);
    // Should be under 500KB
    expect(size).toBeLessThan(500 * 1024);
  });
});
```

#### 4. Error Monitoring Setup

**File:** `src/monitoring/errorTracking.ts`
```typescript
import * as Sentry from '@sentry/react';
import { features } from '../config/features';

export function initErrorTracking() {
  if (import.meta.env.MODE === 'production') {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 1.0,

      beforeSend(event) {
        // Don't send errors in mock mode
        if (features.useMockA2A || features.useMockWallet) {
          console.warn('Error (not sent to Sentry in mock mode):', event);
          return null;
        }
        return event;
      },

      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
    });
  }
}

export function logError(error: Error, context?: Record<string, any>) {
  console.error('Error:', error, context);

  if (import.meta.env.MODE === 'production') {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}
```

#### 5. Feature Flag Dashboard

**File:** `src/admin/FeatureFlagPanel.tsx`
```typescript
import { useState, useEffect } from 'react';
import { features } from '../config/features';
import './FeatureFlagPanel.css';

export function FeatureFlagPanel() {
  const [flags, setFlags] = useState({
    mockA2A: localStorage.getItem('feature_mock_a2a') === 'true',
    mockWallet: localStorage.getItem('feature_mock_wallet') === 'true',
    checkoutFlow: localStorage.getItem('feature_checkout') === 'true',
    cryptoPayment: localStorage.getItem('feature_crypto') === 'true',
  });

  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (import.meta.env.MODE === 'production') {
    return null;
  }

  const toggleFlag = (key: string) => {
    const newValue = !flags[key as keyof typeof flags];
    localStorage.setItem(`feature_${key}`, newValue.toString());
    setFlags(prev => ({ ...prev, [key]: newValue }));

    // Reload to apply changes
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className={`feature-flag-panel ${isOpen ? 'open' : ''}`}>
      <button
        className="toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        🎛️ Flags
      </button>

      {isOpen && (
        <div className="panel-content">
          <h3>Feature Flags</h3>

          {Object.entries(flags).map(([key, value]) => (
            <label key={key} className="flag-item">
              <input
                type="checkbox"
                checked={value}
                onChange={() => toggleFlag(key)}
              />
              <span className="flag-name">{key}</span>
              <span className={`flag-status ${value ? 'enabled' : 'disabled'}`}>
                {value ? '✓' : '✗'}
              </span>
            </label>
          ))}

          <div className="env-info">
            <strong>Environment:</strong> {import.meta.env.MODE}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 6. CI/CD Pipeline

**File:** `.github/workflows/test.yml`
```yaml
name: Test Suite

on:
  push:
    branches: [main, feature/**]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Setup Python (for backend)
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Start backend servers
        run: |
          cd /path/to/AP2
          bash samples/python/scenarios/a2a/human-present/cards/run.sh &
          sleep 30
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests (mock mode)
        run: npx playwright test
        env:
          VITE_FEATURE_A2A_MOCK: true
          VITE_FEATURE_MOCK_WALLET: true

      - name: Run E2E tests (real backend)
        run: npx playwright test tests/e2e/real-backend.spec.ts
        env:
          VITE_FEATURE_A2A_MOCK: false
          VITE_BACKEND_URL: http://localhost:8080

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Check bundle size
        run: |
          size=$(du -sk dist | cut -f1)
          echo "Bundle size: ${size}KB"
          if [ $size -gt 500 ]; then
            echo "Bundle size exceeds 500KB!"
            exit 1
          fi
```

#### 7. Production Build Optimization

**File:** `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          telegram: ['@telegram-apps/sdk'],
          wallet: ['wagmi', 'viem'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
```

### Как тестировать

#### Full Test Suite Run

```bash
# 1. Lint
npm run lint

# 2. Type check
npm run type-check

# 3. Unit tests
npm run test:unit

# 4. Start backend (separate terminal)
cd /path/to/AP2
bash samples/python/scenarios/a2a/human-present/cards/run.sh

# 5. E2E tests - Mock mode
VITE_FEATURE_MOCK_WALLET=true npx playwright test

# 6. E2E tests - Real backend
VITE_FEATURE_MOCK_WALLET=false npx playwright test tests/e2e/real-backend.spec.ts

# 7. Visual regression
npx playwright test tests/visual/

# 8. Performance tests
npx playwright test tests/performance/

# 9. Build
npm run build

# 10. Check bundle size
du -sh dist/
```

#### Coverage Report

```bash
npm run test:unit -- --coverage

# Open coverage report
open coverage/index.html
```

#### Lighthouse Performance Audit

```bash
npm run build
npx serve dist

# In another terminal
npx lighthouse http://localhost:3000 --view
```

### Критерии успеха

#### Tests
- [ ] All unit tests pass (100+ tests)
- [ ] All E2E tests pass in mock mode
- [ ] E2E tests pass with real backend
- [ ] Visual regression baseline created
- [ ] Performance tests pass (<3s load)
- [ ] Code coverage >80%

#### Quality
- [ ] ESLint: 0 errors, 0 warnings
- [ ] TypeScript: 0 type errors
- [ ] Bundle size <500KB (gzipped <150KB)
- [ ] Lighthouse score >90
- [ ] Accessibility score >90

#### Production Readiness
- [ ] Error monitoring configured
- [ ] Feature flags работают
- [ ] CI/CD pipeline passes
- [ ] Build optimization applied
- [ ] Environment variables documented
- [ ] README with setup instructions

#### Documentation
- [ ] API documentation
- [ ] Component storybook (optional)
- [ ] Testing guide
- [ ] Deployment guide

### Rollback Strategy

Production rollback process:

```bash
# 1. Identify problematic deploy
git log --oneline

# 2. Revert to previous working version
git revert <commit-hash>

# 3. Emergency build
npm run build

# 4. Deploy
# ... your deployment process

# 5. Verify
curl https://your-app.com/health
```

---

## 📊 Summary: Complete Roadmap

### Timeline Overview

| Week | Iteration | Key Deliverable | Can Deploy? |
|------|-----------|----------------|-------------|
| 1 | 0-1 | Telegram Shell | ✅ (empty app) |
| 2 | 2 | Mock Chat | ✅ (functional chat) |
| 3 | 3 | Real A2A | ✅ (real agent) |
| 4-5 | 4 | Checkout Flow | ✅ (full shopping) |
| 6 | 5 | Mock Crypto | ✅ (test payments) |
| 7-8 | 6 | Real Crypto | ✅ (Sepolia) |
| 9 | 7 | Polish | ✅ (production) |

**Total: ~9 weeks**

### Feature Flag Matrix

| Feature | Iteration | Flag | Default |
|---------|-----------|------|---------|
| Mock A2A | 2 | `VITE_FEATURE_A2A_MOCK` | `true` |
| Checkout Flow | 4 | `VITE_FEATURE_CHECKOUT` | `true` |
| Crypto Payment | 5 | `VITE_FEATURE_CRYPTO_WALLET` | `false` |
| Mock Wallet | 5 | `VITE_FEATURE_MOCK_WALLET` | `true` |

### Testing Pyramid

```
                    /\
                   /  \
                  / E2E \          (~20 tests)
                 /--------\
                /          \
               / Integration\      (~50 tests)
              /--------------\
             /                \
            /   Unit Tests     \   (~200 tests)
           /____________________\
```

### Deployment Stages

1. **Development** (localhost)
   - All features enabled
   - Mock mode for fast iteration
   - Hot reload

2. **Staging** (ngrok/test server)
   - Real backend
   - Mock wallet (safe testing)
   - Full E2E tests

3. **Production** (real domain)
   - Real backend
   - Real wallet (Sepolia testnet)
   - Monitoring enabled
   - Feature flags for gradual rollout

---

## 🎯 Next Actions

### Immediate (Week 1)
1. [ ] Create Telegram bot via @BotFather
2. [ ] Setup project structure
3. [ ] Install dependencies
4. [ ] Configure environment variables
5. [ ] Run Iteration 0 tasks

### Short-term (Week 2-3)
1. [ ] Implement Telegram Mini App shell
2. [ ] Build A2A client (mock mode)
3. [ ] Create chat UI
4. [ ] Write first E2E tests

### Mid-term (Week 4-6)
1. [ ] Connect real backend
2. [ ] Implement checkout flow
3. [ ] Add mock crypto wallet
4. [ ] Comprehensive testing

### Long-term (Week 7-9)
1. [ ] Integrate real Wagmi
2. [ ] Backend blockchain verification
3. [ ] Production optimization
4. [ ] Full test suite
5. [ ] Launch! 🚀

---

## 📚 Resources

### Documentation
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [AP2 Protocol Spec](https://github.com/google-agentic-commerce/AP2)
- [Wagmi Docs](https://wagmi.sh/)
- [Playwright Testing](https://playwright.dev/)

### Tools
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [WalletConnect Cloud](https://cloud.walletconnect.com/)
- [Infura](https://infura.io/)
- [Etherscan Sepolia](https://sepolia.etherscan.io/)

### Internal Docs
- [AP2 Tech Stack Analysis](./TECH_STACK_ANALYSIS_REPORT.md)
- [Feasibility Report](./TELEGRAM_MINIAPP_FEASIBILITY_REPORT.md)
- [Project History](./HISTORY.md)
- [Development Insights](./INSIGHTS.md)

---

**Готов начать разработку! 🎉**

Первый шаг: Создать Telegram бота и запустить Iteration 0.
