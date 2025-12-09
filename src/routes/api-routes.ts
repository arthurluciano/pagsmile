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
    const sdkConfig: SdkConfig = {
      app_id: config.appId,
      public_key: config.publicKey,
      env: config.environment,
      region_code: "BRA",
    };

    return jsonResponse(sdkConfig);
  };

  const createOrder = async (request: Request): Promise<Response> => {
    try {
      const body = (await request.json()) as CreatePaymentInput;

      if (!body.amount || !body.customerInfo) {
        return errorResponse("Missing required fields: amount and customerInfo");
      }

      const result = await orderService.createOrder(body);

      return jsonResponse({
        success: true,
        prepay_id: result.prepay_id,
        trade_no: result.trade_no,
        out_trade_no: result.out_trade_no,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Create order error:", message);
      return errorResponse(message, 500);
    }
  };

  const queryTransaction = async (tradeNo: string): Promise<Response> => {
    try {
      if (!tradeNo) {
        return errorResponse("Missing trade_no parameter");
      }

      const result = await transactionService.queryTransaction(tradeNo);
      return jsonResponse(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Query transaction error:", message);
      return errorResponse(message, 500);
    }
  };

  const handleWebhook = async (request: Request): Promise<Response> => {
    try {
      const payload = (await request.json()) as WebhookPayload;
      await webhookHandler.processWebhook(payload);
      return jsonResponse({ result: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Webhook error:", message);
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
