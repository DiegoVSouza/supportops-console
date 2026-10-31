import type { ReactNode } from "react";
import { AppFooter, AppHeader, Button, Headline, Plate, SkipLink } from "colagem-ui";
import type { Session } from "../auth";
import type { Route } from "../useRoute";

export function Logo() {
  return <Plate text="SUPPORTOPS" size="logo" />;
}

export function Layout({ session, route, canApprove, onSignOut, children }: {
  session: Session;
  route: Route;
  canApprove: boolean;
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <SkipLink href="#content">Pular para o conteúdo</SkipLink>
      <AppHeader
        brand={<Logo />}
        brandHref="#/tickets"
        navLabel="Principal"
        nav={
          <>
            <a href="#/tickets" aria-current={route.name !== "approvals" ? "page" : undefined}>Tickets</a>
            {canApprove && <a href="#/approvals" aria-current={route.name === "approvals" ? "page" : undefined}>Aprovações</a>}
          </>
        }
      >
        <span className="who">{session.username} · {session.tenant}</span>
        <Button size="sm" variant="secondary" onClick={onSignOut}>Sair</Button>
      </AppHeader>
      <main id="content" tabIndex={-1} className="wrap">{children}</main>
      <AppFooter>SupportOps Console · decisões sensíveis passam por aprovação humana</AppFooter>
    </>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <Headline focusOnMount>{children}</Headline>;
}
