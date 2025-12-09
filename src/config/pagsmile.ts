import type { PagsmileConfig, PagsmileEnvironment } from "../types/pagsmile.ts";

const requiredEnvVars = [
  "PAGSMILE_APP_ID",
  "PAGSMILE_SECURITY_KEY",
  "PAGSMILE_PUBLIC_KEY",
] as const;

const validateEnvironment = (): void => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

const getEnvironment = (): PagsmileEnvironment => {
  const env = process.env.PAGSMILE_ENVIRONMENT ?? "sandbox";
  if (env !== "sandbox" && env !== "prod") {
    throw new Error(`Invalid PAGSMILE_ENVIRONMENT: ${env}. Must be "sandbox" or "prod"`);
  }
  return env;
};

export const loadPagsmileConfig = (): PagsmileConfig => {
  validateEnvironment();

  return {
    appId: process.env.PAGSMILE_APP_ID!,
    securityKey: process.env.PAGSMILE_SECURITY_KEY!,
    publicKey: process.env.PAGSMILE_PUBLIC_KEY!,
    environment: getEnvironment(),
    notifyUrl: process.env.PAGSMILE_NOTIFY_URL ?? "http://localhost:3000/api/webhook/payment",
    returnUrl: process.env.PAGSMILE_RETURN_URL ?? "http://localhost:3000/success",
  };
};

export const PAGSMILE_API_BASE_URL = "https://gateway.pagsmile.com";
