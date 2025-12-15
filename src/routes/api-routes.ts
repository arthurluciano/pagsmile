import type { PagsmileConfig, CreatePaymentInput, SdkConfig, WebhookPayload } from "../types/pagsmile.ts";
import type { OrderService } from "../services/order-service.ts";
import type { TransactionService } from "../services/transaction-service.ts";
import type { WebhookHandler } from "../services/webhook-handler.ts";

export interface ApiDependencies {
  config: PagsmileConfig;
  orderService: OrderService;
  transactionService: TransactionService;
  webhookHandler: WebhookHandler;
}

const jsonResponse = <T>(data: T, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status = 400): Response =>
  jsonResponse({ success: false, error: message }, status);

export const createApiRoutes = (deps: ApiDependencies) => {
  const { config, orderService, transactionService, webhookHandler } = deps;

  const getConfig = (): Response => {
    console.log("\n📥 GET /api/config - Solicitação de configuração recebida");
    
    const sdkConfig: SdkConfig = {
      app_id: config.appId,
      public_key: config.publicKey,
      env: config.environment,
      region_code: "BRA",
    };

    console.log("📤 Retornando config:", { 
      app_id: sdkConfig.app_id, 
      env: sdkConfig.env, 
      region_code: sdkConfig.region_code 
    });
    
    return jsonResponse(sdkConfig);
  };

  const createOrder = async (request: Request): Promise<Response> => {
    console.log("\n========================================");
    console.log("📥 POST /api/create-order - Nova requisição de pedido");
    console.log("========================================");
    
    try {
      const body = (await request.json()) as Omit<CreatePaymentInput, "userAgent" | "ipAddress">;
      
      console.log("📦 Dados recebidos:", JSON.stringify(body, null, 2));

      if (!body.amount || !body.customerInfo) {
        console.log("❌ Validação falhou: Campos obrigatórios ausentes");
        return errorResponse("Missing required fields: amount and customerInfo");
      }

      const userAgent = request.headers.get("user-agent") ?? "unknown";
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        undefined;

      console.log("🌐 Informações de requisição:", { userAgent, ipAddress });

      const input: CreatePaymentInput = {
        ...body,
        userAgent,
        ipAddress,
      };

      console.log("⏳ Criando pedido no Pagsmile...");
      const startTime = Date.now();
      
      const result = await orderService.createOrder(input);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Pedido criado com sucesso em ${duration}ms`);
      console.log("📤 Resposta:", {
        prepay_id: result.prepay_id,
        trade_no: result.trade_no,
        out_trade_no: result.out_trade_no,
      });
      console.log("========================================\n");

      return jsonResponse({
        success: true,
        prepay_id: result.prepay_id,
        trade_no: result.trade_no,
        out_trade_no: result.out_trade_no,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("========================================");
      console.error("❌ ERRO ao criar pedido:", message);
      if (error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack);
      }
      console.error("========================================\n");
      return errorResponse(message, 500);
    }
  };

  const queryTransaction = async (tradeNo: string): Promise<Response> => {
    console.log("\n========================================");
    console.log(`📥 GET /api/query-transaction/${tradeNo}`);
    console.log("========================================");
    
    try {
      if (!tradeNo) {
        console.log("❌ trade_no não fornecido");
        return errorResponse("Missing trade_no parameter");
      }

      console.log("🔍 Consultando transação...");
      const startTime = Date.now();
      
      const result = await transactionService.queryTransaction(tradeNo);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Transação consultada em ${duration}ms`);
      console.log("📤 Resultado:", JSON.stringify(result, null, 2));
      console.log("========================================\n");
      
      return jsonResponse(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("========================================");
      console.error("❌ ERRO ao consultar transação:", message);
      if (error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack);
      }
      console.error("========================================\n");
      return errorResponse(message, 500);
    }
  };

  const handleWebhook = async (request: Request): Promise<Response> => {
    console.log("\n========================================");
    console.log("🔔 POST /api/webhook/payment - Webhook recebido do Pagsmile");
    console.log("========================================");
    
    try {
      const payload = (await request.json()) as WebhookPayload;
      
      console.log("📦 Payload do webhook:", JSON.stringify(payload, null, 2));
      console.log("⏳ Processando webhook...");
      
      const startTime = Date.now();
      await webhookHandler.processWebhook(payload);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Webhook processado com sucesso em ${duration}ms`);
      console.log("========================================\n");
      
      return jsonResponse({ result: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("========================================");
      console.error("❌ ERRO ao processar webhook:", message);
      if (error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack);
      }
      console.error("========================================\n");
      return jsonResponse({ result: "error", message }, 200);
    }
  };

  return {
    getConfig,
    createOrder,
    queryTransaction,
    handleWebhook,
  };
};
