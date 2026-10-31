import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Headline, Lead, Plate, WakeNotice, useElapsed } from "colagem-ui";
import type { UserManager } from "oidc-client-ts";
import { createApi } from "./api/client";
import { createUserManager, isCallback, sessionFrom, type Session } from "./auth";
import { apiBase, type RuntimeConfig } from "./config";
import { ErrorNote, WAKE_LABELS } from "./components/Feedback";
import { Layout } from "./components/Layout";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { TicketPage } from "./pages/TicketPage";
import { TicketsPage } from "./pages/TicketsPage";
import { useRoute } from "./useRoute";

export function App({ config }: { config: RuntimeConfig }) {
  const manager = useMemo(() => createUserManager(config), [config]);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const update = () => void manager.getUser().then((user) => setSession(user && !user.expired ? sessionFrom(user) : null));
    manager.events.addUserLoaded(update);
    manager.events.addUserUnloaded(update);
    manager.events.addAccessTokenExpired(update);
    return () => {
      manager.events.removeUserLoaded(update);
      manager.events.removeUserUnloaded(update);
      manager.events.removeAccessTokenExpired(update);
    };
  }, [manager]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const boot = async () => {
      if (isCallback(window.location.search)) {
        await manager.signinRedirectCallback();
        window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      }
      const user = await manager.getUser();
      setSession(user && !user.expired ? sessionFrom(user) : null);
    };
    boot().catch(() => setFailed(true)).finally(() => setReady(true));
  }, [manager]);

  if (!ready) return <p className="wrap">carregando…</p>;
  if (!session) return <SignIn manager={manager} issuer={config.oidcIssuer} failed={failed} />;
  return <Console manager={manager} session={session} apiBaseUrl={apiBase(config)} />;
}

const WAKE_TIMEOUT_MS = 240_000;

// The identity server stops at idle, so sign-in may have to wait for it to boot.
export async function waitForIdentityServer(issuer: string): Promise<boolean> {
  const deadline = Date.now() + WAKE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${issuer}/.well-known/openid-configuration`, { cache: "no-store" });
      if (response.ok) return true;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 3000));
  }
  return false;
}

function SignIn({ manager, issuer, failed }: { manager: UserManager; issuer: string; failed: boolean }) {
  const [error, setError] = useState(failed);
  const [waking, setWaking] = useState(false);
  const elapsed = useElapsed(waking);

  async function start() {
    setError(false);
    setWaking(true);
    if (await waitForIdentityServer(issuer)) await manager.signinRedirect().catch(() => setError(true));
    else setError(true);
    setWaking(false);
  }

  return (
    <main className="wrap signin">
      <Plate text="SupportOps" label="Console" />
      <Headline>Central de atendimento</Headline>
      <Lead>Tickets, análise assistida e aprovações de reembolso em um só lugar.</Lead>
      {error && <ErrorNote message="Não foi possível autenticar. Verifique o servidor de identidade e tente de novo." />}
      {waking && <WakeNotice service="o serviço de login" elapsed={elapsed} expected={25} onRetry={() => undefined} labels={WAKE_LABELS} />}
      <Button disabled={waking} disabledReason={waking ? "Aguarde o serviço de login acordar." : undefined} onClick={() => void start()}>Entrar</Button>
    </main>
  );
}

function Console({ manager, session, apiBaseUrl }: { manager: UserManager; session: Session; apiBaseUrl: string }) {
  const route = useRoute();
  const token = useRef(session.token);
  token.current = session.token;
  const expire = useCallback(() => void manager.removeUser(), [manager]);
  const api = useMemo(() => createApi(apiBaseUrl, () => token.current, expire), [apiBaseUrl, expire]);
  const canApprove = session.roles.includes("approver");
  return (
    <Layout session={session} route={route} canApprove={canApprove} onSignOut={() => void manager.signoutRedirect()}>
      {route.name === "tickets" && <TicketsPage api={api} canWrite={session.roles.includes("agent")} />}
      {route.name === "ticket" && <TicketPage key={route.id} api={api} id={route.id} canAct={session.roles.includes("agent")} />}
      {route.name === "approvals" && <ApprovalsPage api={api} canApprove={canApprove} />}
    </Layout>
  );
}
