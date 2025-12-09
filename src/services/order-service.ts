import type {
  CreateOrderRequest,
  CreateOrderResponse,
  CreatePaymentInput,
  CustomerInfo,
  PagsmileConfig,
} from "../types/pagsmile.ts";
import type { PagsmileHttpClient } from "./pagsmile-client.ts";

export interface OrderService {
  createOrder(input: CreatePaymentInput): Promise<CreateOrderResponse>;
}

const generateOrderId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `ORDER_${timestamp}_${random}`;
};

const formatTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const extractStreetNumber = (address: string): string => {
  const match = address.match(/\d+/);
  return match?.[0] ?? "1";
};

const buildOrderRequest = (
  input: CreatePaymentInput,
  config: PagsmileConfig
): CreateOrderRequest => {
  const { amount, customerInfo, userAgent, ipAddress } = input;

  return {
    app_id: config.appId,
    out_trade_no: generateOrderId(),
    method: "CreditCard",
    order_amount: amount,
    order_currency: "BRL",
    subject: "Pagamento de Produto",
    content: "Pagamento via cartão de crédito",
    trade_type: "API",
    timestamp: formatTimestamp(),
    notify_url: config.notifyUrl,
    return_url: config.returnUrl,
    timeout_express: "1d",
    version: "2.0",
    buyer_id: customerInfo.email,
    customer: {
      identify: {
        type: "CPF",
        number: customerInfo.cpf,
      },
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
    },
    address: {
      zip_code: customerInfo.zipCode,
      state: customerInfo.state,
      city: customerInfo.city,
      street_name: customerInfo.address,
      street_number: extractStreetNumber(customerInfo.address),
    },
    device_info: {
      user_agent: userAgent,
      ip_address: ipAddress,
    },
  };
};

const validateCustomerInfo = (customerInfo: CustomerInfo): void => {
  const errors: string[] = [];

  if (!customerInfo.name || customerInfo.name.trim().length < 3) {
    errors.push("Name must have at least 3 characters");
  }

  if (!customerInfo.email || !customerInfo.email.includes("@")) {
    errors.push("Invalid email format");
  }

  if (!customerInfo.cpf || customerInfo.cpf.length !== 11) {
    errors.push("CPF must have 11 digits");
  }

  if (!customerInfo.phone || customerInfo.phone.length < 10) {
    errors.push("Phone must have at least 10 digits");
  }

  if (!customerInfo.zipCode || customerInfo.zipCode.length !== 8) {
    errors.push("ZIP code must have 8 digits");
  }

  if (!customerInfo.state || customerInfo.state.length !== 2) {
    errors.push("State must be a 2-letter code");
  }

  if (!customerInfo.city || customerInfo.city.trim().length < 2) {
    errors.push("City is required");
  }

  if (!customerInfo.address || customerInfo.address.trim().length < 5) {
    errors.push("Address must have at least 5 characters");
  }

  if (errors.length > 0) {
    throw new Error(`Validation errors: ${errors.join(", ")}`);
  }
};

export const createOrderService = (
  client: PagsmileHttpClient,
  config: PagsmileConfig
): OrderService => ({
  createOrder: async (input: CreatePaymentInput): Promise<CreateOrderResponse> => {
    validateCustomerInfo(input.customerInfo);

    const orderRequest = buildOrderRequest(input, config);
    const response = await client.post<CreateOrderRequest, CreateOrderResponse>(
      "/trade/create",
      orderRequest
    );

    if (response.code !== "10000") {
      throw new Error(`Pagsmile error: ${response.code} - ${response.msg}`);
    }

    return response;
  },
});
