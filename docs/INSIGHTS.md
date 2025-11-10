# Инсайты по работе с AP2

## Инсайт 1: ADK Web Server использует порт 8000 по умолчанию

**Проблема**: При запуске `run.sh` Shopping Agent не может забиндиться на порт 8000, если он уже занят другим процессом.

**Решение**: Добавить флаг `--port` в команду `adk web`:
```bash
uv run --package ap2-samples adk web --host 0.0.0.0 --port 8080 $AGENTS_DIR
```

**Локация**: `samples/python/scenarios/a2a/human-present/cards/run.sh:113`

**Контекст**: В локальной среде разработки Docker может занимать порт 8000 (например, travel-assistant-api).

---

## Инсайт 2: A2A Protocol требует X-A2A-Extensions header

**Важно**: Все HTTP requests к A2A endpoints должны включать header:
```
X-A2A-Extensions: https://github.com/google-agentic-commerce/ap2/v1
```

**Без этого header**:
- Extension не будет активирован
- AP2-специфичные функции не будут доступны
- Server может отклонить request

**Пример в TypeScript**:
```typescript
fetch(baseUrl, {
  headers: {
    'X-A2A-Extensions': 'https://github.com/google-agentic-commerce/ap2/v1',
  },
});
```

**Пример в Python**:
```python
httpx.post(url, headers={'X-A2A-Extensions': AP2_EXTENSION_URI})
```

---

## Инсайт 3: google-adk vs a2a-sdk - разные назначения

**google-adk**:
- Для СОЗДАНИЯ AI-агентов (LlmAgent, tools, delegation)
- Включает web UI из коробки
- Работает с Gemini API
- Используется на стороне сервера

**a2a-sdk**:
- Для КОММУНИКАЦИИ между агентами
- Определяет Message, Part, AgentCard типы
- JSON-RPC over HTTP протокол
- Используется как на клиенте, так и на сервере

**Вывод**: Для Telegram Mini App нужен только a2a-sdk паттерн (можно написать custom TypeScript client), ADK не нужен на frontend.

---

## Инсайт 4: AgentCard discovery pattern

**Best practice** для инициализации A2A client:

1. **Fetch AgentCard** перед первым запросом:
```typescript
const agentCardUrl = `${baseUrl}/.well-known/agent-card.json`;
const agentCard = await fetch(agentCardUrl).then(r => r.json());
```

2. **Validate capabilities**:
```typescript
const hasAP2 = agentCard.capabilities.extensions.some(
  ext => ext.uri === 'https://github.com/google-agentic-commerce/ap2/v1'
);
```

3. **Cache AgentCard** для повторного использования.

**Зачем**: AgentCard содержит важную мета-информацию (skills, extensions, protocolVersion), которая может влиять на client behavior.

---

## Инсайт 5: Builder pattern для A2A Messages

**Рекомендуется** использовать builder pattern вместо прямого создания Message объектов:

**❌ Плохо**:
```typescript
const message = {
  messageId: uuid(),
  parts: [
    { kind: 'text', text: 'hello' },
    { kind: 'data', data: { shopping_agent_id: 'foo' } },
  ],
  role: 'agent',
};
```

**✅ Хорошо**:
```typescript
const message = new A2aMessageBuilder()
  .addText('hello')
  .addData('shopping_agent_id', 'foo')
  .build();
```

**Преимущества**:
- Автоматическая генерация `messageId`
- Контроль типов через TypeScript
- Автоматическое добавление обязательных полей (например, `shopping_agent_id`)
- Fluent API удобен для чтения

---

## Инсайт 6: Starlette + Uvicorn вместо Flask

**Важно**: В современных AP2 samples используется **Starlette** как web framework, а не Flask (хотя Flask все еще в dependencies).

**Причины**:
- Starlette поддерживает ASGI (асинхронность из коробки)
- Uvicorn - быстрый ASGI server
- A2A SDK предоставляет `A2AStarletteApplication` helper

**Пример** (из `common/server.py`):
```python
from a2a.server.apps.jsonrpc.starlette_app import A2AStarletteApplication

app = A2AStarletteApplication(agent_card=agent_card, http_handler=handler).build(
    rpc_url="/a2a/merchant_agent",
    agent_card_url="/a2a/merchant_agent/.well-known/agent-card.json"
)
```

**Вывод**: Для новых backend сервисов использовать Starlette, не Flask.

---

## Инсайт 7: RetryingLlmAgent wrapper pattern

**AP2 samples** используют custom wrapper `RetryingLlmAgent` поверх `google.adk.agents.llm_agent.LlmAgent`.

**Зачем**:
- Автоматический retry при errors
- Улучшенная обработка rate limits от Gemini API
- Graceful degradation

**Код**:
```python
class RetryingLlmAgent(LlmAgent):
    def __init__(self, *args, max_retries: int = 1, **kwargs):
        super().__init__(*args, **kwargs)
        self._max_retries = max_retries
```

**Рекомендация**: Для production всегда оборачивать LlmAgent в retry logic.

---

## Инсайт 8: Shopping Agent Allowlist для security

**Merchant Agent** проверяет `shopping_agent_id` для предотвращения unauthorized requests:

```python
_KNOWN_SHOPPING_AGENTS = ["trusted_shopping_agent"]

shopping_agent_id = message_utils.find_data_part("shopping_agent_id", data_parts)
if shopping_agent_id not in _KNOWN_SHOPPING_AGENTS:
    await _fail_task(updater, f"Unauthorized Request: Unknown agent '{shopping_agent_id}'.")
```

**Для Telegram Mini App**:
- Нужно зарегистрировать Telegram bot как trusted agent
- Передавать `bot_id` или `webapp_hash` в `shopping_agent_id`
- На backend добавить валидацию Telegram InitData

---

## Инсайт 9: uv как modern Python package manager

**AP2 использует `uv`** вместо `pip` или `poetry`.

**Преимущества**:
- Гораздо быстрее pip (написан на Rust)
- Workspace support (`[tool.uv.workspace]`)
- Lockfile из коробки
- Поддержка `uv run` для запуска без активации venv

**Команды**:
```bash
uv sync                        # Install dependencies
uv run python -m mymodule      # Run module
uv run --package name command  # Run command from specific package
```

**Рекомендация**: Использовать `uv` для новых Python проектов.

---

## Инсайт 10: Context ID для multi-turn conversations

**A2A Message** имеет опциональное поле `contextId`:

```typescript
interface Message {
  messageId: string;
  contextId?: string;  // ← Для продолжения диалога
  parts: Part[];
  role: Role;
}
```

**Использование**:
- Первый message: `contextId` = undefined
- Последующие messages: `contextId` = значение из первого response
- Server использует `contextId` для связывания messages в одну сессию

**Пример**:
```typescript
// First message
const msg1 = builder.addText('I want to buy shoes').build();
const response1 = await client.sendMessage(msg1);

// Follow-up message
const msg2 = builder
  .setContextId(response1.contextId)  // ← Связываем с первым message
  .addText('Size 42')
  .build();
```

---

## Инсайт 11: Feature Flags для инкрементальной разработки

**Проблема**: При разработке новых фич легко сломать старые.

**Решение**: Использовать feature flags через environment variables:

```bash
# .env.local
VITE_FEATURE_A2A_MOCK=true      # Mock A2A client
VITE_FEATURE_CHECKOUT=true      # Checkout flow
VITE_FEATURE_CRYPTO_WALLET=false # Crypto payment
VITE_FEATURE_MOCK_WALLET=true   # Mock wallet
```

**Использование в коде**:
```typescript
// src/config/features.ts
export const features = {
  useMockA2A: import.meta.env.VITE_FEATURE_A2A_MOCK === 'true',
  useCheckout: import.meta.env.VITE_FEATURE_CHECKOUT === 'true',
};

// В компоненте
if (!features.useCheckout) {
  return <SimpleChatMode />; // Fallback
}
```

**Преимущества**:
- Instant rollback: просто изменить .env и перезапустить
- A/B testing: разные пользователи видят разные фичи
- Постепенный rollout: включать фичи по одной
- Безопасное тестирование: новая фича не влияет на production

**Рекомендация**: Каждая новая фича должна быть за feature flag до полного тестирования.

---

## Инсайт 12: Mock Mode для разработки без backend

**Проблема**: Разработка frontend зависит от работающего backend, что замедляет итерации.

**Решение**: Реализовать mock mode для всех внешних интеграций:

**Mock A2A Client**:
```typescript
class A2aClient {
  constructor(baseUrl: string, mockMode = false) {
    this.mockMode = mockMode;
  }

  async sendMessage(message: Message) {
    if (this.mockMode) {
      return this.getMockResponse(message); // ← Mock data
    }
    return this.sendRealMessage(message);  // ← Real API
  }

  private async getMockResponse(message: Message) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    return { /* mock data */ };
  }
}
```

**Mock Wallet**:
```typescript
class MockWalletProvider {
  async connect() {
    return {
      address: '0x742d35Cc...',
      balance: '10.0 ETH',
    };
  }

  async sendTransaction(to: string, amount: string) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { hash: '0x' + Math.random().toString(16) };
  }
}
```

**Преимущества**:
- Frontend разработка независимо от backend
- Быстрые итерации (нет network delays)
- Deterministic testing (одинаковые mock данные)
- UI тестирование без реального blockchain

**Рекомендация**: Всегда начинать с mock mode, потом добавлять real integration.

---

## Инсайт 13: Vertical Slices вместо Horizontal Layers

**Плохой подход** (Horizontal Layers):
```
Week 1: Реализовать все UI компоненты
Week 2: Реализовать всю бизнес-логику
Week 3: Реализовать всю интеграцию с backend
Week 4: Собрать всё вместе и протестировать ❌
```

**Проблема**: Нельзя протестировать полный flow до конца Week 4. Высокий риск integration issues.

**Хороший подход** (Vertical Slices):
```
Week 1: Search products flow (UI + logic + backend integration) ✅ Testable
Week 2: Add to cart flow (UI + logic + backend integration) ✅ Testable
Week 3: Checkout flow (UI + logic + backend integration) ✅ Testable
Week 4: Payment flow (UI + logic + backend integration) ✅ Testable
```

**Преимущества**:
- После каждой недели есть working feature
- Можно тестировать end-to-end
- Раньше находим integration problems
- Easier rollback (откатываем одну фичу, а не весь слой)

**Пример из плана**:
- Iteration 2: Mock A2A Client → можно тестировать chat flow
- Iteration 3: Real A2A → можно тестировать real agent responses
- Iteration 4: Checkout → можно тестировать полную покупку

**Рекомендация**: Планировать итерации как vertical slices, не horizontal layers.

---

## Инсайт 14: Regression Testing после каждого изменения

**Проблема**: Новая фича ломает старую, но мы узнаем об этом поздно.

**Решение**: Regression tests после КАЖДОЙ итерации:

```bash
# После добавления новой фичи
npm run test:regression  # Все старые тесты

# Если что-то сломалось:
# 1. Отключить новую фичу через feature flag
# 2. Починить broken test
# 3. Включить новую фичу обратно
```

**Структура тестов**:
```
tests/
├── iteration-1/  # Telegram app shell tests
├── iteration-2/  # Mock A2A tests
├── iteration-3/  # Real A2A tests
└── regression/   # All previous iteration tests
```

**Regression test suite**:
```typescript
// tests/regression/all-features.spec.ts
test.describe('Regression Suite', () => {
  test('Iteration 1: Telegram app opens', async ({ page }) => {
    // Test from iteration 1
  });

  test('Iteration 2: Mock chat works', async ({ page }) => {
    // Test from iteration 2
  });

  test('Iteration 3: Real backend works', async ({ page }) => {
    // Test from iteration 3
  });

  // ... all previous features
});
```

**CI/CD Integration**:
```yaml
# .github/workflows/test.yml
- name: Run regression tests
  run: npx playwright test tests/regression/

- name: Run new feature tests
  run: npx playwright test tests/iteration-current/
```

**Рекомендация**: Если regression test fails, НЕ продолжать разработку новой фичи до fix.

---

## Инсайт 15: Rollback Strategy должна быть протестирована

**Проблема**: У нас есть rollback plan, но мы не уверены что он работает.

**Решение**: Тестировать rollback как часть development process:

**После каждой итерации**:
```bash
# 1. Deploy новую версию
npm run build && deploy

# 2. Проверить что работает
npm run test:e2e

# 3. СИМУЛИРОВАТЬ ROLLBACK
# Option A: Feature flag
VITE_FEATURE_NEW=false npm run build && deploy

# Option B: Git revert
git revert HEAD~1 && npm run build && deploy

# 4. Проверить что старая версия работает
npm run test:regression
```

**Rollback Drill каждые 2 недели**:
1. Случайно выбрать фичу
2. Отключить её через feature flag
3. Запустить regression tests
4. Время rollback должно быть <5 минут

**Documentation**:
```markdown
# ROLLBACK_PLAYBOOK.md

## Emergency Rollback Procedure

1. Identify broken feature
2. Disable via feature flag: `VITE_FEATURE_X=false`
3. Redeploy: `npm run build && deploy`
4. Verify: `npm run test:regression`
5. Monitor: Check error tracking dashboard

Time budget: 5 minutes
```

**Рекомендация**: Rollback должен быть таким же простым, как `git revert` + redeploy.

---

## Инсайт 16: AP2 Protocol Core находится в трёх местах

**Вопрос**: Где именно находится логика оплаты в AP2?

**Ответ**: AP2 протокол состоит из 3 слоев:

**1. Data Models** (`/src/ap2/types/`):
- `mandate.py` - IntentMandate, CartMandate, PaymentMandate
- `payment_request.py` - W3C Payment Request API types
- Это Pydantic models без бизнес-логики

**2. Business Logic** (`/samples/python/src/roles/`):
- `shopping_agent/tools.py` - создание PaymentMandate, подписи
- `merchant_agent/tools.py` - создание CartMandate
- `merchant_payment_processor_agent/` - обработка платежа

**3. Validation** (`/samples/python/src/common/validation.py`):
- Проверка JWT подписей
- Валидация мандатов

**Flow оплаты**:
```
IntentMandate (user intent)
    ↓
CartMandate (merchant signed)
    ↓
PaymentMandate (user signed)
    ↓
Payment Processing (blockchain/card)
```

**Для crypto адаптации нужно изменить**:
1. `PaymentResponse.details` - добавить `transaction_hash`
2. `Payment Processor` - верифицировать tx on blockchain вместо card token

**Рекомендация**: AP2 types остаются неизменными, модифицируем только business logic.
