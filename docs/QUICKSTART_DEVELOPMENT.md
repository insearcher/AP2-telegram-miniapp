# 🚀 Quick Start: Telegram Mini App Development

Этот документ содержит быстрый старт для разработки Telegram Mini App с криптоплатежами на базе AP2 protocol.

## 📚 Документация

### Основные документы

1. **[План разработки](./DEVELOPMENT_PLAN.md)** - Главный документ с инкрементальным планом
   - [Часть 1](./DEVELOPMENT_PLAN.md) - Iteration 0-2 (Setup, Telegram Shell, Mock A2A)
   - [Часть 2](./DEVELOPMENT_PLAN_PART2.md) - Iteration 3-4 (Real A2A, Checkout Flow)
   - [Часть 3](./DEVELOPMENT_PLAN_PART3.md) - Iteration 5-6 (Mock Crypto, Real Blockchain)
   - [Часть 4](./DEVELOPMENT_PLAN_PART4.md) - Iteration 7 + Summary (E2E Tests, Production)

2. **[Технический стек](./TECH_STACK_ANALYSIS_REPORT.md)** - Детальный анализ AP2 технологий
   - Python backend stack (a2a-sdk, google-adk, google-genai)
   - Agent Development Kit (ADK)
   - A2A Protocol структура
   - Android implementation
   - TypeScript примеры для Telegram Mini App

3. **[Feasibility анализ](./TELEGRAM_MINIAPP_FEASIBILITY_REPORT.md)** - Оценка возможности реализации
   - Технические требования
   - Архитектурные решения
   - Timeline и effort estimation
   - Риски и митигации

4. **[История работы](./HISTORY.md)** - Все итерации разработки
   - Iteration 1: Локальный запуск
   - Iteration 2: Feasibility анализ
   - Iteration 3: Технический стек
   - Iteration 4: План разработки

5. **[Инсайты](./INSIGHTS.md)** - Важные находки и best practices
   - 16 инсайтов по работе с AP2
   - Feature flags, Mock mode, Vertical slices
   - Testing strategies, Rollback procedures

---

## ⚡ Quick Start

### Шаг 1: Изучение

```bash
# 1. Прочитать основной план
cat DEVELOPMENT_PLAN.md

# 2. Прочитать технический стек
cat TECH_STACK_ANALYSIS_REPORT.md

# 3. Прочитать инсайты
cat INSIGHTS.md
```

### Шаг 2: Запуск Backend

```bash
# Перейти в директорию AP2
cd /Users/frolov/projects/ai/AP2

# Запустить все серверы
bash samples/python/scenarios/a2a/human-present/cards/run.sh

# Проверить что работает
curl http://localhost:8080/.well-known/agent-card.json

# Должны быть запущены:
# - Shopping Agent: localhost:8080
# - Merchant Agent: localhost:8001
# - Credentials Provider: localhost:8002
# - Payment Processor: localhost:8003
```

### Шаг 3: Создать Telegram Bot

```
1. Открыть @BotFather в Telegram
2. Отправить: /newbot
3. Ввести название бота
4. Ввести username бота (должен заканчиваться на 'bot')
5. Сохранить API token
```

### Шаг 4: Setup Frontend (Iteration 0)

```bash
# Создать директорию для Mini App
mkdir telegram-miniapp
cd telegram-miniapp

# Инициализация проекта
npm create vite@latest . -- --template react-ts

# Установить dependencies
npm install @telegram-apps/sdk
npm install -D vitest @testing-library/react
npm install -D playwright @playwright/test

# Установить Playwright browsers
npx playwright install

# Создать .env.local
cat > .env.local << EOF
VITE_BACKEND_URL=http://localhost:8080
VITE_TELEGRAM_BOT_TOKEN=<YOUR_BOT_TOKEN>
VITE_FEATURE_A2A_MOCK=true
VITE_FEATURE_CHECKOUT=true
VITE_FEATURE_CRYPTO_WALLET=false
VITE_FEATURE_MOCK_WALLET=true
EOF

# Запустить dev server
npm run dev
```

### Шаг 5: Начать разработку

Следуй плану разработки:

```bash
# Iteration 1: Telegram Mini App Shell (3-4 дня)
# См. DEVELOPMENT_PLAN.md → Iteration 1

# Iteration 2: A2A Client Mock Mode (4-5 дней)
# См. DEVELOPMENT_PLAN.md → Iteration 2

# Iteration 3: Real A2A Integration (5-6 дней)
# См. DEVELOPMENT_PLAN_PART2.md → Iteration 3

# ... и так далее
```

---

## 🎯 Roadmap Overview

| Week | Iteration | Deliverable | Status |
|------|-----------|-------------|--------|
| 1 | 0-1 | Telegram Shell | 📋 Planned |
| 2 | 2 | Mock Chat | 📋 Planned |
| 3 | 3 | Real A2A | 📋 Planned |
| 4-5 | 4 | Checkout Flow | 📋 Planned |
| 6 | 5 | Mock Crypto | 📋 Planned |
| 7-8 | 6 | Real Crypto | 📋 Planned |
| 9 | 7 | Polish | 📋 Planned |

**Total: ~9 weeks** (38-47 дней)

---

## 🧪 Testing After Each Iteration

```bash
# Unit tests
npm run test:unit

# E2E tests (mock mode)
VITE_FEATURE_A2A_MOCK=true npx playwright test

# E2E tests (real backend)
VITE_FEATURE_A2A_MOCK=false npx playwright test

# Regression tests (all previous features)
npm run test:regression

# Visual regression
npx playwright test tests/visual/
```

---

## 🔥 Emergency Rollback

Если что-то сломалось:

```bash
# Option 1: Feature Flag
# В .env.local изменить:
VITE_FEATURE_X=false
npm run dev

# Option 2: Git Revert
git revert HEAD~1
npm run build
# Deploy

# Option 3: Previous Working Version
git checkout <previous-commit>
npm run build
# Deploy
```

---

## 📖 Где что находится

### AP2 Protocol Core

**Data Models**: `/Users/frolov/projects/ai/AP2/src/ap2/types/`
- `mandate.py` - IntentMandate, CartMandate, PaymentMandate
- `payment_request.py` - W3C Payment Request API

**Business Logic**: `/Users/frolov/projects/ai/AP2/samples/python/src/roles/`
- `shopping_agent/tools.py` - PaymentMandate creation
- `merchant_agent/tools.py` - CartMandate creation
- `merchant_payment_processor_agent/` - Payment processing

**Validation**: `/Users/frolov/projects/ai/AP2/samples/python/src/common/validation.py`
- JWT signature verification

### Backend Servers

**Shopping Agent**:
- Port: 8080
- URL: `http://localhost:8080/a2a/shopping_agent`
- AgentCard: `http://localhost:8080/.well-known/agent-card.json`

**Merchant Agent**:
- Port: 8001
- URL: `http://localhost:8001/a2a/merchant_agent`

**Credentials Provider**:
- Port: 8002
- URL: `http://localhost:8002/a2a/credentials_provider_agent`

**Payment Processor**:
- Port: 8003
- URL: `http://localhost:8003/a2a/merchant_payment_processor_agent`

---

## 🛠️ Useful Commands

### Backend

```bash
# Запустить все серверы
bash samples/python/scenarios/a2a/human-present/cards/run.sh

# Проверить порты
lsof -i :8080,8001,8002,8003

# Остановить все серверы
# Ctrl+C или kill процессы
```

### Frontend

```bash
# Development server
npm run dev

# Build для production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint

# Type check
npm run type-check
```

### Testing

```bash
# All tests
npm test

# Unit tests только
npm run test:unit

# E2E tests только
npx playwright test

# Specific test file
npx playwright test tests/e2e/chat.spec.ts

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

### Deployment

```bash
# Через ngrok (для тестирования)
npm run dev -- --host 0.0.0.0 --port 5173
ngrok http 5173

# Production build
npm run build
# Deploy dist/ folder
```

---

## 🔗 External Resources

### API Keys

- **Google API Key**: Already in `.env` (AIzaSyD_RdloeXhbPiV-0itUsFm8fQxTzSAOj3M)
- **WalletConnect Project ID**: https://cloud.walletconnect.com/
- **Infura API Key**: https://infura.io/
- **Telegram Bot Token**: From @BotFather

### Testnet Resources

- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **Alchemy Sepolia**: https://www.alchemy.com/faucets/ethereum-sepolia

### Documentation

- **Telegram Mini Apps**: https://core.telegram.org/bots/webapps
- **AP2 Protocol**: https://github.com/google-agentic-commerce/AP2
- **A2A Protocol**: https://a2a-protocol.org/
- **Wagmi**: https://wagmi.sh/
- **Playwright**: https://playwright.dev/

---

## 💡 Tips

### 1. Start with Mock Mode
Всегда начинай разработку в mock mode (`VITE_FEATURE_A2A_MOCK=true`) для быстрых итераций.

### 2. Test After Each Change
После каждого изменения запускай regression tests, чтобы убедиться что ничего не сломалось.

### 3. Use Feature Flags
Каждая новая фича должна быть за feature flag до production release.

### 4. Keep Backend Running
Держи backend серверы запущенными во время разработки (отдельный terminal tab).

### 5. Commit Often
Делай маленькие commits после каждой working фичи для легкого rollback.

---

## ❓ FAQ

**Q: Нужно ли устанавливать Python окружение для frontend разработки?**
A: Нет, если работаешь в mock mode. Для real integration нужен запущенный Python backend.

**Q: Можно ли разрабатывать без Telegram бота?**
A: Да, можно тестировать в browser без Telegram SDK. Но для финального тестирования нужен bot.

**Q: Что делать если backend не запускается?**
A: Проверь что Google API key в `.env`, порты свободны, и Python ≥3.10 установлен.

**Q: Как тестировать crypto payments без реального Ethereum?**
A: Используй mock wallet (`VITE_FEATURE_MOCK_WALLET=true`) или Sepolia testnet.

**Q: Сколько времени займет MVP?**
A: ~8-10 недель при работе по плану с тестированием после каждой итерации.

---

## 🎉 Next Steps

1. ✅ Прочитать [План разработки](./DEVELOPMENT_PLAN.md)
2. ✅ Прочитать [Технический стек](./TECH_STACK_ANALYSIS_REPORT.md)
3. ✅ Запустить backend серверы
4. ✅ Создать Telegram bot
5. ✅ Setup frontend проект
6. 🚀 Начать Iteration 1!

**Успешной разработки! 🚀**
