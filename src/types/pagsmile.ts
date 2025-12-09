export const IdentificationType = {
  CPF: "CPF",
  CNPJ: "CNPJ",
} as const;

export type IdentificationType = (typeof IdentificationType)[keyof typeof IdentificationType];

export const TradeStatus = {
  INITIAL: "INITIAL",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type TradeStatus = (typeof TradeStatus)[keyof typeof TradeStatus];

export const PagsmileEnvironment = {
  SANDBOX: "sandbox",
  PRODUCTION: "prod",
} as const;

export type PagsmileEnvironment = (typeof PagsmileEnvironment)[keyof typeof PagsmileEnvironment];

export interface CustomerIdentification {
  type: IdentificationType;
  number: string;
}

export interface Customer {
  identify: CustomerIdentification;
  name: string;
  email: string;
  phone: string;
}

export interface Address {
  zip_code: string;
  state: string;
  city: string;
  street_name: string;
  street_number: string;
}

export interface CreateOrderRequest {
  app_id: string;
  out_trade_no: string;
  method: "CreditCard";
  order_amount: string;
  order_currency: "BRL";
  subject: string;
  content: string;
  trade_type: "API";
  timestamp: string;
  notify_url: string;
  return_url: string;
  timeout_express: string;
  version: "2.0";
  buyer_id: string;
  customer: Customer;
  address: Address;
}

export interface CreateOrderResponse {
  code: string;
  msg: string;
  out_trade_no: string;
  trade_no: string;
  prepay_id: string;
}

export interface QueryTransactionResponse {
  code: string;
  msg: string;
  trade_no: string;
  out_trade_no: string;
  method: string;
  trade_status: TradeStatus;
  order_currency: string;
  order_amount: number;
  customer: {
    identification: {
      number: string;
      type: string;
    };
    username: string;
    email: string;
    phone: string;
    buyer_id: string;
  };
  create_time: string;
  update_time: string;
}

export interface WebhookPayload {
  trade_no: string;
  out_trade_no: string;
  trade_status: TradeStatus;
  order_amount: number;
  order_currency: string;
  method: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  zipCode: string;
  city: string;
  state: string;
  address: string;
}

export interface CreatePaymentInput {
  amount: string;
  customerInfo: CustomerInfo;
}

export interface PagsmileConfig {
  appId: string;
  securityKey: string;
  publicKey: string;
  environment: PagsmileEnvironment;
  notifyUrl: string;
  returnUrl: string;
}

export interface SdkConfig {
  app_id: string;
  public_key: string;
  env: PagsmileEnvironment;
  region_code: "BRA";
}
