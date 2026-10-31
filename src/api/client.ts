import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type Ticket = components["schemas"]["Ticket"];
export type Task = components["schemas"]["TaskView"];
export type Approval = components["schemas"]["ApprovalView"];
export type Api = ReturnType<typeof createApi>;

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (value) => value.toString(16).padStart(2, "0")).join("");
}

export function createApi(baseUrl: string, getToken: () => string, onUnauthorized: () => void, fetcher?: typeof fetch) {
  const client = createClient<paths>({ baseUrl, ...(fetcher ? { fetch: fetcher } : {}) });
  client.use({
    onRequest({ request }) {
      request.headers.set("Authorization", `Bearer ${getToken()}`);
      request.headers.set("traceparent", `00-${randomHex(16)}-${randomHex(8)}-01`);
      return request;
    },
    onResponse({ response }) {
      if (response.status === 401) onUnauthorized();
      return response;
    },
  });
  return client;
}

const MESSAGES: Record<number, string> = {
  401: "Sua sessão expirou. Entre novamente.",
  403: "Seu perfil não permite esta ação.",
  404: "Registro não encontrado neste tenant.",
  409: "Esta ação entrou em conflito com o estado atual.",
  429: "Muitas requisições. Aguarde um minuto.",
  503: "Serviço temporariamente indisponível.",
};

export function describeError(status: number, error: unknown): string {
  const detail = (error as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string" && status !== 401) return detail;
  return MESSAGES[status] ?? "A requisição falhou. Tente novamente.";
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
