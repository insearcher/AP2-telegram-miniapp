# 🚀 План разработки - Часть 2

[← Назад к части 1](./DEVELOPMENT_PLAN.md)

## Iteration 3: Real A2A Integration

**Длительность:** 5-6 дней
**Backend required:** ✅

### Цель
Подключить реальный Shopping Agent через A2A протокол без ломки mock mode.

### Задачи

#### 1. Real A2A Client Implementation

**File:** `src/api/a2aClient.ts` (дополнение)
```typescript
export class A2aClient {
  // ... existing code ...

  private async sendRealMessage(message: Message): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      method: 'execute',
      params: { message },
      id: crypto.randomUUID(),
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-A2A-Extensions': 'https://github.com/google-agentic-commerce/ap2/v1',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`A2A request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`A2A error: ${result.error.message}`);
    }

    return result;
  }
}
```

#### 2. Feature Flag Config

**File:** `src/config/features.ts`
```typescript
export const features = {
  useMockA2A: import.meta.env.VITE_FEATURE_A2A_MOCK === 'true',
  useCheckout: import.meta.env.VITE_FEATURE_CHECKOUT === 'true',
  useCryptoPayment: import.meta.env.VITE_FEATURE_CRYPTO_WALLET === 'true',
  useMockWallet: import.meta.env.VITE_FEATURE_MOCK_WALLET === 'true',
};

// Debug panel
export function FeatureFlagsDebug() {
  return (
    <div className="feature-flags-debug">
      {Object.entries(features).map(([key, value]) => (
        <div key={key}>
          {key}: {value ? '✅' : '❌'}
        </div>
      ))}
    </div>
  );
}
```

#### 3. Updated Chat Interface

**File:** `src/components/Chat/ChatInterface.tsx`
```typescript
import { features } from '../../config/features';

export function ChatInterface() {
  // ...existing code...

  const client = new A2aClient(
    import.meta.env.VITE_BACKEND_URL,
    features.useMockA2A  // ← Используем feature flag
  );

  // ... rest of component
}
```

#### 4. Backend CORS Configuration

**File:** `samples/python/src/common/server.py`
```python
# Add ngrok domains to CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://*.ngrok-free.app",
        "https://*.ngrok.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 5. Error Handling

**File:** `src/api/a2aClient.ts`
```typescript
export class A2aError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'A2aError';
  }
}

export class A2aClient {
  // ... existing code ...

  async sendMessage(message: Message): Promise<any> {
    try {
      if (this.mockMode) {
        return await this.getMockResponse(message);
      }
      return await this.sendRealMessage(message);
    } catch (error) {
      if (error instanceof A2aError) {
        throw error;
      }

      // Network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new A2aError(
          'Network error. Please check your connection.',
          'NETWORK_ERROR',
          error
        );
      }

      // Unknown error
      throw new A2aError(
        'Failed to send message',
        'UNKNOWN_ERROR',
        error
      );
    }
  }
}
```

### Как тестировать

#### Regression Testing (Mock Mode)
```bash
# 1. Проверяем что mock mode всё ещё работает
VITE_FEATURE_A2A_MOCK=true npm run dev

# 2. Запускаем E2E тесты
npx playwright test tests/e2e/chat-mock.spec.ts

# All tests should pass ✅
```

#### New Feature Testing (Real Backend)

**Prerequisites:**
```bash
# 1. Запустить backend в отдельном терминале
cd /Users/frolov/projects/ai/AP2
bash samples/python/scenarios/a2a/human-present/cards/run.sh

# 2. Дождаться пока все серверы запустятся (проверить порты)
lsof -i :8080,8001,8002,8003
```

**Manual Testing:**
```bash
# 3. Запустить frontend в real mode
VITE_FEATURE_A2A_MOCK=false npm run dev

# 4. Открыть в браузере или через ngrok в Telegram
```

**Test Scenarios:**
1. Открыть Mini App
2. Написать: "I want to buy a coffee maker"
3. Ожидаемый результат: Реальный ответ от Gemini агента (не mock)
4. Написать: "Show me red ones"
5. Ожидаемый результат: Агент фильтрует по цвету
6. Проверить что context_id передается между сообщениями

#### E2E Test (Real Backend)

**File:** `tests/e2e/chat-real-backend.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Chat with Real A2A Backend', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Only run on Chromium');

  test.beforeAll(async () => {
    // Check if backend is running
    const response = await fetch('http://localhost:8080/.well-known/agent-card.json');
    if (!response.ok) {
      throw new Error('Backend is not running. Start it with: bash run.sh');
    }
  });

  test('should get real agent response', async ({ page }) => {
    await page.goto('http://localhost:5173?mock=false');

    // Wait for app
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();

    // Send message
    await page.fill('[data-testid="chat-input"]', 'I want to buy a coffee maker');
    await page.click('[data-testid="send-button"]');

    // Wait for real agent response (может занять до 10 секунд)
    await expect(page.locator('[data-testid="message-agent"]').last())
      .toBeVisible({ timeout: 15000 });

    const response = await page.locator('[data-testid="message-agent"]').last().textContent();

    // Real agent should mention products or ask clarifying questions
    expect(response?.toLowerCase()).toMatch(/product|coffee|maker|find|search/);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Block backend requests
    await page.route('**/a2a/**', route => route.abort('failed'));

    await page.goto('http://localhost:5173?mock=false');

    await page.fill('[data-testid="chat-input"]', 'test message');
    await page.click('[data-testid="send-button"]');

    // Should show error message
    await expect(page.locator('text=Network error')).toBeVisible({ timeout: 5000 });
  });
});
```

### Критерии успеха
- [ ] Mock mode всё ещё работает (regression ✅)
- [ ] Real mode успешно подключается к backend
- [ ] Получаем реальные ответы от Shopping Agent через Gemini
- [ ] Context ID передается между сообщениями (conversation history)
- [ ] CORS настроен правильно (нет ошибок в console)
- [ ] Error handling работает (показывает user-friendly сообщения)
- [ ] E2E тесты проходят в обоих режимах
- [ ] Можно переключаться между mock/real через .env

### Rollback Strategy

**Option 1: Feature Flag**
```bash
# В .env.local изменить
VITE_FEATURE_A2A_MOCK=true

# Перезапустить dev server
npm run dev
```

**Option 2: UI Toggle (для debugging)**
```typescript
// src/components/DebugPanel.tsx
export function DebugPanel() {
  const [useMock, setUseMock] = useState(features.useMockA2A);

  const handleToggle = () => {
    localStorage.setItem('force_mock_mode', (!useMock).toString());
    setUseMock(!useMock);
    window.location.reload();
  };

  return (
    <button onClick={handleToggle}>
      {useMock ? 'Switch to Real Backend' : 'Switch to Mock'}
    </button>
  );
}
```

---

## Iteration 4: Cart & Checkout Flow

**Длительность:** 6-7 дней
**Backend required:** ✅

### Цель
Добавить полный checkout flow: поиск товаров → выбор → корзина → адрес доставки.

### Задачи

#### 1. Product Types

**File:** `src/types/product.ts`
```typescript
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
  sku?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
```

#### 2. Cart Store (Zustand)

**File:** `src/store/cartStore.ts`
```typescript
import { create } from 'zustand';
import { CartMandate } from '../api/a2aTypes';
import { ContactAddress } from '../types/address';

interface CartStore {
  items: CartItem[];
  cartMandate: CartMandate | null;
  shippingAddress: ContactAddress | null;
  contextId: string | null;

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  setCartMandate: (mandate: CartMandate) => void;
  setShippingAddress: (address: ContactAddress) => void;
  setContextId: (id: string) => void;

  updateCart: () => Promise<void>;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  cartMandate: null,
  shippingAddress: null,
  contextId: null,

  addItem: (product) => {
    set(state => {
      const existing = state.items.find(item => item.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1 }] };
    });
  },

  removeItem: (productId) => {
    set(state => ({
      items: state.items.filter(item => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set(state => ({
      items: state.items.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    }));
  },

  clearCart: () => {
    set({ items: [], cartMandate: null, shippingAddress: null });
  },

  setCartMandate: (mandate) => set({ cartMandate: mandate }),
  setShippingAddress: (address) => set({ shippingAddress: address }),
  setContextId: (id) => set({ contextId: id }),

  updateCart: async () => {
    const { shippingAddress, contextId } = get();
    if (!shippingAddress) {
      throw new Error('Shipping address is required');
    }

    const client = new A2aClient(import.meta.env.VITE_BACKEND_URL, features.useMockA2A);

    const message = new A2aMessageBuilder()
      .setContextId(contextId!)
      .addText('Update the cart with shipping address')
      .addData('shipping_address', shippingAddress)
      .build();

    const response = await client.sendMessage(message);

    // Extract CartMandate from response
    const cartMandate = extractCartMandate(response);
    set({ cartMandate });
  },
}));
```

#### 3. Product List Component

**File:** `src/components/Product/ProductList.tsx`
```typescript
import { useState } from 'react';
import { Product } from '../../types/product';
import { useCartStore } from '../../store/cartStore';
import './ProductList.css';

interface ProductListProps {
  products: Product[];
}

export function ProductList({ products }: ProductListProps) {
  const addItem = useCartStore(state => state.addItem);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());

  const handleAddToCart = (product: Product) => {
    addItem(product);
    setAddedProducts(prev => new Set(prev).add(product.id));

    // Reset animation after delay
    setTimeout(() => {
      setAddedProducts(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  };

  if (products.length === 0) {
    return <div className="empty-products">No products found</div>;
  }

  return (
    <div className="product-list" data-testid="product-list">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="product-card"
          data-testid={`product-${index}`}
        >
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.name} className="product-image" />
          )}
          <div className="product-info">
            <h3 className="product-name">{product.name}</h3>
            <p className="product-description">{product.description}</p>
            <div className="product-price">
              {product.currency} {product.price.toFixed(2)}
            </div>
          </div>
          <button
            className={`add-to-cart-btn ${addedProducts.has(product.id) ? 'added' : ''}`}
            onClick={() => handleAddToCart(product)}
            data-testid="add-to-cart"
          >
            {addedProducts.has(product.id) ? '✓ Added' : 'Add to Cart'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### 4. Shipping Address Form

**File:** `src/components/Checkout/ShippingForm.tsx`
```typescript
import { useState } from 'react';
import { ContactAddress } from '../../types/address';
import './ShippingForm.css';

interface ShippingFormProps {
  onSubmit: (address: ContactAddress) => void;
  loading?: boolean;
}

export function ShippingForm({ onSubmit, loading = false }: ShippingFormProps) {
  const [address, setAddress] = useState<ContactAddress>({
    addressLine: '',
    city: '',
    postalCode: '',
    country: 'US',
    region: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!address.addressLine.trim()) {
      newErrors.addressLine = 'Address is required';
    }
    if (!address.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!address.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    }
    if (!address.country.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(address);
    }
  };

  return (
    <form className="shipping-form" onSubmit={handleSubmit}>
      <h2>Shipping Address</h2>

      <div className="form-group">
        <label htmlFor="addressLine">Street Address *</label>
        <input
          type="text"
          id="addressLine"
          name="addressLine"
          value={address.addressLine}
          onChange={(e) => setAddress({ ...address, addressLine: e.target.value })}
          className={errors.addressLine ? 'error' : ''}
          disabled={loading}
        />
        {errors.addressLine && <span className="error-message">{errors.addressLine}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="city">City *</label>
          <input
            type="text"
            id="city"
            name="city"
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
            className={errors.city ? 'error' : ''}
            disabled={loading}
          />
          {errors.city && <span className="error-message">{errors.city}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="postalCode">Postal Code *</label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            value={address.postalCode}
            onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
            className={errors.postalCode ? 'error' : ''}
            disabled={loading}
          />
          {errors.postalCode && <span className="error-message">{errors.postalCode}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="country">Country *</label>
        <select
          id="country"
          name="country"
          value={address.country}
          onChange={(e) => setAddress({ ...address, country: e.target.value })}
          disabled={loading}
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
        </select>
      </div>

      <button
        type="submit"
        className="submit-btn"
        data-testid="continue-to-payment"
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Continue to Payment'}
      </button>
    </form>
  );
}
```

#### 5. Checkout Page

**File:** `src/pages/CheckoutPage.tsx`
```typescript
import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { ProductList } from '../components/Product/ProductList';
import { ShippingForm } from '../components/Checkout/ShippingForm';
import { ContactAddress } from '../types/address';
import './CheckoutPage.css';

type CheckoutStep = 'cart' | 'shipping' | 'payment';

export function CheckoutPage() {
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [loading, setLoading] = useState(false);

  const { items, updateCart, setShippingAddress } = useCartStore();

  const handleShippingSubmit = async (address: ContactAddress) => {
    setLoading(true);
    try {
      setShippingAddress(address);
      await updateCart();
      setStep('payment');
    } catch (error) {
      console.error('Failed to update cart:', error);
      alert('Failed to update cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="checkout-page">
      <div className="checkout-progress">
        <div className={`step ${step === 'cart' ? 'active' : 'completed'}`}>Cart</div>
        <div className={`step ${step === 'shipping' ? 'active' : step === 'payment' ? 'completed' : ''}`}>
          Shipping
        </div>
        <div className={`step ${step === 'payment' ? 'active' : ''}`}>Payment</div>
      </div>

      {step === 'cart' && (
        <div className="cart-step">
          <h2>Your Cart</h2>
          {items.length === 0 ? (
            <div className="empty-cart">Your cart is empty</div>
          ) : (
            <>
              <div className="cart-items">
                {items.map(item => (
                  <div key={item.product.id} className="cart-item">
                    <div>{item.product.name}</div>
                    <div>Qty: {item.quantity}</div>
                    <div>${(item.product.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="cart-total" data-testid="cart-total">
                Total: ${total.toFixed(2)}
              </div>
              <button onClick={() => setStep('shipping')}>Continue to Shipping</button>
            </>
          )}
        </div>
      )}

      {step === 'shipping' && (
        <ShippingForm onSubmit={handleShippingSubmit} loading={loading} />
      )}

      {step === 'payment' && (
        <div className="payment-step">
          <h2>Payment</h2>
          {/* Payment method selector будет в Iteration 5 */}
          <p>Payment methods coming soon...</p>
        </div>
      )}
    </div>
  );
}
```

### Как тестировать

#### Regression Testing
```bash
# 1. Mock A2A всё ещё работает
VITE_FEATURE_A2A_MOCK=true npm run dev

# 2. Real A2A всё ещё работает
VITE_FEATURE_A2A_MOCK=false npm run dev

# 3. Запустить regression tests
npx playwright test tests/e2e/chat-*.spec.ts
```

#### New Feature Testing

**File:** `tests/e2e/checkout-flow.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('should complete full checkout flow', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Step 1: Search and add product
    await page.fill('[data-testid="chat-input"]', 'I want to buy shoes');
    await page.click('[data-testid="send-button"]');

    // Wait for products
    await expect(page.locator('[data-testid="product-list"]')).toBeVisible({ timeout: 10000 });

    // Add first product to cart
    await page.click('[data-testid="product-0"] [data-testid="add-to-cart"]');
    await expect(page.locator('text=✓ Added')).toBeVisible();

    // Step 2: Go to checkout
    await page.click('[data-testid="checkout-button"]');

    // Verify cart shows items
    await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();

    // Continue to shipping
    await page.click('text=Continue to Shipping');

    // Step 3: Fill shipping address
    await page.fill('[name="addressLine"]', '123 Test Street');
    await page.fill('[name="city"]', 'San Francisco');
    await page.fill('[name="postalCode"]', '94102');
    await page.selectOption('[name="country"]', 'US');

    await page.click('[data-testid="continue-to-payment"]');

    // Should reach payment step
    await expect(page.locator('text=Payment')).toBeVisible();
  });

  test('should validate shipping form', async ({ page }) => {
    await page.goto('http://localhost:5173/checkout?step=shipping');

    // Try to submit empty form
    await page.click('[data-testid="continue-to-payment"]');

    // Should show validation errors
    await expect(page.locator('text=Address is required')).toBeVisible();
    await expect(page.locator('text=City is required')).toBeVisible();
  });

  test('should show empty cart message', async ({ page }) => {
    await page.goto('http://localhost:5173/checkout');

    await expect(page.locator('text=Your cart is empty')).toBeVisible();
  });
});
```

### Критерии успеха
- [ ] Можно найти и отобразить продукты
- [ ] Можно добавить продукт в корзину
- [ ] Cart store сохраняет состояние
- [ ] Форма shipping address валидируется
- [ ] CartMandate обновляется с адресом через A2A
- [ ] Previous features не сломались (regression tests pass)
- [ ] E2E test проходит полный flow
- [ ] UI responsive и работает в Telegram

### Rollback Strategy
```typescript
// Feature flag для checkout flow
if (!features.useCheckout) {
  return <SimpleChatMode />; // Fallback to Iteration 3
}

// Или в .env.local
VITE_FEATURE_CHECKOUT=false
```

---

*Continued in DEVELOPMENT_PLAN_PART3.md...*
