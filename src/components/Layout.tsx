import { useEffect, useRef, type ReactNode } from "react";
import type { Session } from "../auth";
import type { Route } from "../useRoute";

const KITS = ["k0", "k1", "k2"];

export function Logo() {
  const name = "SUPPORTOPS";
  return (
    <span className="logo">
      <span className="sr">SupportOps</span>
      <span aria-hidden="true" className="logo-letters">
        {[...name].map((letter, index) => (
          <span key={index} className={KITS[index % 3]}>{letter}</span>
        ))}
      </span>
    </span>
  );
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
      <a className="skip" href="#content" onClick={(event) => {
        event.preventDefault();
        document.getElementById("content")?.focus();
      }}>Pular para o conteúdo</a>
      <header className="top">
        <a href="#/tickets" className="brand"><Logo /></a>
        <nav aria-label="Principal">
          <a href="#/tickets" aria-current={route.name !== "approvals" ? "page" : undefined}>Tickets</a>
          {canApprove && <a href="#/approvals" aria-current={route.name === "approvals" ? "page" : undefined}>Aprovações</a>}
        </nav>
        <div className="who">
          <span>{session.username} · {session.tenant}</span>
          <button className="btn small ghost" onClick={onSignOut}>Sair</button>
        </div>
      </header>
      <main id="content" tabIndex={-1} className="wrap">{children}</main>
      <footer className="foot">SupportOps Console · decisões sensíveis passam por aprovação humana</footer>
    </>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return <h1 ref={ref} tabIndex={-1} className="headline">{children}</h1>;
}
