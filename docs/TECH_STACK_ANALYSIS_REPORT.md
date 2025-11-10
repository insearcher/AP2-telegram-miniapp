# 🔧 Технический стек AP2: Полный анализ для разработки Telegram Mini App

## 📊 Executive Summary

Данный отчет содержит детальный анализ технического стека проекта AP2 (Agent Payments Protocol) на основе изучения Python и Android samples. Информация может быть использована для разработки вашего Telegram Mini App с криптоплатежами.

---

## 🐍 Python Backend Stack

### 1. Core Dependencies

**Из `pyproject.toml`:**

```toml
[project]
dependencies = [
    "a2a-sdk",           # Agent-to-Agent SDK
    "absl-py",           # Google Abseil (flags, logging)
    "flask",             # Web framework
    "flask-cors",        # CORS support
    "google-adk",        # Agent Development Kit
    "google-genai",      # Gemini API
    "httpx",             # Async HTTP client
    "requests",          # HTTP client
    "ap2",               # AP2 types (Mandates)
    "pydantic"           # Data validation
]
requires-python = ">=3.10"
```

### 2. Key Libraries & Versions

| Библиотека | Назначение | Альтернативы |
|------------|------------|--------------|
| **a2a-sdk** | Agent-to-Agent протокол | Кастомный HTTP client |
| **google-adk** | Agent Development Kit (LLM agents) | LangChain, AutoGen |
| **google-genai** | Gemini API | OpenAI API, Anthropic |
| **pydantic** | Data validation & serialization | dataclasses, marshmallow |
| **flask** | Web framework | FastAPI, Django |
| **httpx** | Async HTTP client | aiohttp, requests |
| **starlette** | ASGI web framework | FastAPI |
| **uvicorn** | ASGI server | Gunicorn, Hypercorn |

---

## 🤖 Agent Development Kit (ADK)

### Что такое ADK?

**Google ADK** — фреймворк для создания AI-агентов на базе LLM.

**Основные возможности**:
- `LlmAgent` — базовый класс для LLM-агентов
- `tools` — декларативное описание инструментов для агента
- `instruction` — system prompt для агента
- `delegation` — делегирование задач другим агентам
- Web UI из коробки

### Пример использования (Shopping Agent):

```python
from google.adk.agents.llm_agent import LlmAgent
from common.retrying_llm_agent import RetryingLlmAgent

# Custom wrapper с retry logic
root_agent = RetryingLlmAgent(
    model="gemini-2.5-flash",
    name="root_agent",
    max_retries=5,
    instruction="""
        You are a shopping agent responsible for helping users find and
        purchase products from merchants.

        Follow these instructions...
    """,
    tools=[
        tools.create_payment_mandate,
        tools.initiate_payment,
        tools.update_cart,
    ],
)
```

**Запуск ADK Web Server:**

```bash
uv run --package ap2-samples adk web --host 0.0.0.0 --port 8080 samples/python/src/roles
```

**Что происходит**:
1. ADK сканирует `samples/python/src/roles/` в поисках агентов
2. Создает web UI на `/dev-ui`
3. Автоматически создает API endpoints для агентов
4. Обрабатывает chat messages и tool calls

---

## 🔌 A2A SDK (Agent-to-Agent)

### Что такое A2A?

**A2A (Agent-to-Agent)** — протокол для коммуникации между AI-агентами.

**Ключевые компоненты**:

### 1. AgentCard

**Файл**: `agent.json`

```json
{
  "name": "MerchantAgent",
  "description": "A sales assistant agent for a merchant.",
  "url": "http://localhost:8001/a2a/merchant_agent",
  "preferredTransport": "JSONRPC",
  "protocolVersion": "0.3.0",
  "version": "1.0.0",
  "defaultInputModes": ["json"],
  "defaultOutputModes": ["json"],
  "capabilities": {
    "extensions": [
      {
        "uri": "https://github.com/google-agentic-commerce/ap2/v1",
        "description": "Supports the Agent Payments Protocol.",
        "required": true
      }
    ]
  },
  "skills": [
    {
      "id": "search_catalog",
      "name": "Search Catalog",
      "description": "Searches the merchant's catalog...",
      "parameters": {...}
    }
  ]
}
```

**AgentCard доступен по**: `{base_url}/.well-known/agent-card.json`

### 2. A2A Message Structure

**Python types** (из `a2a-sdk`):

```python
from a2a.types import Message, Part, TextPart, DataPart, Role

message = Message(
    message_id="uuid",
    context_id="conversation_uuid",  # Optional, для продолжения диалога
    parts=[
        Part(root=TextPart(text="Find products that match...")),
        Part(root=DataPart(data={
            "ap2.mandates.IntentMandate": {...},
            "risk_data": "...",
            "debug_mode": True,
        }))
    ],
    role=Role.agent  # или Role.user
)
```

### 3. A2A Communication Pattern

**Client side** (отправка message):

```python
from common.payment_remote_a2a_client import PaymentRemoteA2aClient

client = PaymentRemoteA2aClient(
    name="merchant_agent",
    base_url="http://localhost:8001/a2a/merchant_agent",
    required_extensions={"https://github.com/google-agentic-commerce/ap2/v1"}
)

# Fetch AgentCard
agent_card = await client.get_agent_card()

# Send message
message = Message(...)
task = await client.send_a2a_message(message)

# Task содержит response
print(task.status.state)  # 'completed', 'failed', 'input_required'
print(task.artifacts)     # Response data
```

**Server side** (обработка message):

```python
from a2a.server.agent_execution.agent_executor import AgentExecutor
from common.base_server_executor import BaseServerExecutor

class MerchantAgentExecutor(BaseServerExecutor):
    def __init__(self, supported_extensions: list[dict] = None):
        agent_tools = [
            tools.update_cart,
            tools.find_items_workflow,
            tools.initiate_payment,
        ]
        system_prompt = "You are a merchant agent..."
        super().__init__(supported_extensions, agent_tools, system_prompt)

# Запуск сервера
server.run_agent_blocking(
    port=8001,
    agent_card=agent_card,
    executor=MerchantAgentExecutor(agent_card.capabilities.extensions),
    rpc_url="/a2a/merchant_agent",
)
```

### 4. A2A Extension Header

**Каждый HTTP request** должен включать:

```python
headers = {
    'X-A2A-Extensions': 'https://github.com/google-agentic-commerce/ap2/v1'
}
```

**Сервер** проверяет и активирует extensions:

```python
def _handle_extensions(self, context: RequestContext) -> None:
    requested_uris = context.requested_extensions
    activated_uris = requested_uris.intersection(self._supported_extension_uris)
    for uri in activated_uris:
        context.add_activated_extension(uri)
```

---

## 🏗️ Server Architecture

### 1. Starlette + Uvicorn Stack

**Из `common/server.py`:**

```python
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
from a2a.server.apps.jsonrpc.starlette_app import A2AStarletteApplication

# Build Starlette app
app = A2AStarletteApplication(
    agent_card=agent_card,
    http_handler=DefaultRequestHandler(
        agent_executor=executor,
        task_store=InMemoryTaskStore(),
        request_context_builder=SimpleRequestContextBuilder(),
    )
).build(
    rpc_url="/a2a/merchant_agent",
    agent_card_url="/a2a/merchant_agent/.well-known/agent-card.json"
)

# Add CORS
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# Run server
uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
```

### 2. Request Handler Flow

```
HTTP Request
    ↓
Logging Middleware (logs request/response)
    ↓
CORS Middleware
    ↓
A2A Starlette App
    ↓
DefaultRequestHandler
    ↓
AgentExecutor.execute(context, event_queue)
    ↓
BaseServerExecutor._handle_extensions()
    ↓
BaseServerExecutor._handle_request()
    ↓
FunctionCallResolver.determine_tool_to_use(prompt)
    ↓
tool(data_parts, updater, current_task)
    ↓
TaskUpdater (complete/failed/requires_input)
    ↓
HTTP Response (JSON-RPC)
```

### 3. Function Call Resolver

**Использует Gemini** для выбора tool:

```python
from common.function_call_resolver import FunctionCallResolver

resolver = FunctionCallResolver(
    client=genai.Client(),
    tools=agent_tools,
    system_prompt=system_prompt
)

# Gemini выбирает какой tool вызвать
tool_name = resolver.determine_tool_to_use(prompt="Find products...")
```

---

## 📱 Android Client Stack

### 1. Core Dependencies

**Из `build.gradle.kts`:**

```kotlin
dependencies {
    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")

    // Jetpack Compose
    implementation(platform("androidx.compose:compose-bom:2024.02.02"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.8.2")

    // ViewModel & State
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Ktor (HTTP Client)
    implementation("io.ktor:ktor-client-core:2.3.8")
    implementation("io.ktor:ktor-client-android:2.3.8")
    implementation("io.ktor:ktor-client-content-negotiation:2.3.8")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.8")
    implementation("io.ktor:ktor-client-logging:2.3.8")

    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Gemini AI
    implementation("com.google.ai.client.generativeai:generativeai:0.9.0")

    // Android Credentials API
    implementation("androidx.credentials:credentials:1.5.0")
}
```

### 2. A2A Client Implementation

**Файл**: `A2aClient.kt`

```kotlin
class A2aClient(val name: String, val baseUrl: String, val agentCard: AgentCard? = null) {
    private val json = Json {
        prettyPrint = true
        isLenient = true
        ignoreUnknownKeys = true
        classDiscriminator = "kind"
        encodeDefaults = true
    }

    private val client = HttpClient(CIO) {
        install(ContentNegotiation) { json(json) }
        install(Logging) {
            logger = object : Logger {
                override fun log(message: String) {
                    Log.d(TAG, "Ktor Log: $message")
                }
            }
            level = LogLevel.ALL
        }
    }

    suspend fun sendMessage(message: Message): JsonObject {
        val request = JsonRpcRequest(params = RpcParams(message = message))

        val response: JsonObject = client
            .post(baseUrl) {
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Accept, "*/*")
                    append("X-A2A-Extensions", "https://github.com/google-agentic-commerce/ap2/v1")
                }
                setBody(request)
            }
            .body()

        return response
    }

    companion object {
        suspend fun setUpClient(name: String, url: String): A2aClient {
            val agentCardUrl = "$url/.well-known/agent-card.json"
            val card: AgentCard = httpClient.get(agentCardUrl).body()
            return A2aClient(name, url, card)
        }
    }
}
```

### 3. A2A Message Builder

**Файл**: `A2aMessageBuilder.kt`

```kotlin
class A2aMessageBuilder {
    val parts = mutableListOf<Part>()
    private var contextId: String? = null

    fun addText(text: String): A2aMessageBuilder {
        parts.add(TextPart(text))
        return this
    }

    inline fun <reified T> addData(key: String = "", data: T): A2aMessageBuilder {
        val jsonData = json.encodeToJsonElement(serializer(), data)

        val finalData = if (key.isNotBlank()) {
            JsonObject(mapOf(key to jsonData))
        } else {
            jsonData
        }
        parts.add(DataPart(finalData))
        return this
    }

    fun setContextId(contextId: String): A2aMessageBuilder {
        this.contextId = contextId
        return this
    }

    fun build(): Message {
        this.addData("shopping_agent_id", SHOPPING_AGENT_ID)
        return Message(
            messageId = UUID.randomUUID().toString().replace("-", ""),
            contextId = this.contextId,
            parts = parts,
            role = Role.AGENT,
        )
    }
}
```

### 4. A2A Types

**Файл**: `A2aTypes.kt`

```kotlin
@Serializable
enum class Role {
    @SerialName("agent") AGENT,
    @SerialName("user") USER,
}

@Serializable
sealed interface Part

@Serializable
@SerialName("text")
data class TextPart(val text: String) : Part

@Serializable
@SerialName("data")
data class DataPart(val data: JsonElement) : Part

@Serializable
data class Message(
    val kind: String = "message",
    @SerialName("messageId") val messageId: String,
    @SerialName("contextId") val contextId: String? = null,
    val parts: List<Part>,
    val role: Role,
)

@Serializable
data class AgentCard(
    val name: String,
    val description: String,
    val url: String,
    val skills: List<Skill>,
)
```

---

## 🎯 Рекомендации для Telegram Mini App

### Option 1: TypeScript A2A Client (Рекомендуется)

**Структура проекта**:

```
telegram-miniapp/
├── src/
│   ├── api/
│   │   ├── a2aClient.ts          # HTTP клиент для A2A
│   │   ├── a2aMessageBuilder.ts  # Builder для messages
│   │   └── a2aTypes.ts           # TypeScript types
│   ├── components/
│   │   ├── ChatInterface.tsx
│   │   └── PaymentFlow.tsx
│   └── hooks/
│       ├── useShoppingAgent.ts
│       └── useWallet.ts
```

**Пример `a2aTypes.ts`**:

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
      description: string;
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

**Пример `a2aClient.ts`**:

```typescript
export class A2aClient {
  private baseUrl: string;
  private agentCard: AgentCard | null = null;
  private extensionUris: Set<string>;

  constructor(baseUrl: string, extensionUris: string[] = []) {
    this.baseUrl = baseUrl;
    this.extensionUris = new Set(extensionUris);
  }

  async fetchAgentCard(): Promise<AgentCard> {
    const url = `${this.baseUrl}/.well-known/agent-card.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch AgentCard: ${response.statusText}`);
    }
    this.agentCard = await response.json();
    return this.agentCard;
  }

  async sendMessage(message: Message): Promise<any> {
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
        'X-A2A-Extensions': Array.from(this.extensionUris).join(', '),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`A2A request failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }
}
```

**Пример `a2aMessageBuilder.ts`**:

```typescript
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

**Пример использования**:

```typescript
// Initialize client
const client = new A2aClient(
  'http://localhost:8080/a2a/shopping_agent',
  ['https://github.com/google-agentic-commerce/ap2/v1']
);

// Fetch AgentCard
await client.fetchAgentCard();

// Build message
const message = new A2aMessageBuilder()
  .addText('I want to buy a coffee maker')
  .addData('risk_data', 'fake_jwt_token')
  .build();

// Send message
const response = await client.sendMessage(message);
console.log(response);
```

### Option 2: Использовать ADK Web UI напрямую

**Если не хочется писать свой A2A клиент**, можно встроить ADK Web UI в iframe:

```typescript
// Telegram Mini App
const tg = window.Telegram.WebApp;
tg.ready();

// Embed ADK UI
<iframe
  src="http://your-backend.com:8080/dev-ui"
  style={{ width: '100%', height: '100vh' }}
/>
```

**Минусы**:
- Нет контроля над UI
- Тяжелее интегрировать crypto wallet
- Нет Telegram биометрии

---

## 📦 Dependency Management

### Python: uv

**`uv`** — современный Python package manager (быстрее pip):

```bash
# Install dependencies
uv sync

# Run command
uv run --package ap2-samples python -m roles.merchant_agent

# Run ADK
uv run --package ap2-samples adk web samples/python/src/roles
```

**Workspace structure**:

```toml
[tool.uv.workspace]
members = ["samples/python"]
```

### Android: Gradle

**Version Catalog** (`libs.versions.toml`):

```toml
[versions]
kotlin = "2.0.0"
compose = "2024.04.01"

[libraries]
generativeai = { group = "com.google.ai.client.generativeai", name = "generativeai", version = "0.9.0" }
```

---

## 🔐 Security & Trust

### 1. Extension Validation

**Сервер** проверяет что клиент поддерживает AP2 extension:

```python
if EXTENSION_URI not in context.call_context.activated_extensions:
    raise ValueError("Payment extension not activated.")
```

### 2. Shopping Agent Allowlist

**Merchant Agent** проверяет ID клиента:

```python
_KNOWN_SHOPPING_AGENTS = ["trusted_shopping_agent"]

shopping_agent_id = message_utils.find_data_part("shopping_agent_id", data_parts)
if shopping_agent_id not in _KNOWN_SHOPPING_AGENTS:
    await _fail_task(updater, f"Unauthorized Request: Unknown agent '{shopping_agent_id}'.")
```

### 3. PaymentMandate Signature Validation

```python
from common.validation import validate_payment_mandate_signature

payment_mandate = message_utils.find_data_part(PAYMENT_MANDATE_DATA_KEY, data_parts)
if payment_mandate is not None:
    validate_payment_mandate_signature(PaymentMandate.model_validate(payment_mandate))
```

---

## 📊 Comparison: Python vs Android vs TypeScript

| Aspect | Python (ADK) | Android (Kotlin) | TypeScript (для TMA) |
|--------|--------------|------------------|----------------------|
| **A2A SDK** | ✅ Official SDK | ❌ Custom implementation | ❌ Custom (но простой) |
| **Message Builder** | ✅ Встроен | ✅ Custom | 🔄 Нужно написать |
| **Agent Executor** | ✅ LlmAgent | ❌ Ktor client only | ❌ HTTP client only |
| **Gemini Integration** | ✅ google-genai | ✅ generativeai SDK | ✅ @google/generative-ai |
| **UI Framework** | ✅ ADK Web UI | ✅ Jetpack Compose | ✅ React/Vue |
| **HTTP Client** | httpx | Ktor | fetch API |
| **Serialization** | Pydantic | Kotlinx Serialization | JSON.stringify/parse |
| **Сложность** | Средняя | Высокая | Низкая |
| **Для Telegram** | ❌ Backend only | ❌ Mobile only | ✅ **Идеально** |

---

## 🎯 Рекомендованный стек для вашего Telegram Mini App

### Frontend (Telegram Mini App):

```
React 18 + TypeScript
    ↓
Custom A2A Client (TypeScript, ~200 LOC)
    ↓
Wagmi + Wallet Connect (для crypto)
    ↓
Telegram Web Apps SDK
```

### Backend (можно использовать текущий):

```
Python 3.10+
    ↓
google-adk + a2a-sdk
    ↓
Shopping Agent (уже есть)
Merchant Agent (модифицировать для crypto)
Credentials Provider (модифицировать для crypto wallets)
Payment Processor (модифицировать для testnet)
```

### Modifications для crypto:

**1. Credentials Provider** — добавить crypto wallets:

```python
"wallet1": {
    "type": "CRYPTO_WALLET",
    "alias": "MetaMask Sepolia",
    "network": "ethereum",
    "chain_id": 11155111,
    "address": "0x...",
}
```

**2. Payment Processor** — verify testnet transactions:

```python
async def verify_testnet_transaction(wallet_address: str, amount: float, token: str):
    from web3 import Web3
    w3 = Web3(Web3.HTTPProvider('https://sepolia.infura.io/v3/YOUR_KEY'))
    balance = w3.eth.get_balance(wallet_address)
    return balance >= w3.to_wei(amount, 'ether')
```

**3. Catalog Agent** — static catalog вместо Gemini generation.

---

## 🚀 Next Steps

### 1. Setup Development Environment

```bash
# Python backend (уже готов)
cd /Users/frolov/projects/ai/AP2
bash samples/python/scenarios/a2a/human-present/cards/run.sh

# TypeScript frontend (нужно создать)
cd telegram-miniapp
npm create vite@latest . -- --template react-ts
npm install
```

### 2. Install Dependencies

**Frontend**:

```bash
npm install @telegram-apps/sdk wagmi viem @tanstack/react-query
```

**Backend** (модификации):

```bash
pip install web3 eth-utils
```

### 3. Create Telegram Bot

```bash
1. Open @BotFather in Telegram
2. /newbot → create bot
3. /setmenubutton → set Web App URL
4. Get bot token
```

### 4. Get API Keys

- ✅ Google API Key (уже есть)
- 🆕 WalletConnect Project ID: https://cloud.walletconnect.com/
- 🆕 Infura API Key: https://infura.io/

### 5. Start Development

**Phase 1**: TypeScript A2A Client
**Phase 2**: React UI + Telegram SDK
**Phase 3**: Wagmi + Wallet Connect
**Phase 4**: Backend modifications для crypto

---

## 📚 Resources

### Documentation:
- **A2A Protocol**: https://a2a-protocol.org/
- **Google ADK**: https://google.github.io/adk-docs/
- **AP2 Spec**: https://github.com/google-agentic-commerce/AP2
- **Telegram Mini Apps**: https://core.telegram.org/bots/webapps

### Libraries:
- **a2a-sdk (Python)**: https://pypi.org/project/a2a-sdk/
- **google-adk (Python)**: https://pypi.org/project/google-adk/
- **Wagmi (TypeScript)**: https://wagmi.sh/
- **Telegram SDK (TypeScript)**: https://www.npmjs.com/package/@telegram-apps/sdk

### Code Examples:
- Python samples: `/Users/frolov/projects/ai/AP2/samples/python/`
- Android samples: `/Users/frolov/projects/ai/AP2/samples/android/`

---

## ✅ Conclusion

**Технический стек AP2** хорошо структурирован и модулен. Для вашего Telegram Mini App рекомендуется:

1. ✅ **Использовать существующий Python backend** (Shopping Agent, Merchant Agent, etc.)
2. ✅ **Написать custom TypeScript A2A Client** (~200 строк кода)
3. ✅ **React + Telegram SDK** для UI
4. ✅ **Wagmi + WalletConnect** для crypto
5. ✅ **Модифицировать backend** для поддержки crypto wallets и testnet

**Estimated effort**: ~3-4 недели для полного MVP.

Готов начать разработку! 🚀
