# Technical Documentation - Pagsmile Payment Integration

## 🇬🇧 English Version

### Architecture Overview

This application is a complete credit card payment integration with Pagsmile API, built with Bun runtime and TypeScript. The architecture follows a clean separation between frontend and backend, with well-defined services and clear responsibilities.

---

## Backend Flow

### 1. **Server Initialization** (`index.ts`)

**What it does:**
- Loads environment configuration from `.env` file
- Initializes all services (PagsmileClient, OrderService, TransactionService, WebhookHandler)
- Sets up HTTP routes using Bun's native routing
- Starts the web server on port 3000

**Key Steps:**
1. Load Pagsmile configuration (App ID, Security Key, Public Key, URLs)
2. Create authenticated HTTP client with Basic Auth
3. Initialize service layer with dependency injection
4. Configure webhook event handlers for payment success/failure
5. Mount API routes and static file serving
6. Start HTTP server with HMR (Hot Module Reload) for development

---

### 2. **Configuration Service** (`src/config/pagsmile.ts`)

**What it does:**
- Validates and loads environment variables
- Provides centralized configuration object
- Ensures required credentials are present

**Environment Variables:**
- `PAGSMILE_APP_ID`: Application identifier
- `PAGSMILE_SECURITY_KEY`: Secret key for API authentication
- `PAGSMILE_PUBLIC_KEY`: Public key for frontend SDK
- `PAGSMILE_NOTIFY_URL`: Webhook callback URL
- `PAGSMILE_RETURN_URL`: Customer redirect URL after payment
- `PAGSMILE_ENVIRONMENT`: Environment mode (sandbox/prod)

---

### 3. **API Routes** (`src/routes/api-routes.ts`)

#### **GET /api/config**
**Purpose:** Provides public configuration to frontend

**Flow:**
1. Receives request from frontend
2. Extracts only public data (App ID, Public Key, Environment, Region)
3. Returns JSON response without exposing secrets

**Response:**
```json
{
  "app_id": "your_app_id",
  "public_key": "your_public_key",
  "env": "prod",
  "region_code": "BRA"
}
```

---

#### **POST /api/create-order**
**Purpose:** Creates a new payment order with Pagsmile

**Request Body:**
```json
{
  "amount": "100.00",
  "customerInfo": {
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999999999",
    "cpf": "12345678900",
    "zipCode": "01310100",
    "state": "SP",
    "city": "São Paulo",
    "address": "Avenida Paulista, 1000"
  }
}
```

**Flow:**
1. Validates request body (amount and customerInfo are required)
2. Extracts request metadata (User-Agent, IP Address from headers)
3. Calls OrderService.createOrder()
4. Returns prepay_id, trade_no, and out_trade_no to frontend

**Response:**
```json
{
  "success": true,
  "prepay_id": "PAY_xxxx",
  "trade_no": "TRD_xxxx",
  "out_trade_no": "ORDER_xxxx"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message description"
}
```

---

#### **GET /api/query-transaction/:tradeNo**
**Purpose:** Queries the current status of a payment transaction

**Flow:**
1. Receives trade_no as URL parameter
2. Validates trade_no is not empty
3. Calls TransactionService.queryTransaction()
4. Returns full transaction status from Pagsmile

**Response:**
```json
{
  "code": "10000",
  "msg": "Success",
  "trade_status": "SUCCESS",
  "trade_no": "TRD_xxxx",
  "out_trade_no": "ORDER_xxxx",
  "order_amount": "100.00",
  "order_currency": "BRL"
}
```

---

#### **POST /api/webhook/payment**
**Purpose:** Receives payment status notifications from Pagsmile

**Flow:**
1. Receives webhook payload from Pagsmile servers
2. Validates payload structure
3. Calls WebhookHandler.processWebhook()
4. Triggers appropriate callback (onSuccess or onFailed)
5. Always returns success to acknowledge receipt

**Webhook Payload:**
```json
{
  "trade_no": "TRD_xxxx",
  "out_trade_no": "ORDER_xxxx",
  "trade_status": "SUCCESS",
  "order_amount": 100.00,
  "order_currency": "BRL",
  "method": "CreditCard"
}
```

---

### 4. **Order Service** (`src/services/order-service.ts`)

**Responsibilities:**
- Validates customer information
- Generates unique order identifiers
- Formats requests according to Pagsmile API specification
- Calls Pagsmile API to create orders

**Validation Rules:**
- Name: minimum 3 characters
- Email: must contain @
- CPF: exactly 11 digits
- Phone: minimum 10 digits
- ZIP Code: exactly 8 digits
- State: exactly 2 characters
- City: minimum 2 characters
- Address: minimum 5 characters

**Order ID Generation:**
```
FORMAT: ORDER_{timestamp}_{random}
EXAMPLE: ORDER_1702656789123_abc123xyz
```

**Timestamp Format:**
```
FORMAT: YYYY-MM-DD HH:MM:SS
EXAMPLE: 2024-12-15 14:30:45
```

**API Request to Pagsmile:**
```json
{
  "app_id": "your_app_id",
  "out_trade_no": "ORDER_1702656789123_abc123xyz",
  "method": "CreditCard",
  "order_amount": "100.00",
  "order_currency": "BRL",
  "subject": "Product Payment",
  "content": "Credit card payment",
  "trade_type": "API",
  "timestamp": "2024-12-15 14:30:45",
  "notify_url": "https://your-domain.com/api/webhook/payment",
  "return_url": "https://your-domain.com/success",
  "timeout_express": "1d",
  "version": "2.0",
  "buyer_id": "customer@email.com",
  "customer": {
    "identify": {
      "type": "CPF",
      "number": "12345678900"
    },
    "name": "João Silva",
    "email": "customer@email.com",
    "phone": "11999999999"
  },
  "address": {
    "zip_code": "01310100",
    "state": "SP",
    "city": "São Paulo",
    "street_name": "Avenida Paulista, 1000",
    "street_number": "1000"
  },
  "device_info": {
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.1"
  }
}
```

---

### 5. **Pagsmile HTTP Client** (`src/services/pagsmile-client.ts`)

**Responsibilities:**
- Manages HTTP communication with Pagsmile API
- Handles authentication using Basic Auth
- Provides generic POST and GET methods
- Logs requests and responses for debugging

**Authentication:**
```
Method: Basic Authentication
Format: Base64(app_id:security_key)
Header: Authorization: Basic {encoded_credentials}
```

**Base URL:**
```
API Gateway: https://gateway.pagsmile.com
(The API automatically routes to sandbox or production based on your credentials)
```

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Basic {base64_credentials}"
}
```

**Error Handling:**
- Throws error on non-2xx HTTP status codes
- Includes full error body in exception message
- Logs all requests and responses with timing information

---

### 6. **Transaction Service** (`src/services/transaction-service.ts`)

**Responsibilities:**
- Queries payment transaction status
- Validates trade numbers
- Formats query requests to Pagsmile API

**Query Request:**
```json
{
  "app_id": "your_app_id",
  "timestamp": "2024-12-15 14:30:45",
  "trade_no": "TRD_xxxx"
}
```

**Possible Transaction Statuses:**
- `SUCCESS`: Payment completed successfully
- `PENDING`: Payment in progress
- `PROCESSING`: Payment being processed
- `FAILED`: Payment failed
- `CANCELLED`: Payment cancelled by user or system

---

### 7. **Webhook Handler** (`src/services/webhook-handler.ts`)

**Responsibilities:**
- Validates webhook payloads from Pagsmile
- Maps payloads to internal event format
- Routes events to appropriate callbacks
- Provides extensible event handling system

**Event Types:**
1. **SUCCESS**: Payment approved and completed
2. **FAILED**: Payment declined or failed
3. **CANCELLED**: Payment cancelled
4. **Other statuses**: Logged but no specific action

**Callback Functions:**
- `onSuccess(event)`: Called when payment succeeds
- `onFailed(event)`: Called when payment fails

**Event Object:**
```typescript
{
  tradeNo: string,        // Pagsmile transaction ID
  outTradeNo: string,     // Your order ID
  status: TradeStatus,    // Current status
  amount: number,         // Order amount
  currency: string,       // Currency (BRL)
  method: string          // Payment method (CreditCard)
}
```

---

## Frontend Flow

### 1. **Page Load** (`public/index.html`)

**What happens:**
1. Browser loads HTML page
2. Pagsmile SDK script loaded from CDN
3. TypeScript module loaded and executed
4. Form rendered with all input fields
5. Event listeners attached

**Form Sections:**
- **Customer Data**: Name, email, CPF, phone, address
- **Payment Data**: Amount and installments
- **Card Data**: Card holder name, number, expiry, CVV

---

### 2. **User Interaction** (`public/payment.ts`)

#### **Step 1: User Fills Form**
- All fields are validated by HTML5 constraints
- Required fields, patterns, and lengths enforced by browser

#### **Step 2: User Clicks "Pay" Button**
**Trigger:** Form submit event

**Actions:**
1. Prevent default form submission
2. Hide any previous status messages
3. Show loading indicator
4. Disable submit button to prevent double-clicks

---

### 3. **Form Data Collection**

**Function:** `getFormData()`

**What it does:**
1. Reads all form fields using FormData API
2. Structures data into typed objects
3. Parses numeric values (amount, installments)

**Output:**
```typescript
{
  amount: "100.00",
  installments: 3,
  customerInfo: {
    name: "João Silva",
    email: "joao@email.com",
    phone: "11999999999",
    cpf: "12345678900",
    zipCode: "01310100",
    city: "São Paulo",
    state: "SP",
    address: "Avenida Paulista, 1000"
  }
}
```

---

### 4. **SDK Configuration Fetch**

**Function:** `fetchSdkConfig()`

**Flow:**
1. Calls `GET /api/config` endpoint
2. Receives public configuration from backend
3. Returns typed configuration object

**Purpose:**
- Ensures frontend uses correct App ID and Public Key
- Maintains environment consistency (sandbox/prod)
- Centralizes configuration management

---

### 5. **Backend Order Creation**

**Function:** `createBackendOrder(amount, customerInfo)`

**Flow:**
1. Prepares request body with amount and customer data
2. Calls `POST /api/create-order` endpoint
3. Backend validates data and creates order with Pagsmile
4. Returns prepay_id (required for SDK initialization)

**Critical Data Received:**
- `prepay_id`: Pre-payment identifier for SDK
- `trade_no`: Pagsmile transaction number (for status queries)
- `out_trade_no`: Your internal order number

---

### 6. **Pagsmile SDK Initialization**

**Function:** `initializePagsmileSdk(sdkConfig, prepayId)`

**Flow:**
1. Calls `Pagsmile.setPublishableKey()` with configuration
2. Binds SDK to card input fields using ID selectors
3. SDK encrypts card data on client side
4. Returns initialized PagsmileClient instance

**Field Bindings:**
```typescript
{
  card_name: { id_selector: "card-name" },
  card_number: { id_selector: "card-number" },
  expiration_month: { id_selector: "exp-month" },
  expiration_year: { id_selector: "exp-year" },
  cvv: { id_selector: "card-cvv" }
}
```

**Security:**
- Card data never sent to your backend
- SDK encrypts sensitive data before transmission
- Only Pagsmile receives raw card information

---

### 7. **Payment Submission**

**Function:** `submitPayment(client, customerInfo, installments)`

**Flow:**
1. Collects device information (browser fingerprint)
2. Builds payment data object
3. Calls `client.createOrder()` (Pagsmile SDK method)
4. SDK sends encrypted card data directly to Pagsmile
5. Returns payment result

**Device Information Collected:**
```typescript
{
  user_agent: "Mozilla/5.0...",
  browser_language: "pt-BR",
  browser_color_depth: "24",
  browser_screen_height: "1080",
  browser_screen_width: "1920",
  browser_time_zone: "-180"  // Offset in minutes
}
```

**Payment Data Structure:**
```typescript
{
  phone: "11999999999",
  email: "joao@email.com",
  postal_code: "01310100",
  payer_id: "12345678900",  // CPF
  installments: { stage: 3 },
  address: {
    country_code: "BRA",
    zip_code: "01310100",
    state: "SP",
    city: "São Paulo",
    street: "Avenida Paulista, 1000"
  },
  device_info: { /* browser data */ }
}
```

---

### 8. **Payment Result Handling**

**Possible Results:**

#### **Scenario A: Immediate Success**
```typescript
{ status: "success", query: false }
```
**Actions:**
1. Show success message
2. Reset form
3. Hide loading indicator

#### **Scenario B: Success with Query Required**
```typescript
{ status: "success", query: true }
```
**Actions:**
1. Show "Verifying payment status..." message
2. Start polling transaction status
3. Wait for final confirmation

#### **Scenario C: Error**
```typescript
{ status: "error", message: "Error description" }
```
**Actions:**
1. Show error message
2. Keep form data
3. Allow user to retry

---

### 9. **Transaction Status Polling**

**Function:** `pollTransactionStatus(tradeNo, maxAttempts, intervalMs)`

**Why Needed:**
- Some payment methods require asynchronous processing
- 3D Secure authentication may delay confirmation
- Anti-fraud checks can take time

**Flow:**
1. Calls `GET /api/query-transaction/${tradeNo}`
2. Checks transaction status
3. If PENDING/PROCESSING: wait 2 seconds and retry
4. If SUCCESS/FAILED/CANCELLED: return final status
5. Maximum 10 attempts (20 seconds total)
6. After timeout: show "processing" message

**Polling Strategy:**
```
Attempt 1: 0s   -> Query status
Attempt 2: 2s   -> Query status
Attempt 3: 4s   -> Query status
...
Attempt 10: 18s -> Query status
Timeout: 20s    -> Show processing message
```

**Final Status Handling:**
- `SUCCESS`: Show success, reset form
- `FAILED/CANCELLED`: Show error, keep form data
- `TIMEOUT`: Show processing message, don't reset form

---

### 10. **UI Status Updates**

**Loading States:**

1. **Loading Indicator** (`showLoading`)
   - Displays spinner animation
   - Disables submit button
   - Shows "Processing payment..." text

2. **Status Messages** (`showStatus`)
   - **Processing** (⋯): Yellow background
   - **Success** (✓): Green background
   - **Error** (✗): Red background

**User-Facing Messages:**
- "Creating order..." (Criando pedido...)
- "Initializing payment..." (Inicializando pagamento...)
- "Processing payment..." (Processando pagamento...)
- "Verifying payment status..." (Verificando status do pagamento...)
- "Payment completed successfully!" (Pagamento realizado com sucesso!)
- "Payment processing. Check your email for confirmation." (Pagamento em processamento...)
- "Error: [description]" (Erro: [descrição])

---

## Complete Payment Flow Diagram

```
USER                   FRONTEND                 BACKEND                 PAGSMILE API
 |                        |                        |                         |
 |--[Fill Form]---------->|                        |                         |
 |                        |                        |                         |
 |--[Click Pay]---------->|                        |                         |
 |                        |                        |                         |
 |                        |--[GET /api/config]---->|                         |
 |                        |<--[SDK Config]---------|                         |
 |                        |                        |                         |
 |                        |--[POST create-order]-->|                         |
 |                        |                        |--[POST /trade/create]-->|
 |                        |                        |<--[prepay_id]-----------|
 |                        |<--[prepay_id]----------|                         |
 |                        |                        |                         |
 |                        |--[Initialize SDK]------|-----[Set Config]------->|
 |                        |                        |                         |
 |                        |--[Submit Payment]------|--[Encrypted Card Data]->|
 |                        |                        |                         |
 |                        |                        |                         |
 |                        |<--[Payment Result]-----|<--[Process Payment]-----|
 |                        |                        |                         |
 |                        |--[Poll Status]-------->|                         |
 |                        |                        |--[POST /trade/query]--->|
 |                        |<--[Status]-----------  |<--[Status]--------------|
 |                        |                        |                         |
 |                        |                        |<--[Webhook Callback]----|
 |                        |                        |--[Process Event]------->|
 |                        |                        |                         |
 |<--[Show Success]-------|                        |                         |
```

---

## Error Handling Strategy

### Frontend Errors

1. **Network Errors**
   - Caught by try-catch blocks
   - Displayed to user with retry option
   - Logged to console for debugging

2. **Validation Errors**
   - Caught before API calls
   - HTML5 validation prevents submission
   - Custom validation in services

3. **API Errors**
   - Parsed from response
   - User-friendly messages displayed
   - Technical details logged

### Backend Errors

1. **Validation Errors**
   - Return 400 status code
   - Include field-specific error messages
   - Prevent invalid data from reaching Pagsmile

2. **External API Errors**
   - Return 500 status code
   - Log full error details
   - Return safe error message to frontend

3. **Authentication Errors**
   - Fail fast on startup if config invalid
   - Never expose credentials in logs or responses

---

## Security Considerations

### Card Data Security

1. **PCI DSS Compliance**
   - Card data never sent to your backend
   - Pagsmile SDK handles all card encryption
   - Your servers never store or process card numbers

2. **Data Flow**
   ```
   User Input -> Pagsmile SDK -> Encrypted -> Pagsmile API
   (Card data never touches your backend)
   ```

### API Security

1. **Authentication**
   - Basic Auth with App ID and Security Key
   - Credentials stored in environment variables
   - Never exposed to frontend

2. **HTTPS Only**
   - All production traffic must use HTTPS
   - Enforced by Pagsmile API
   - Configure in production environment

### Webhook Security

1. **Signature Validation**
   - Implement signature verification in production
   - Validate webhook source is Pagsmile
   - Prevent replay attacks

2. **Idempotency**
   - Handle duplicate webhook calls
   - Store processed transaction IDs
   - Avoid duplicate order processing

---

## Development vs Production

### Sandbox Environment

- **Purpose**: Testing without real money
- **Base URL**: `https://gateway.pagsmile.com`
- **Credentials**: Use sandbox App ID and Security Key
- **Test Cards**: Use Pagsmile-provided test card numbers
- **Webhooks**: May need tunneling service (ngrok, localtunnel)

### Production Environment

- **Purpose**: Real transactions
- **Base URL**: `https://gateway.pagsmile.com`
- **Credentials**: Use production App ID and Security Key
- **Real Cards**: Actual customer cards
- **Webhooks**: Must be publicly accessible HTTPS endpoint
- **Monitoring**: Implement logging and alerting

---

## Configuration Checklist

### Environment Variables
- [ ] `PAGSMILE_APP_ID`
- [ ] `PAGSMILE_SECURITY_KEY`
- [ ] `PAGSMILE_PUBLIC_KEY`
- [ ] `PAGSMILE_NOTIFY_URL` (webhook endpoint)
- [ ] `PAGSMILE_RETURN_URL` (success page)
- [ ] `PAGSMILE_ENVIRONMENT` (sandbox/prod)

### Infrastructure
- [ ] Server accessible from internet
- [ ] HTTPS certificate configured (production)
- [ ] Webhook endpoint publicly accessible
- [ ] Firewall rules allow Pagsmile IPs
- [ ] Database for storing orders (optional)
- [ ] Logging system configured

---

## Testing Guide

### Manual Testing Flow

1. **Test Card Numbers** (Sandbox)
   ```
   Success: 4111111111111111
   Failure: 4000000000000002
   3D Secure: 4000000000003063
   ```

2. **Test Customer Data**
   ```
   CPF: 12345678900 (any 11 digits in sandbox)
   Email: test@email.com
   Phone: 11999999999
   ZIP: 01310100
   ```

3. **Expected Flow**
   - Fill form with test data
   - Click pay button
   - See loading indicator
   - See status messages
   - Verify success message
   - Check backend logs for webhook

### Automated Testing

```typescript
// Example test structure
describe('Payment Flow', () => {
  test('should create order successfully', async () => {
    const response = await fetch('/api/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: '100.00', customerInfo: {...} })
    });
    expect(response.ok).toBe(true);
  });
});
```

---

## Monitoring and Logging

### Key Metrics to Track

1. **Order Creation Rate**
   - Successful order creations per hour
   - Failed order attempts
   - Average creation time

2. **Payment Success Rate**
   - Successful payments / Total attempts
   - Failure reasons distribution
   - Average payment time

3. **Transaction Query Rate**
   - Number of status queries per order
   - Query response times
   - Timeout occurrences

4. **Webhook Reliability**
   - Webhook delivery success rate
   - Duplicate webhook calls
   - Webhook processing time

### Log Levels

The application uses extensive logging:

- `console.log`: Normal operations, info
- `console.error`: Errors and exceptions
- Visual separators: `========================================`
- Emojis for quick scanning: ✅ 📥 📤 ❌ 🔔

---

## Troubleshooting Common Issues

### Issue: "Failed to fetch SDK configuration"

**Cause:** Backend not running or /api/config endpoint unreachable

**Solution:**
1. Verify backend server is running
2. Check network tab in browser DevTools
3. Ensure correct port configuration

---

### Issue: "Pagsmile error: 40000"

**Cause:** Authentication failure

**Solution:**
1. Verify APP_ID and SECURITY_KEY are correct
2. Check environment variable loading
3. Ensure credentials match environment (sandbox/prod)

---

### Issue: "Payment processing timeout"

**Cause:** Transaction status not updating within 20 seconds

**Solution:**
1. Check Pagsmile service status
2. Verify webhook endpoint is accessible
3. Increase polling timeout if needed
4. Check bank for authorization holds

---

### Issue: "Webhook not received"

**Cause:** Webhook URL unreachable by Pagsmile

**Solution:**
1. Verify NOTIFY_URL is publicly accessible
2. Check HTTPS certificate is valid
3. Test webhook endpoint manually
4. Check firewall rules
5. Use ngrok for local development

---

## Performance Optimization

### Backend Optimizations

1. **Connection Pooling**
   - Reuse HTTP connections to Pagsmile API
   - Implement connection timeout handling

2. **Caching**
   - Cache SDK configuration responses
   - Use ETags for conditional requests

3. **Async Processing**
   - Process webhooks asynchronously
   - Use message queues for high volume

### Frontend Optimizations

1. **Bundle Size**
   - Tree-shake unused code
   - Lazy load Pagsmile SDK
   - Minimize TypeScript output

2. **Loading States**
   - Optimize skeleton screens
   - Preload critical resources
   - Implement progressive enhancement

---

## Deployment Guide

### Docker Deployment

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
EXPOSE 3000
CMD ["bun", "run", "index.ts"]
```

### Environment Setup

```bash
# Build container
docker build -t pagsmile-app .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name pagsmile-app \
  pagsmile-app
```

### Health Checks

Implement health check endpoint:

```typescript
"/health": {
  GET: () => new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }))
}
```

---

---

## 🇧🇷 Versão em Português

### Visão Geral da Arquitetura

Esta aplicação é uma integração completa de pagamento com cartão de crédito usando a API Pagsmile, construída com Bun runtime e TypeScript. A arquitetura segue uma separação limpa entre frontend e backend, com serviços bem definidos e responsabilidades claras.

---

## Fluxo do Backend

### 1. **Inicialização do Servidor** (`index.ts`)

**O que faz:**
- Carrega configuração do ambiente do arquivo `.env`
- Inicializa todos os serviços (PagsmileClient, OrderService, TransactionService, WebhookHandler)
- Configura as rotas HTTP usando roteamento nativo do Bun
- Inicia o servidor web na porta 3000

**Passos Principais:**
1. Carrega configuração do Pagsmile (App ID, Security Key, Public Key, URLs)
2. Cria cliente HTTP autenticado com Basic Auth
3. Inicializa camada de serviços com injeção de dependências
4. Configura handlers de eventos webhook para sucesso/falha de pagamento
5. Monta rotas da API e serving de arquivos estáticos
6. Inicia servidor HTTP com HMR (Hot Module Reload) para desenvolvimento

---

### 2. **Serviço de Configuração** (`src/config/pagsmile.ts`)

**O que faz:**
- Valida e carrega variáveis de ambiente
- Fornece objeto de configuração centralizado
- Garante que credenciais necessárias estejam presentes

**Variáveis de Ambiente:**
- `PAGSMILE_APP_ID`: Identificador da aplicação
- `PAGSMILE_SECURITY_KEY`: Chave secreta para autenticação da API
- `PAGSMILE_PUBLIC_KEY`: Chave pública para o SDK frontend
- `PAGSMILE_NOTIFY_URL`: URL de callback do webhook
- `PAGSMILE_RETURN_URL`: URL de redirecionamento após pagamento
- `PAGSMILE_ENVIRONMENT`: Modo de ambiente (sandbox/prod)

---

### 3. **Rotas da API** (`src/routes/api-routes.ts`)

#### **GET /api/config**
**Propósito:** Fornece configuração pública para o frontend

**Fluxo:**
1. Recebe requisição do frontend
2. Extrai apenas dados públicos (App ID, Public Key, Environment, Region)
3. Retorna resposta JSON sem expor segredos

**Resposta:**
```json
{
  "app_id": "seu_app_id",
  "public_key": "sua_chave_publica",
  "env": "sandbox",
  "region_code": "BRA"
}
```

---

#### **POST /api/create-order**
**Propósito:** Cria um novo pedido de pagamento com o Pagsmile

**Body da Requisição:**
```json
{
  "amount": "100.00",
  "customerInfo": {
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999999999",
    "cpf": "12345678900",
    "zipCode": "01310100",
    "state": "SP",
    "city": "São Paulo",
    "address": "Avenida Paulista, 1000"
  }
}
```

**Fluxo:**
1. Valida body da requisição (amount e customerInfo são obrigatórios)
2. Extrai metadados da requisição (User-Agent, endereço IP dos headers)
3. Chama OrderService.createOrder()
4. Retorna prepay_id, trade_no e out_trade_no para o frontend

**Resposta:**
```json
{
  "success": true,
  "prepay_id": "PAY_xxxx",
  "trade_no": "TRD_xxxx",
  "out_trade_no": "ORDER_xxxx"
}
```

**Resposta de Erro:**
```json
{
  "success": false,
  "error": "Descrição da mensagem de erro"
}
```

---

#### **GET /api/query-transaction/:tradeNo**
**Propósito:** Consulta o status atual de uma transação de pagamento

**Fluxo:**
1. Recebe trade_no como parâmetro da URL
2. Valida que trade_no não está vazio
3. Chama TransactionService.queryTransaction()
4. Retorna status completo da transação do Pagsmile

**Resposta:**
```json
{
  "code": "10000",
  "msg": "Success",
  "trade_status": "SUCCESS",
  "trade_no": "TRD_xxxx",
  "out_trade_no": "ORDER_xxxx",
  "order_amount": "100.00",
  "order_currency": "BRL"
}
```

---

#### **POST /api/webhook/payment**
**Propósito:** Recebe notificações de status de pagamento do Pagsmile

**Fluxo:**
1. Recebe payload do webhook dos servidores Pagsmile
2. Valida estrutura do payload
3. Chama WebhookHandler.processWebhook()
4. Dispara callback apropriado (onSuccess ou onFailed)
5. Sempre retorna sucesso para confirmar recebimento

**Payload do Webhook:**
```json
{
  "trade_no": "TRD_xxxx",
  "out_trade_no": "ORDER_xxxx",
  "trade_status": "SUCCESS",
  "order_amount": 100.00,
  "order_currency": "BRL",
  "method": "CreditCard"
}
```

---

### 4. **Serviço de Pedidos** (`src/services/order-service.ts`)

**Responsabilidades:**
- Valida informações do cliente
- Gera identificadores únicos de pedido
- Formata requisições de acordo com especificação da API Pagsmile
- Chama API Pagsmile para criar pedidos

**Regras de Validação:**
- Nome: mínimo 3 caracteres
- Email: deve conter @
- CPF: exatamente 11 dígitos
- Telefone: mínimo 10 dígitos
- CEP: exatamente 8 dígitos
- Estado: exatamente 2 caracteres
- Cidade: mínimo 2 caracteres
- Endereço: mínimo 5 caracteres

**Geração de ID do Pedido:**
```
FORMATO: ORDER_{timestamp}_{aleatório}
EXEMPLO: ORDER_1702656789123_abc123xyz
```

**Formato de Timestamp:**
```
FORMATO: AAAA-MM-DD HH:MM:SS
EXEMPLO: 2024-12-15 14:30:45
```

**Requisição da API para Pagsmile:**
```json
{
  "app_id": "seu_app_id",
  "out_trade_no": "ORDER_1702656789123_abc123xyz",
  "method": "CreditCard",
  "order_amount": "100.00",
  "order_currency": "BRL",
  "subject": "Pagamento de Produto",
  "content": "Pagamento via cartão de crédito",
  "trade_type": "API",
  "timestamp": "2024-12-15 14:30:45",
  "notify_url": "https://seu-dominio.com/api/webhook/payment",
  "return_url": "https://seu-dominio.com/success",
  "timeout_express": "1d",
  "version": "2.0",
  "buyer_id": "cliente@email.com",
  "customer": {
    "identify": {
      "type": "CPF",
      "number": "12345678900"
    },
    "name": "João Silva",
    "email": "cliente@email.com",
    "phone": "11999999999"
  },
  "address": {
    "zip_code": "01310100",
    "state": "SP",
    "city": "São Paulo",
    "street_name": "Avenida Paulista, 1000",
    "street_number": "1000"
  },
  "device_info": {
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.1"
  }
}
```

---

### 5. **Cliente HTTP Pagsmile** (`src/services/pagsmile-client.ts`)

**Responsabilidades:**
- Gerencia comunicação HTTP com API Pagsmile
- Gerencia autenticação usando Basic Auth
- Fornece métodos genéricos POST e GET
- Registra requisições e respostas para debug

**Autenticação:**
```
Método: Basic Authentication
Formato: Base64(app_id:security_key)
Header: Authorization: Basic {credenciais_codificadas}
```

**URL Base:**
```
API Gateway: https://gateway.pagsmile.com
(A API roteia automaticamente para sandbox ou produção com base nas suas credenciais)
```

**Headers da Requisição:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Basic {credenciais_base64}"
}
```

**Tratamento de Erros:**
- Lança erro em códigos de status HTTP não-2xx
- Inclui body completo do erro na mensagem de exceção
- Registra todas as requisições e respostas com informações de tempo

---

### 6. **Serviço de Transações** (`src/services/transaction-service.ts`)

**Responsabilidades:**
- Consulta status de transação de pagamento
- Valida números de transação
- Formata requisições de consulta para API Pagsmile

**Requisição de Consulta:**
```json
{
  "app_id": "seu_app_id",
  "timestamp": "2024-12-15 14:30:45",
  "trade_no": "TRD_xxxx"
}
```

**Status de Transação Possíveis:**
- `SUCCESS`: Pagamento concluído com sucesso
- `PENDING`: Pagamento em andamento
- `PROCESSING`: Pagamento sendo processado
- `FAILED`: Pagamento falhou
- `CANCELLED`: Pagamento cancelado pelo usuário ou sistema

---

### 7. **Handler de Webhook** (`src/services/webhook-handler.ts`)

**Responsabilidades:**
- Valida payloads de webhook do Pagsmile
- Mapeia payloads para formato de evento interno
- Roteia eventos para callbacks apropriados
- Fornece sistema de tratamento de eventos extensível

**Tipos de Evento:**
1. **SUCCESS**: Pagamento aprovado e concluído
2. **FAILED**: Pagamento recusado ou falhou
3. **CANCELLED**: Pagamento cancelado
4. **Outros status**: Registrados mas sem ação específica

**Funções de Callback:**
- `onSuccess(event)`: Chamada quando pagamento é bem-sucedido
- `onFailed(event)`: Chamada quando pagamento falha

**Objeto de Evento:**
```typescript
{
  tradeNo: string,        // ID da transação Pagsmile
  outTradeNo: string,     // Seu ID de pedido
  status: TradeStatus,    // Status atual
  amount: number,         // Valor do pedido
  currency: string,       // Moeda (BRL)
  method: string          // Método de pagamento (CreditCard)
}
```

---

## Fluxo do Frontend

### 1. **Carregamento da Página** (`public/index.html`)

**O que acontece:**
1. Navegador carrega página HTML
2. Script do SDK Pagsmile carregado do CDN
3. Módulo TypeScript carregado e executado
4. Formulário renderizado com todos os campos
5. Event listeners anexados

**Seções do Formulário:**
- **Dados do Cliente**: Nome, email, CPF, telefone, endereço
- **Dados do Pagamento**: Valor e parcelas
- **Dados do Cartão**: Nome no cartão, número, validade, CVV

---

### 2. **Interação do Usuário** (`public/payment.ts`)

#### **Passo 1: Usuário Preenche Formulário**
- Todos os campos são validados por restrições HTML5
- Campos obrigatórios, padrões e tamanhos impostos pelo navegador

#### **Passo 2: Usuário Clica no Botão "Pagar"**
**Gatilho:** Evento de submit do formulário

**Ações:**
1. Previne submissão padrão do formulário
2. Esconde qualquer mensagem de status anterior
3. Mostra indicador de carregamento
4. Desabilita botão de submit para prevenir cliques duplos

---

### 3. **Coleta de Dados do Formulário**

**Função:** `getFormData()`

**O que faz:**
1. Lê todos os campos do formulário usando FormData API
2. Estrutura dados em objetos tipados
3. Faz parse de valores numéricos (valor, parcelas)

**Saída:**
```typescript
{
  amount: "100.00",
  installments: 3,
  customerInfo: {
    name: "João Silva",
    email: "joao@email.com",
    phone: "11999999999",
    cpf: "12345678900",
    zipCode: "01310100",
    city: "São Paulo",
    state: "SP",
    address: "Avenida Paulista, 1000"
  }
}
```

---

### 4. **Busca de Configuração do SDK**

**Função:** `fetchSdkConfig()`

**Fluxo:**
1. Chama endpoint `GET /api/config`
2. Recebe configuração pública do backend
3. Retorna objeto de configuração tipado

**Propósito:**
- Garante que frontend usa App ID e Public Key corretos
- Mantém consistência de ambiente (sandbox/prod)
- Centraliza gerenciamento de configuração

---

### 5. **Criação de Pedido no Backend**

**Função:** `createBackendOrder(amount, customerInfo)`

**Fluxo:**
1. Prepara body da requisição com valor e dados do cliente
2. Chama endpoint `POST /api/create-order`
3. Backend valida dados e cria pedido com Pagsmile
4. Retorna prepay_id (necessário para inicialização do SDK)

**Dados Críticos Recebidos:**
- `prepay_id`: Identificador de pré-pagamento para o SDK
- `trade_no`: Número da transação Pagsmile (para consultas de status)
- `out_trade_no`: Seu número de pedido interno

---

### 6. **Inicialização do SDK Pagsmile**

**Função:** `initializePagsmileSdk(sdkConfig, prepayId)`

**Fluxo:**
1. Chama `Pagsmile.setPublishableKey()` com configuração
2. Vincula SDK aos campos de entrada do cartão usando seletores de ID
3. SDK criptografa dados do cartão no lado do cliente
4. Retorna instância inicializada do PagsmileClient

**Vinculação de Campos:**
```typescript
{
  card_name: { id_selector: "card-name" },
  card_number: { id_selector: "card-number" },
  expiration_month: { id_selector: "exp-month" },
  expiration_year: { id_selector: "exp-year" },
  cvv: { id_selector: "card-cvv" }
}
```

**Segurança:**
- Dados do cartão nunca são enviados para seu backend
- SDK criptografa dados sensíveis antes da transmissão
- Apenas Pagsmile recebe informações brutas do cartão

---

### 7. **Submissão de Pagamento**

**Função:** `submitPayment(client, customerInfo, installments)`

**Fluxo:**
1. Coleta informações do dispositivo (impressão digital do navegador)
2. Constrói objeto de dados de pagamento
3. Chama `client.createOrder()` (método do SDK Pagsmile)
4. SDK envia dados criptografados do cartão diretamente para Pagsmile
5. Retorna resultado do pagamento

**Informações do Dispositivo Coletadas:**
```typescript
{
  user_agent: "Mozilla/5.0...",
  browser_language: "pt-BR",
  browser_color_depth: "24",
  browser_screen_height: "1080",
  browser_screen_width: "1920",
  browser_time_zone: "-180"  // Offset em minutos
}
```

**Estrutura de Dados de Pagamento:**
```typescript
{
  phone: "11999999999",
  email: "joao@email.com",
  postal_code: "01310100",
  payer_id: "12345678900",  // CPF
  installments: { stage: 3 },
  address: {
    country_code: "BRA",
    zip_code: "01310100",
    state: "SP",
    city: "São Paulo",
    street: "Avenida Paulista, 1000"
  },
  device_info: { /* dados do navegador */ }
}
```

---

### 8. **Tratamento de Resultado do Pagamento**

**Resultados Possíveis:**

#### **Cenário A: Sucesso Imediato**
```typescript
{ status: "success", query: false }
```
**Ações:**
1. Mostra mensagem de sucesso
2. Reseta formulário
3. Esconde indicador de carregamento

#### **Cenário B: Sucesso com Consulta Necessária**
```typescript
{ status: "success", query: true }
```
**Ações:**
1. Mostra mensagem "Verificando status do pagamento..."
2. Inicia polling de status da transação
3. Aguarda confirmação final

#### **Cenário C: Erro**
```typescript
{ status: "error", message: "Descrição do erro" }
```
**Ações:**
1. Mostra mensagem de erro
2. Mantém dados do formulário
3. Permite que usuário tente novamente

---

### 9. **Polling de Status da Transação**

**Função:** `pollTransactionStatus(tradeNo, maxAttempts, intervalMs)`

**Por que é Necessário:**
- Alguns métodos de pagamento requerem processamento assíncrono
- Autenticação 3D Secure pode atrasar confirmação
- Verificações antifraude podem levar tempo

**Fluxo:**
1. Chama `GET /api/query-transaction/${tradeNo}`
2. Verifica status da transação
3. Se PENDING/PROCESSING: aguarda 2 segundos e tenta novamente
4. Se SUCCESS/FAILED/CANCELLED: retorna status final
5. Máximo 10 tentativas (20 segundos total)
6. Após timeout: mostra mensagem "processando"

**Estratégia de Polling:**
```
Tentativa 1: 0s   -> Consulta status
Tentativa 2: 2s   -> Consulta status
Tentativa 3: 4s   -> Consulta status
...
Tentativa 10: 18s -> Consulta status
Timeout: 20s      -> Mostra mensagem de processamento
```

**Tratamento de Status Final:**
- `SUCCESS`: Mostra sucesso, reseta formulário
- `FAILED/CANCELLED`: Mostra erro, mantém dados do formulário
- `TIMEOUT`: Mostra mensagem de processamento, não reseta formulário

---

### 10. **Atualizações de Status da UI**

**Estados de Carregamento:**

1. **Indicador de Carregamento** (`showLoading`)
   - Exibe animação de spinner
   - Desabilita botão de submit
   - Mostra texto "Processando pagamento..."

2. **Mensagens de Status** (`showStatus`)
   - **Processing** (⋯): Fundo amarelo
   - **Success** (✓): Fundo verde
   - **Error** (✗): Fundo vermelho

**Mensagens para o Usuário:**
- "Criando pedido..."
- "Inicializando pagamento..."
- "Processando pagamento..."
- "Verificando status do pagamento..."
- "Pagamento realizado com sucesso!"
- "Pagamento em processamento. Verifique seu e-mail para confirmação."
- "Erro: [descrição]"

---

## Diagrama de Fluxo Completo de Pagamento

```
USUÁRIO                FRONTEND                 BACKEND                 PAGSMILE API
 |                        |                        |                         |
 |--[Preenche Form]------>|                        |                         |
 |                        |                        |                         |
 |--[Clica Pagar]-------->|                        |                         |
 |                        |                        |                         |
 |                        |--[GET /api/config]---->|                         |
 |                        |<--[Config SDK]---------|                         |
 |                        |                        |                         |
 |                        |--[POST create-order]-->|                         |
 |                        |                        |--[POST /trade/create]-->|
 |                        |                        |<--[prepay_id]-----------|
 |                        |<--[prepay_id]----------|                         |
 |                        |                        |                         |
 |                        |--[Inicializa SDK]------|-----[Set Config]------->|
 |                        |                        |                         |
 |                        |--[Submit Payment]------|--[Dados Cartão Cript.]->|
 |                        |                        |                         |
 |                        |                        |                         |
 |                        |<--[Resultado Pag.]-----|<--[Processa Pag.]-------|
 |                        |                        |                         |
 |                        |--[Poll Status]-------->|                         |
 |                        |                        |--[POST /trade/query]--->|
 |                        |<--[Status]-------------|<--[Status]--------------|
 |                        |                        |                         |
 |                        |                        |<--[Webhook Callback]----|
 |                        |                        |--[Processa Evento]----->|
 |                        |                        |                         |
 |<--[Mostra Sucesso]-----|                        |                         |
```

---

## Estratégia de Tratamento de Erros

### Erros do Frontend

1. **Erros de Rede**
   - Capturados por blocos try-catch
   - Exibidos ao usuário com opção de retry
   - Registrados no console para debug

2. **Erros de Validação**
   - Capturados antes de chamadas da API
   - Validação HTML5 previne submissão
   - Validação customizada nos serviços

3. **Erros da API**
   - Parseados da resposta
   - Mensagens amigáveis exibidas
   - Detalhes técnicos registrados

### Erros do Backend

1. **Erros de Validação**
   - Retornam código de status 400
   - Incluem mensagens de erro específicas do campo
   - Previnem dados inválidos de chegarem ao Pagsmile

2. **Erros de API Externa**
   - Retornam código de status 500
   - Registram detalhes completos do erro
   - Retornam mensagem de erro segura para frontend

3. **Erros de Autenticação**
   - Falham rapidamente na inicialização se config inválida
   - Nunca expõem credenciais em logs ou respostas

---

## Considerações de Segurança

### Segurança de Dados do Cartão

1. **Conformidade PCI DSS**
   - Dados do cartão nunca são enviados para seu backend
   - SDK Pagsmile gerencia toda criptografia do cartão
   - Seus servidores nunca armazenam ou processam números de cartão

2. **Fluxo de Dados**
   ```
   Input do Usuário -> SDK Pagsmile -> Criptografado -> API Pagsmile
   (Dados do cartão nunca tocam seu backend)
   ```

### Segurança da API

1. **Autenticação**
   - Basic Auth com App ID e Security Key
   - Credenciais armazenadas em variáveis de ambiente
   - Nunca expostas ao frontend

2. **Apenas HTTPS**
   - Todo tráfego de produção deve usar HTTPS
   - Imposto pela API Pagsmile
   - Configure em ambiente de produção

### Segurança do Webhook

1. **Validação de Assinatura**
   - Implemente verificação de assinatura em produção
   - Valide que fonte do webhook é Pagsmile
   - Previna ataques de replay

2. **Idempotência**
   - Trate chamadas duplicadas de webhook
   - Armazene IDs de transações processadas
   - Evite processamento duplicado de pedidos

---

## Desenvolvimento vs Produção

### Ambiente Sandbox

- **Propósito**: Testes sem dinheiro real
- **URL Base**: `https://gateway.pagsmile.com`
- **Credenciais**: Use App ID e Security Key de sandbox
- **Cartões de Teste**: Use números de cartão fornecidos pelo Pagsmile
- **Webhooks**: Pode precisar de serviço de tunelamento (ngrok, localtunnel)

### Ambiente de Produção

- **Propósito**: Transações reais
- **URL Base**: `https://gateway.pagsmile.com`
- **Credenciais**: Use App ID e Security Key de produção
- **Cartões Reais**: Cartões reais de clientes
- **Webhooks**: Deve ser endpoint HTTPS publicamente acessível
- **Monitoramento**: Implemente logging e alertas

---

## Checklist de Configuração

### Variáveis de Ambiente
- [ ] `PAGSMILE_APP_ID`
- [ ] `PAGSMILE_SECURITY_KEY`
- [ ] `PAGSMILE_PUBLIC_KEY`
- [ ] `PAGSMILE_NOTIFY_URL` (endpoint webhook)
- [ ] `PAGSMILE_RETURN_URL` (página de sucesso)
- [ ] `PAGSMILE_ENVIRONMENT` (sandbox/prod)

### Infraestrutura
- [ ] Servidor acessível da internet
- [ ] Certificado HTTPS configurado (produção)
- [ ] Endpoint webhook publicamente acessível
- [ ] Regras de firewall permitem IPs do Pagsmile
- [ ] Banco de dados para armazenar pedidos (opcional)
- [ ] Sistema de logging configurado

---

## Guia de Testes

### Fluxo de Teste Manual

1. **Números de Cartão de Teste** (Sandbox)
   ```
   Sucesso: 4111111111111111
   Falha: 4000000000000002
   3D Secure: 4000000000003063
   ```

2. **Dados de Cliente de Teste**
   ```
   CPF: 12345678900 (quaisquer 11 dígitos no sandbox)
   Email: teste@email.com
   Telefone: 11999999999
   CEP: 01310100
   ```

3. **Fluxo Esperado**
   - Preencher formulário com dados de teste
   - Clicar no botão pagar
   - Ver indicador de carregamento
   - Ver mensagens de status
   - Verificar mensagem de sucesso
   - Verificar logs do backend para webhook

### Testes Automatizados

```typescript
// Exemplo de estrutura de teste
describe('Fluxo de Pagamento', () => {
  test('deve criar pedido com sucesso', async () => {
    const response = await fetch('/api/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: '100.00', customerInfo: {...} })
    });
    expect(response.ok).toBe(true);
  });
});
```

---

## Monitoramento e Logging

### Métricas Principais para Rastrear

1. **Taxa de Criação de Pedidos**
   - Criações de pedidos bem-sucedidas por hora
   - Tentativas de pedidos falhadas
   - Tempo médio de criação

2. **Taxa de Sucesso de Pagamento**
   - Pagamentos bem-sucedidos / Tentativas totais
   - Distribuição de razões de falha
   - Tempo médio de pagamento

3. **Taxa de Consulta de Transação**
   - Número de consultas de status por pedido
   - Tempos de resposta de consulta
   - Ocorrências de timeout

4. **Confiabilidade do Webhook**
   - Taxa de sucesso de entrega de webhook
   - Chamadas duplicadas de webhook
   - Tempo de processamento do webhook

### Níveis de Log

A aplicação usa logging extensivo:

- `console.log`: Operações normais, info
- `console.error`: Erros e exceções
- Separadores visuais: `========================================`
- Emojis para escaneamento rápido: ✅ 📥 📤 ❌ 🔔

---

## Resolução de Problemas Comuns

### Problema: "Failed to fetch SDK configuration"

**Causa:** Backend não está rodando ou endpoint /api/config inacessível

**Solução:**
1. Verifique se servidor backend está rodando
2. Verifique aba network no DevTools do navegador
3. Garanta configuração correta de porta

---

### Problema: "Pagsmile error: 40000"

**Causa:** Falha de autenticação

**Solução:**
1. Verifique se APP_ID e SECURITY_KEY estão corretos
2. Verifique carregamento de variáveis de ambiente
3. Garanta que credenciais correspondem ao ambiente (sandbox/prod)

---

### Problema: "Payment processing timeout"

**Causa:** Status da transação não atualizou dentro de 20 segundos

**Solução:**
1. Verifique status do serviço Pagsmile
2. Verifique se endpoint webhook está acessível
3. Aumente timeout de polling se necessário
4. Verifique banco para holds de autorização

---

### Problema: "Webhook not received"

**Causa:** URL do webhook inacessível pelo Pagsmile

**Solução:**
1. Verifique se NOTIFY_URL está publicamente acessível
2. Verifique se certificado HTTPS é válido
3. Teste endpoint webhook manualmente
4. Verifique regras de firewall
5. Use ngrok para desenvolvimento local

---

## Otimização de Performance

### Otimizações do Backend

1. **Connection Pooling**
   - Reutilize conexões HTTP para API Pagsmile
   - Implemente tratamento de timeout de conexão

2. **Caching**
   - Cache respostas de configuração do SDK
   - Use ETags para requisições condicionais

3. **Processamento Assíncrono**
   - Processe webhooks de forma assíncrona
   - Use filas de mensagens para alto volume

### Otimizações do Frontend

1. **Tamanho do Bundle**
   - Tree-shake código não usado
   - Lazy load SDK Pagsmile
   - Minimize saída TypeScript

2. **Estados de Carregamento**
   - Otimize skeleton screens
   - Pré-carregue recursos críticos
   - Implemente progressive enhancement

---

## Guia de Deploy

### Deploy com Docker

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
EXPOSE 3000
CMD ["bun", "run", "index.ts"]
```

### Setup de Ambiente

```bash
# Build container
docker build -t pagsmile-app .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name pagsmile-app \
  pagsmile-app
```

### Health Checks

Implemente endpoint de health check:

```typescript
"/health": {
  GET: () => new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }))
}
```

---
