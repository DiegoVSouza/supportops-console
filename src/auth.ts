import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";
import type { RuntimeConfig } from "./config";

const SCOPES = [
  "openid", "ticket:read", "ticket:write", "task:read", "task:write", "triage:run",
  "refund:request", "feedback:write", "approval:decide", "billing:read", "crm:read",
].join(" ");

export interface Session {
  token: string;
  username: string;
  tenant: string;
  roles: string[];
}

export function createUserManager(config: RuntimeConfig): UserManager {
  const origin = window.location.origin;
  return new UserManager({
    authority: config.oidcIssuer,
    client_id: config.oidcClientId,
    redirect_uri: `${origin}/`,
    post_logout_redirect_uri: `${origin}/`,
    response_type: "code",
    scope: SCOPES,
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  });
}

// Claims are read for display only; P05 verifies every token on every request.
export function sessionFrom(user: User): Session {
  const payload = user.access_token.split(".")[1] ?? "";
  const bytes = Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const claims = JSON.parse(new TextDecoder().decode(bytes)) as {
    preferred_username?: string;
    tenant_id?: string;
    roles?: string[];
  };
  return {
    token: user.access_token,
    username: claims.preferred_username ?? user.profile.preferred_username ?? "usuário",
    tenant: claims.tenant_id ?? "",
    roles: claims.roles ?? [],
  };
}

export function isCallback(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has("state") && (params.has("code") || params.has("error"));
}
