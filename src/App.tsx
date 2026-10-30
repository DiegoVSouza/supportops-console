import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserManager } from "oidc-client-ts";
import { createApi } from "./api/client";
import { createUserManager, isCallback, sessionFrom, type Session } from "./auth";
import type { RuntimeConfig } from "./config";
import { Layout, Logo } from "./components/Layout";
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
  if (!session) return <SignIn manager={manager} failed={failed} />;
  return <Console manager={manager} session={session} />;
}

function SignIn({ manager, failed }: { manager: UserManager; failed: boolean }) {
  const [error, setError] = useState(failed);
  return (
    <main className="wrap signin">
      <Logo />
      <h1 className="headline">Central de atendimento</h1>
      <p className="lead">Tickets, análise assistida e aprovações de reembolso em um só lugar.</p>
      {error && <p role="alert" className="alert">✕ Não foi possível autenticar. Verifique o servidor de identidade e tente de novo.</p>}
      <button className="btn" onClick={() => manager.signinRedirect().catch(() => setError(true))}>Entrar</button>
    </main>
  );
}

function Console({ manager, session }: { manager: UserManager; session: Session }) {
  const route = useRoute();
  const token = useRef(session.token);
  token.current = session.token;
  const expire = useCallback(() => void manager.removeUser(), [manager]);
  const api = useMemo(() => createApi(`${window.location.origin}/api`, () => token.current, expire), [expire]);
  const canApprove = session.roles.includes("approver");
  return (
    <Layout session={session} route={route} canApprove={canApprove} onSignOut={() => void manager.signoutRedirect()}>
      {route.name === "tickets" && <TicketsPage api={api} canWrite={session.roles.includes("agent")} />}
      {route.name === "ticket" && <TicketPage key={route.id} api={api} id={route.id} canAct={session.roles.includes("agent")} />}
      {route.name === "approvals" && <ApprovalsPage api={api} canApprove={canApprove} />}
    </Layout>
  );
}
