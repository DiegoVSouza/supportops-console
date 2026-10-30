import { useEffect } from "react";

const GLYPH: Record<string, string> = {
  open: "○", queued: "○", running: "◐", needs_approval: "◐", pending: "◐",
  succeeded: "●", done: "●", approved: "●", failed: "✕", rejected: "✕", expired: "✕",
};
const LABEL: Record<string, string> = {
  open: "aberto", queued: "na fila", running: "em execução", needs_approval: "aguarda aprovação",
  pending: "pendente", succeeded: "concluído", done: "concluído", approved: "aprovado", failed: "falhou",
  rejected: "rejeitado", expired: "expirado",
};

export function Seal({ status }: { status: string }) {
  return <span className="seal">{GLYPH[status] ?? "○"} {LABEL[status] ?? status}</span>;
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="alert">✕ {message}</p>;
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div className="toast" role="status">
      <span>✓ {message}</span>
      <button className="btn small ghost" onClick={onClose} aria-label="Fechar aviso">✕</button>
    </div>
  );
}
