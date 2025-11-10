# 🚀 Инкрементальный план разработки Telegram Mini App + AP2

## 📋 Оглавление

- [Принципы разработки](#принципы-разработки)
- [Roadmap](#roadmap)
- [Iteration 0: Setup & Infrastructure](#iteration-0-setup--infrastructure)
- [Iteration 1: Telegram Mini App Shell](#iteration-1-telegram-mini-app-shell)
- [Iteration 2: A2A Client (Mock Mode)](#iteration-2-a2a-client-mock-mode)
- [Iteration 3: Real A2A Integration](#iteration-3-real-a2a-integration)
- [Iteration 4: Cart & Checkout Flow](#iteration-4-cart--checkout-flow)
- [Iteration 5: Mock Crypto Wallet](#iteration-5-mock-crypto-wallet)
- [Iteration 6: Real Blockchain Integration](#iteration-6-real-blockchain-integration)
- [Iteration 7: E2E Tests & Polish](#iteration-7-e2e-tests--polish)
- [Summary](#summary)

---

## Принципы разработки

### 1. Feature Flags
Каждая новая фича находится за feature flag, который можно включить/выключить без деплоя.

```typescript
// .env.local
VITE_FEATURE_A2A_MOCK=true
VITE_FEATURE_CHECKOUT=true
VITE_FEATURE_CRYPTO_WALLET=false
VITE_FEATURE_MOCK_WALLET=true
```

### 2. Backward Compatibility
Не ломаем существующий функционал при добавлении нового:

```typescript
// Плохо ❌
function PaymentMethod() {
  return <CryptoWallet />; // Удалили card payment
}

// Хорошо ✅
function PaymentMethod() {
  return (
    <>
      <CardPayment />
      {features.cryptoEnabled && <CryptoWallet />}
    </>
  );
}
```

### 3. Test-Driven Development
После каждой итерации обязательно:
- Unit tests для новой логики
- E2E tests для нового flow
- Regression tests для старых фич

### 4. Vertical Slices
Каждая итерация = полный user flow от UI до backend:

```
User Input → Frontend → A2A Client → Backend → Database/Blockchain → Response → UI
```

---

## Roadmap

| Iteration | Длительность | Основная цель | Можно тестировать? | Backend нужен? |
|-----------|--------------|---------------|-------------------|----------------|
| 0. Setup | 3-5 дней | Инфраструктура | ✅ | ❌ |
| 1. TG Shell | 3-4 дня | Telegram Mini App UI | ✅ | ❌ |
| 2. Mock A2A | 4-5 дней | Chat с mock данными | ✅ | ❌ |
| 3. Real A2A | 5-6 дней | Реальный Shopping Agent | ✅ | ✅ |
| 4. Checkout | 6-7 дней | Корзина + адрес доставки | ✅ | ✅ |
| 5. Mock Crypto | 5-6 дней | Mock crypto wallet UI | ✅ | ✅ |
| 6. Real Crypto | 7-8 дней | Реальный Wagmi + Sepolia | ✅ | ✅ |
| 7. Polish | 5-6 дней | E2E tests, production ready | ✅ | ✅ |

**Total: ~38-47 дней** (~8-10 недель с запасом)

---

## Iteration 0: Setup & Infrastructure

**Длительность:** 3-5 дней
**Backend required:** ❌

### Цель
Подготовить инфраструктуру для разработки без breaking changes.

### Задачи

#### 1. Backend Setup
```bash
# Создаем ветку для разработки
git checkout -b feature/telegram-miniapp

# Backend уже работает на localhost:8080
cd /Users/frolov/projects/ai/AP2
bash samples/python/scenarios/a2a/human-present/cards/run.sh
```

#### 2. Frontend Setup
```bash
# Создаем Telegram Mini App
mkdir telegram-miniapp
cd telegram-miniapp
npm create vite@latest . -- --template react-ts

# Устанавливаем dependencies
npm install @telegram-apps/sdk
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

#### 3. E2E Test Setup
```bash
npm install -D playwright @playwright/test
npx playwright install
```

#### 4. Environment Variables
```bash
# .env.local
VITE_BACKEND_URL=http://localhost:8080
VITE_TELEGRAM_BOT_TOKEN=<от @BotFather>
VITE_FEATURE_A2A_MOCK=true
VITE_FEATURE_CRYPTO_WALLET=false
VITE_FEATURE_MOCK_WALLET=true
VITE_FEATURE_CHECKOUT=true
```

#### 5. Project Structure
```
telegram-miniapp/
├── src/
│   ├── api/
│   │   ├── a2aClient.ts
│   │   ├── a2aMessageBuilder.ts
│   │   └── a2aTypes.ts
│   ├── components/
│   │   ├── Chat/
│   │   ├── Product/
│   │   ├── Checkout/
│   │   └── Payment/
│   ├── hooks/
│   │   ├── useTelegram.ts
│   │   ├── useShoppingAgent.ts
│   │   └── useWallet.ts
│   ├── store/
│   │   └── cartStore.ts
│   ├── config/
│   │   └── features.ts
│   └── App.tsx
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── visual/
├── .env.local
└── playwright.config.ts
```

### Как тестировать

**Checklist:**
- [ ] `npm run dev` запускается без ошибок
- [ ] `curl http://localhost:8080/.well-known/agent-card.json` возвращает JSON
- [ ] `npx playwright test` проходит (пустой тест)
- [ ] ESLint и TypeScript настроены

**Команды:**
```bash
# Frontend dev server
npm run dev

# Backend health check
curl http://localhost:8080/.well-known/agent-card.json

# Test setup
npx playwright test tests/setup.spec.ts
```

### Критерии успеха
- [ ] Telegram bot создан через @BotFather
- [ ] Frontend собирается без ошибок (`npm run build`)
- [ ] Backend доступен через HTTP
- [ ] Playwright настроен и может открыть браузер
- [ ] Git branch создан, `.env.local` в `.gitignore`

### Rollback
N/A - это начальная настройка

---

## Iteration 1: Telegram Mini App Shell

**Длительность:** 3-4 дня
**Backend required:** ❌

### Цель
Создать пустую Telegram Mini App, которая открывается в Telegram и показывает UI.

### Задачи

#### 1. Telegram SDK Integration

**File:** `src/hooks/useTelegram.ts`
```typescript
import { useEffect, useState } from 'react';
import { initData, viewport, themeParams } from '@telegram-apps/sdk';

export function useTelegram() {
  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      if (initData.restore()) {
        setUser(initData.user());
        viewport.expand();
        viewport.bindCssVars();
        setIsReady(true);
      }
    } catch (error) {
      console.error('Failed to initialize Telegram SDK:', error);
    }
  }, []);

  return { user, themeParams, isReady };
}
```

#### 2. Basic UI Layout

**File:** `src/App.tsx`
```typescript
import { useTelegram } from './hooks/useTelegram';
import './App.css';

function App() {
  const { user, isReady } = useTelegram();

  if (!isReady) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app" data-testid="app-ready">
      <header className="app-header">
        <h1>Shopping Assistant</h1>
      </header>

      {user && (
        <div className="user-info">
          Welcome, {user.firstName}!
        </div>
      )}

      <main className="app-main">
        <div className="chat-placeholder" data-testid="chat-placeholder">
          Chat will appear here
        </div>
      </main>
    </div>
  );
}

export default App;
```

#### 3. Deploy на ngrok для тестирования

```bash
# Terminal 1: Frontend
npm run dev -- --host 0.0.0.0 --port 5173

# Terminal 2: ngrok
ngrok http 5173
```

#### 4. Configure Telegram Bot

```
1. Open @BotFather in Telegram
2. Send: /mybots
3. Select your bot
4. Bot Settings → Menu Button → Configure Menu Button
5. Enter ngrok URL: https://YOUR_NGROK_URL
6. Send menu button name: "Open Shop"
```

### Как тестировать

#### Manual Testing
1. Открыть бота в Telegram
2. Нажать кнопку Menu (иконка внизу справа)
3. Должна открыться Mini App
4. Проверить отображение имени пользователя
5. Проверить что UI адаптирован под Telegram theme

#### E2E Test

**File:** `tests/e2e/telegram-app.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Telegram Mini App Shell', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Telegram WebApp environment
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initData: 'user=%7B%22id%22%3A123%2C%22first_name%22%3A%22Test%22%7D',
          initDataUnsafe: {
            user: {
              id: 123,
              first_name: 'Test',
              last_name: 'User',
            },
          },
          themeParams: {
            bg_color: '#ffffff',
            text_color: '#000000',
          },
          expand: () => {},
          ready: () => {},
        },
      };
    });
  });

  test('should open and show user info', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for app to be ready
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();

    // Check user greeting
    await expect(page.locator('text=Welcome, Test!')).toBeVisible();

    // Check chat placeholder
    await expect(page.locator('[data-testid="chat-placeholder"]')).toBeVisible();
  });

  test('should apply Telegram theme', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const app = page.locator('.app');

    // Check CSS variables are bound
    const bgColor = await app.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--tg-theme-bg-color')
    );

    expect(bgColor).toBeTruthy();
  });
});
```

### Критерии успеха
- [ ] Telegram Mini App открывается в боте
- [ ] Отображается имя пользователя из Telegram
- [ ] UI адаптирован под Telegram theme (цвета, шрифты)
- [ ] App корректно разворачивается на весь экран
- [ ] E2E тест проходит
- [ ] Build size < 200KB (проверить `npm run build`)

### Rollback Strategy
Просто отключить кнопку Menu в боте через @BotFather. Backend не затронут.

---

## Iteration 2: A2A Client (Mock Mode)

**Длительность:** 4-5 дней
**Backend required:** ❌

### Цель
Реализовать TypeScript A2A Client с mock данными для тестирования UI без реального backend.

### Задачи

#### 1. A2A Types

**File:** `src/api/a2aTypes.ts`
```typescript
export enum Role {
  AGENT = 'agent',
  USER = 'user',
}

export type TextPart = {
  kind: 'text';
  text: string;
};

export type DataPart = {
  kind: 'data';
  data: Record<string, any>;
};

export type Part = TextPart | DataPart;

export interface Message {
  kind: 'message';
  messageId: string;
  contextId?: string;
  parts: Part[];
  role: Role;
}

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  preferredTransport: string;
  protocolVersion: string;
  capabilities: {
    extensions: Array<{
      uri: string;
      required: boolean;
    }>;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
```

#### 2. Mock A2A Client

**File:** `src/api/a2aClient.ts`
```typescript
import type { Message, AgentCard } from './a2aTypes';

export class A2aClient {
  private baseUrl: string;
  private mockMode: boolean;
  private agentCard: AgentCard | null = null;

  constructor(baseUrl: string, mockMode = false) {
    this.baseUrl = baseUrl;
    this.mockMode = mockMode;
  }

  async fetchAgentCard(): Promise<AgentCard> {
    if (this.mockMode) {
      return {
        name: 'MockShoppingAgent',
        description: 'A mock shopping assistant',
        url: 'http://localhost:8080',
        preferredTransport: 'JSONRPC',
        protocolVersion: '0.3.0',
        capabilities: {
          extensions: [
            {
              uri: 'https://github.com/google-agentic-commerce/ap2/v1',
              required: true,
            },
          ],
        },
        skills: [],
      };
    }

    // Real implementation (Iteration 3)
    const response = await fetch(`${this.baseUrl}/.well-known/agent-card.json`);
    this.agentCard = await response.json();
    return this.agentCard;
  }

  async sendMessage(message: Message): Promise<any> {
    if (this.mockMode) {
      return this.getMockResponse(message);
    }

    return this.sendRealMessage(message);
  }

  private async getMockResponse(message: Message): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userText = message.parts.find(p => p.kind === 'text')?.text || '';

    // Mock different responses based on input
    if (userText.toLowerCase().includes('shoes') || userText.toLowerCase().includes('buy')) {
      return {
        result: {
          task: {
            id: 'mock-task-1',
            status: { state: 'completed' },
            artifacts: [
              {
                parts: [
                  {
                    kind: 'text',
                    text: 'I found 3 products for you:\n\n1. Nike Air Max - $120\n2. Adidas Ultraboost - $180\n3. Puma RS-X - $110',
                  },
                  {
                    kind: 'data',
                    data: {
                      products: [
                        { id: 1, name: 'Nike Air Max', price: 120, currency: 'USD' },
                        { id: 2, name: 'Adidas Ultraboost', price: 180, currency: 'USD' },
                        { id: 3, name: 'Puma RS-X', price: 110, currency: 'USD' },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      };
    }

    return {
      result: {
        task: {
          id: 'mock-task-2',
          status: { state: 'completed' },
          artifacts: [
            {
              parts: [
                {
                  kind: 'text',
                  text: "I'm your shopping assistant. What would you like to buy?",
                },
              ],
            },
          ],
        },
      },
    };
  }

  private async sendRealMessage(message: Message): Promise<any> {
    // Implementation in Iteration 3
    throw new Error('Real A2A not implemented yet');
  }
}
```

#### 3. Message Builder

**File:** `src/api/a2aMessageBuilder.ts`
```typescript
import { Message, Part, Role } from './a2aTypes';

export class A2aMessageBuilder {
  private parts: Part[] = [];
  private contextId?: string;

  addText(text: string): this {
    this.parts.push({ kind: 'text', text });
    return this;
  }

  addData(key: string, data: any): this {
    const dataObject = key ? { [key]: data } : data;
    this.parts.push({ kind: 'data', data: dataObject });
    return this;
  }

  setContextId(contextId: string): this {
    this.contextId = contextId;
    return this;
  }

  build(): Message {
    // Add shopping_agent_id for trust
    this.addData('shopping_agent_id', 'trusted_shopping_agent');

    return {
      kind: 'message',
      messageId: crypto.randomUUID().replace(/-/g, ''),
      contextId: this.contextId,
      parts: this.parts,
      role: Role.AGENT,
    };
  }
}
```

#### 4. Chat UI Component

**File:** `src/components/Chat/ChatInterface.tsx`
```typescript
import { useState, useEffect } from 'react';
import { A2aClient } from '../../api/a2aClient';
import { A2aMessageBuilder } from '../../api/a2aMessageBuilder';
import './ChatInterface.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const useMock = import.meta.env.VITE_FEATURE_A2A_MOCK === 'true';
  const client = new A2aClient(import.meta.env.VITE_BACKEND_URL, useMock);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build A2A message
      const message = new A2aMessageBuilder()
        .addText(text)
        .build();

      // Send to client
      const response = await client.sendMessage(message);

      // Extract agent response
      const agentText = response.result.task.artifacts[0].parts
        .find((p: any) => p.kind === 'text')?.text || 'No response';

      // Add agent message
      const agentMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        text: agentText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'agent',
        text: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages" data-testid="messages-container">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`message message-${msg.role}`}
            data-testid={`message-${msg.role}`}
          >
            <div className="message-text">{msg.text}</div>
            <div className="message-time">
              {msg.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message message-agent">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      <div className="input-container">
        <input
          type="text"
          data-testid="chat-input"
          placeholder="What would you like to buy?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
          disabled={loading}
        />
        <button
          data-testid="send-button"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

### Как тестировать

#### Manual Testing
1. Открыть Mini App в Telegram
2. Написать "I want to buy shoes"
3. Должен появиться ответ с 3 продуктами
4. Написать "hello"
5. Должно появиться приветствие

#### Unit Tests

**File:** `tests/unit/a2aClient.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { A2aClient } from '../../src/api/a2aClient';
import { A2aMessageBuilder } from '../../src/api/a2aMessageBuilder';

describe('A2aClient in mock mode', () => {
  it('should return mock response for product search', async () => {
    const client = new A2aClient('', true);
    const message = new A2aMessageBuilder()
      .addText('I want to buy shoes')
      .build();

    const response = await client.sendMessage(message);

    expect(response.result.task.status.state).toBe('completed');
    expect(response.result.task.artifacts[0].parts[0].text).toContain('Nike');
  });

  it('should return greeting for generic message', async () => {
    const client = new A2aClient('', true);
    const message = new A2aMessageBuilder()
      .addText('hello')
      .build();

    const response = await client.sendMessage(message);

    expect(response.result.task.artifacts[0].parts[0].text).toContain('shopping assistant');
  });
});
```

#### E2E Test

**File:** `tests/e2e/chat-mock.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Chat with Mock A2A', () => {
  test('should show mock agent responses', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();

    // Send message
    await page.fill('[data-testid="chat-input"]', 'I want to buy shoes');
    await page.click('[data-testid="send-button"]');

    // Check user message appears
    await expect(page.locator('[data-testid="message-user"]').last()).toHaveText('I want to buy shoes');

    // Wait for agent response
    await expect(page.locator('[data-testid="message-agent"]').last()).toBeVisible({ timeout: 5000 });

    // Check response contains products
    const agentMessage = await page.locator('[data-testid="message-agent"]').last().textContent();
    expect(agentMessage).toContain('Nike');
  });
});
```

### Критерии успеха
- [ ] Chat UI отображается корректно
- [ ] Mock ответы приходят через ~1 секунду
- [ ] Разные запросы дают разные mock ответы
- [ ] Typing indicator показывается во время загрузки
- [ ] Unit тесты проходят (100% coverage для mock client)
- [ ] E2E тесты проходят
- [ ] **Backend не нужен - всё работает в mock mode**

### Rollback Strategy
```typescript
// В .env.local изменить флаг
VITE_FEATURE_A2A_MOCK=false

// Или условный рендер
if (!import.meta.env.VITE_FEATURE_A2A_MOCK) {
  return <div>Feature disabled</div>;
}
```

---

*Continued in DEVELOPMENT_PLAN_PART2.md...*
