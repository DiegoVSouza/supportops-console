export interface RuntimeConfig {
  oidcIssuer: string;
  oidcClientId: string;
}

export async function loadConfig(): Promise<RuntimeConfig> {
  const response = await fetch("/config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("config unavailable");
  const config = (await response.json()) as Partial<RuntimeConfig>;
  if (!config.oidcIssuer || !config.oidcClientId) throw new Error("config incomplete");
  return { oidcIssuer: config.oidcIssuer, oidcClientId: config.oidcClientId };
}
