import indexHtml from "./public/index.html";
import { loadPagsmileConfig } from "./src/config/pagsmile.ts";
import { createPagsmileClient } from "./src/services/pagsmile-client.ts";
import { createOrderService } from "./src/services/order-service.ts";
import { createTransactionService } from "./src/services/transaction-service.ts";
import { createWebhookHandler } from "./src/services/webhook-handler.ts";
import { createApiRoutes } from "./src/routes/api-routes.ts";

const config = loadPagsmileConfig();
const pagsmileClient = createPagsmileClient(config);

const orderService = createOrderService(pagsmileClient, config);
const transactionService = createTransactionService(pagsmileClient, config);
const webhookHandler = createWebhookHandler({
  onSuccess: async (event) => {
    console.log(`Payment SUCCESS: Order ${event.outTradeNo}, Amount: ${event.amount} ${event.currency}`);
  },
  onFailed: async (event) => {
    console.log(`Payment FAILED: Order ${event.outTradeNo}, Status: ${event.status}`);
  },
});

const apiRoutes = createApiRoutes({
  config,
  orderService,
  transactionService,
  webhookHandler,
});

const server = Bun.serve({
  port: process.env.PORT ?? 3000,
  routes: {
    "/": indexHtml,

    "/api/config": {
      GET: () => apiRoutes.getConfig(),
    },

    "/api/create-order": {
      POST: (req) => apiRoutes.createOrder(req),
    },

    "/api/query-transaction/:tradeNo": {
      GET: (req) => apiRoutes.queryTransaction(req.params.tradeNo),
    },

    "/api/webhook/payment": {
      POST: (req) => apiRoutes.handleWebhook(req),
    },

    "/success": new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Pagamento Confirmado</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #22c55e;">Pagamento Confirmado!</h1>
          <p>Seu pagamento foi processado com sucesso.</p>
          <a href="/" style="color: #4f46e5;">Voltar ao início</a>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    ),
  },

  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at http://localhost:${server.port}`);
console.log(`Environment: ${config.environment}`);