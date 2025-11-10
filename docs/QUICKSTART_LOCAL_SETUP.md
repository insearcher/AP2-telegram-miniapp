# 🚀 Quickstart: Запуск AP2 Human-Present Scenario локально

## ✅ Проверка prerequisites

Убедись что у тебя установлено:

```bash
# Проверить Python (требуется 3.10+)
python3 --version
# У тебя: Python 3.12.2 ✓

# Проверить uv
uv --version
# У тебя: uv 0.7.13 ✓
```

Если чего-то нет:
- **Python 3.10+**: [python.org](https://www.python.org/downloads/)
- **uv**: `curl -LsSf https://astral.sh/uv/install.sh | sh`

---

## 📍 Шаг 1: Навигация в проект

```bash
cd /Users/frolov/projects/ai/AP2
```

---

## 🔑 Шаг 2: Получить Google API Key

### Вариант А: Google AI Studio (рекомендуется для dev)

1. Открой [Google AI Studio](https://aistudio.google.com/apikey)
2. Залогинься с Google аккаунтом
3. Нажми **"Get API Key"** → **"Create API key"**
4. Скопируй ключ

### Вариант Б: Vertex AI (для production)

Если у тебя уже настроен GCP проект:

```bash
# Настроить переменные окружения
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT='your-project-id'
export GOOGLE_CLOUD_LOCATION='global'

# Авторизоваться через gcloud
gcloud auth application-default login
```

---

## 🔐 Шаг 3: Настроить API Key

### Вариант 1: Через .env файл (рекомендуется)

Создай `.env` файл в корне проекта:

```bash
# В директории /Users/frolov/projects/ai/AP2
echo "GOOGLE_API_KEY='your_actual_key_here'" > .env
```

**Важно**: Замени `your_actual_key_here` на реальный ключ!

Пример:
```bash
echo "GOOGLE_API_KEY='AIzaSyD...your_key...xyz123'" > .env
```

### Вариант 2: Через environment variable

```bash
export GOOGLE_API_KEY='your_actual_key_here'
```

**⚠️ Проверка**: Убедись что ключ установлен:

```bash
# Если через .env
cat .env

# Если через export
echo $GOOGLE_API_KEY
```

---

## 🎯 Шаг 4: Запустить сценарий

### Вариант А: Один скрипт для всего (рекомендуется)

Скрипт автоматически:
- Создаст virtual environment
- Установит зависимости
- Запустит 4 сервера в фоне
- Откроет Shopping Agent UI

```bash
bash samples/python/scenarios/a2a/human-present/cards/run.sh
```

**Что происходит**:
```
Setting up the Python virtual environment...
Installing project in editable mode...
Clearing the logs directory...
Starting remote servers and agents as background processes...
-> Starting the Merchant Agent (port:8001 log:.logs/merchant_agent.log)...
-> Starting the Credentials Provider (port:8002 log:.logs/credentials_provider_agent.log)...
-> Starting the Card Processor Agent (port:8003 log:.logs/mpp_agent.log)...
All remote servers are starting.
Starting the Shopping Agent...
```

**Индикация что все работает**:
- В консоли увидишь `INFO:     Started server process [xxxxx]`
- Серверы подняты на портах 8000, 8001, 8002, 8003

### Вариант Б: Запуск каждого сервера вручную (для отладки)

Открой **4 терминала** и выполни в каждом:

**Терминал 1 - Merchant Agent**:
```bash
cd /Users/frolov/projects/ai/AP2
uv run --package ap2-samples python -m roles.merchant_agent
```

**Терминал 2 - Credentials Provider**:
```bash
cd /Users/frolov/projects/ai/AP2
uv run --package ap2-samples python -m roles.credentials_provider_agent
```

**Терминал 3 - Payment Processor**:
```bash
cd /Users/frolov/projects/ai/AP2
uv run --package ap2-samples python -m roles.merchant_payment_processor_agent
```

**Терминал 4 - Shopping Agent**:
```bash
cd /Users/frolov/projects/ai/AP2
uv run --package ap2-samples adk web samples/python/src/roles
```

---

## 🌐 Шаг 5: Открыть UI

Открой браузер и перейди на:

**http://0.0.0.0:8000/dev-ui**

или

**http://localhost:8000/dev-ui**

**Что должен увидеть**:
- ADK (Agent Development Kit) UI
- Dropdown в верхнем левом углу с выбором агента

**Важно**: Выбери **`shopping_agent`** из dropdown!

---

## 💬 Шаг 6: Начать покупку

### Базовый сценарий

Напиши в чат:
```
I want to buy a coffee maker
```

### Verbose режим (для изучения)

Напиши:
```
I'm looking to buy a new pair of shoes. Could you be verbose as we do this, explaining what you're doing, and display all data payloads?
```

---

## 🎭 Шаг 7: Пройти весь flow

Агент будет вести тебя через следующие шаги:

### 7.1. Сбор информации
Агент задаст уточняющие вопросы:
- Какой товар именно?
- Нужна ли возможность возврата?
- Конкретный merchant или SKU?

### 7.2. Подтверждение IntentMandate
Агент покажет:
```
Please confirm the following details for your purchase:
  Item Description: High-quality coffee maker
  User Confirmation Required: Yes
  Merchants: Any
  SKUs: Any
  Refundable: Yes
  Expires: in 1 day

Shall I proceed?
```

Ответь: `yes`

### 7.3. Выбор товара
Агент покажет 3 варианта:
```
1. **Premium Coffee Maker**
   Price: $89.99
   Expires: in 2 hours
   Refund Period: 30 days

2. **Budget Coffee Maker**
   Price: $45.00
   ...
```

Выбери: `1` (или другой вариант)

### 7.4. Адрес доставки
```
Would you prefer to use a digital wallet to access your credentials for this purchase,
or would you like to enter your shipping address manually?
```

Ответь: `wallet` или `PayPal` или `Google Wallet`

Агент скажет:
```
This is where you might have to go through a redirect to prove your identity...
But this is a demo, so I will assume you have granted me access to your account,
with the login of bugsbunny@gmail.com.

Is that ok?
```

Ответь: `yes`

### 7.5. Выбор платежного метода
Агент покажет:
```
Order Summary:
  Merchant: Generic Merchant
  Item: Premium Coffee Maker
  Price Breakdown:
    Item: $89.99
    Shipping: $2.00
    Tax: $1.50
    Total: $93.49
  Expires: in 2 hours
  Refund Period: 30 days

Shipping Address:
  Bugs Bunny
  123 Main St
  Sample City, ST 00000
  US

Available payment methods:
1. American Express ending in 4444
2. American Express ending in 8888

Which payment method would you like to use?
```

Выбери: `1`

### 7.6. Финальное подтверждение
```
This is where you would be redirected to a trusted surface to confirm the purchase.
But this is a demo, so you can confirm your purchase here.

Final Cart:
  Item: Premium Coffee Maker - $89.99
  Shipping: $2.00
  Tax: $1.50
  Total: $93.49
  Valid for: 2 hours
  Refund Period: 30 days

Shipping Address: [показывает адрес]
Payment Method: American Express ending in 4444

Do you want to purchase this item?
```

Ответь: `yes` или `confirm`

### 7.7. OTP Challenge
```
The payment method issuer sent a verification code to the phone number on file,
please enter it below. It will be shared with the issuer so they can authorize
the transaction.

(Demo only hint: the code is 123)
```

Введи: `123`

### 7.8. Успех!
```
Payment Receipt:

Item: Premium Coffee Maker - $89.99
Shipping: $2.00
Tax: $1.50
Total: $93.49

Shipping Address:
  Bugs Bunny
  123 Main St
  Sample City, ST 00000
  US

Payment Method: American Express ending in 4444

Transaction completed successfully!
```

---

## 📊 Шаг 8: Изучение логов

### Watch Log (детальное логирование)

```bash
tail -f .logs/watch.log
```

**Что увидишь**:
- HTTP requests/responses (POST, JSON bodies)
- A2A Messages (TextParts, DataParts)
- AP2 Protocol objects (IntentMandate, CartMandate, PaymentMandate)

### Логи отдельных агентов

```bash
# Merchant Agent
tail -f .logs/merchant_agent.log

# Credentials Provider
tail -f .logs/credentials_provider_agent.log

# Payment Processor
tail -f .logs/mpp_agent.log
```

---

## 🛑 Остановка серверов

### Если запускал через run.sh

Нажми **Ctrl+C** в терминале где запущен run.sh

Скрипт автоматически убьет все фоновые процессы (cleanup trap).

### Если запускал вручную

В каждом терминале нажми **Ctrl+C**

### Принудительная остановка

Если что-то зависло:

```bash
# Найти процессы
lsof -ti:8000,8001,8002,8003

# Убить
kill -9 $(lsof -ti:8000,8001,8002,8003)
```

---

## 🧪 Тестовые данные

### Доступные пользователи

В Credentials Provider есть 3 предзаполненных аккаунта:

**1. bugsbunny@gmail.com**
- **Shipping Address**: 123 Main St, Sample City, ST 00000, US
- **Payment Methods**:
  - American Express ending in 4444 (DPAN)
  - American Express ending in 8888 (DPAN)
  - Bank Account (Primary bank account)
  - PayPal (Bugs's PayPal account)

**2. daffyduck@gmail.com**
- **Payment Methods**:
  - Bank Account (Main checking account)

**3. elmerfudd@gmail.com**
- **Payment Methods**:
  - PayPal (Fudd's PayPal)

### OTP код

При любом запросе OTP используй: **`123`**

---

## 🐛 Troubleshooting

### Проблема: "Please set your GOOGLE_API_KEY"

**Решение**:
```bash
# Проверь что ключ установлен
cat .env
# или
echo $GOOGLE_API_KEY

# Если нет, создай .env
echo "GOOGLE_API_KEY='your_key'" > .env
```

### Проблема: Port already in use (8000, 8001, 8002, 8003)

**Решение**:
```bash
# Найти что занимает порт
lsof -ti:8000

# Убить процесс
kill -9 $(lsof -ti:8000)

# Или все порты сразу
kill -9 $(lsof -ti:8000,8001,8002,8003)
```

### Проблема: uv command not found

**Решение**:
```bash
# Установить uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Перезапустить shell
source ~/.zshrc  # для zsh
# или
source ~/.bashrc  # для bash
```

### Проблема: ModuleNotFoundError

**Решение**:
```bash
# Переустановить зависимости
cd /Users/frolov/projects/ai/AP2
uv sync --package ap2-samples
```

### Проблема: UI показывает "No agents available"

**Решение**:
1. Убедись что выбрал `shopping_agent` в dropdown
2. Проверь что все 4 сервера запущены:
   ```bash
   lsof -ti:8000,8001,8002,8003
   ```
3. Перезапусти Shopping Agent

### Проблема: Агент не отвечает / зависает

**Решение**:
1. Проверь логи на ошибки:
   ```bash
   tail -20 .logs/merchant_agent.log
   tail -20 .logs/credentials_provider_agent.log
   tail -20 .logs/mpp_agent.log
   ```
2. Проверь что GOOGLE_API_KEY валидный
3. Перезапусти все сервера

### Проблема: "Extension not activated"

**Решение**:
- Это нормально если видишь в логах — AP2 extension должен автоматически активироваться
- Если ошибка блокирует работу, проверь что remote_agents.py правильно импортирован

---

## 📚 Дополнительные ресурсы

### Документация
- [AP2 Specification](docs/specification.md)
- [Core Concepts](docs/topics/core-concepts.md)
- [Life of a Transaction](docs/topics/life-of-a-transaction.md)
- [FAQ](docs/faq.md)

### Видео
- [AP2 Intro Video](https://goo.gle/ap2-video)
- [The Agent Factory - Episode 8](https://youtu.be/T1MtWnEYXM0)

### Код
- [Детальный анализ сценария](AP2_HUMAN_PRESENT_SCENARIO_ANALYSIS.md)
- [ADK Documentation](https://google.github.io/adk-docs/)
- [A2A Protocol](https://a2a-protocol.org/)

---

## 🎓 Следующие шаги

После успешного запуска можешь:

1. **Изучить verbose mode**:
   - Запроси verbose mode чтобы увидеть все JSON mandates
   - Изучи структуру IntentMandate, CartMandate, PaymentMandate

2. **Поэкспериментировать с разными товарами**:
   - "I want to buy running shoes"
   - "I need a new laptop"
   - "Looking for a guitar"

3. **Изучить код**:
   - `samples/python/src/roles/shopping_agent/` — логика Shopping Agent
   - `samples/python/src/roles/merchant_agent/` — генерация товаров через Gemini
   - `src/ap2/types/` — структуры данных протокола

4. **Модифицировать**:
   - Добавить новые товары в catalog_agent.py
   - Изменить payment methods в account_manager.py
   - Добавить новые challenge types в MPP

5. **Запустить Android сценарий**:
   - `samples/android/scenarios/digital-payment-credentials/`
   - Требует Android Studio и Android устройство/эмулятор

---

## ✅ Checklist для успешного запуска

- [ ] Python 3.10+ установлен
- [ ] uv установлен
- [ ] GOOGLE_API_KEY получен из Google AI Studio
- [ ] .env файл создан с ключом
- [ ] Порты 8000-8003 свободны
- [ ] run.sh запущен успешно
- [ ] Браузер открыт на http://localhost:8000/dev-ui
- [ ] shopping_agent выбран в dropdown
- [ ] Первое сообщение отправлено
- [ ] Агент ответил

**Если все пункты выполнены — готов к покупкам! 🎉**
