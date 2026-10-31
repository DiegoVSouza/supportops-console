export interface RuntimeConfig {
  oidcIssuer: string;
  oidcClientId: string;
  /** P05 API origin. Absent in the nginx image, which proxies same-origin `/api`; set on Cloudflare Pages. */
  apiBaseUrl?: string;
}

export function apiBase(config: RuntimeConfig, origin: string = window.location.origin): string {
  return config.apiBaseUrl ? config.apiBaseUrl.replace(/\/$/, "") : `${origin}/api`;
}

export async function loadConfig(): Promise<RuntimeConfig> {
  const response = await fetch("/config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("config unavailable");
  const config = (await response.json()) as Partial<RuntimeConfig>;
  if (!config.oidcIssuer || !config.oidcClientId) throw new Error("config incomplete");
  return {
    oidcIssuer: config.oidcIssuer,
    oidcClientId: config.oidcClientId,
    ...(config.apiBaseUrl ? { apiBaseUrl: config.apiBaseUrl } : {}),
  };
}
