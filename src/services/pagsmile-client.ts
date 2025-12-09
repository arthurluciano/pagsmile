import { PAGSMILE_API_BASE_URL } from "../config/pagsmile.ts";
import type { PagsmileConfig } from "../types/pagsmile.ts";

export interface PagsmileHttpClient {
  post<TRequest, TResponse>(endpoint: string, body: TRequest): Promise<TResponse>;
  get<TResponse>(endpoint: string): Promise<TResponse>;
}

const createAuthHeader = (appId: string, securityKey: string): string => {
  const credentials = `${appId}:${securityKey}`;
  const encoded = Buffer.from(credentials).toString("base64");
  return `Basic ${encoded}`;
};

export const createPagsmileClient = (config: PagsmileConfig): PagsmileHttpClient => {
  const authHeader = createAuthHeader(config.appId, config.securityKey);

  const request = async <TResponse>(
    endpoint: string,
    options: RequestInit
  ): Promise<TResponse> => {
    const url = `${PAGSMILE_API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Pagsmile API error: ${response.status} - ${errorBody}`);
    }

    return response.json() as Promise<TResponse>;
  };

  return {
    post: <TRequest, TResponse>(endpoint: string, body: TRequest): Promise<TResponse> =>
      request<TResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    get: <TResponse>(endpoint: string): Promise<TResponse> =>
      request<TResponse>(endpoint, {
        method: "GET",
      }),
  };
};
