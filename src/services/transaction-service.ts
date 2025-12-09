import type { PagsmileConfig, QueryTransactionResponse } from "../types/pagsmile.ts";
import type { PagsmileHttpClient } from "./pagsmile-client.ts";

export interface TransactionService {
  queryTransaction(tradeNo: string): Promise<QueryTransactionResponse>;
}

interface QueryRequest {
  app_id: string;
  timestamp: string;
  trade_no: string;
}

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

export const createTransactionService = (
  client: PagsmileHttpClient,
  config: PagsmileConfig
): TransactionService => ({
  queryTransaction: async (tradeNo: string): Promise<QueryTransactionResponse> => {
    if (!tradeNo || tradeNo.trim().length === 0) {
      throw new Error("Trade number is required");
    }

    const queryRequest: QueryRequest = {
      app_id: config.appId,
      timestamp: formatTimestamp(),
      trade_no: tradeNo,
    };

    const response = await client.post<QueryRequest, QueryTransactionResponse>(
      "/trade/query",
      queryRequest
    );

    if (response.code !== "10000") {
      throw new Error(`Pagsmile error: ${response.code} - ${response.msg}`);
    }

    return response;
  },
});
