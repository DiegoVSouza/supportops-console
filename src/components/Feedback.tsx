import { StatusSeal, WakeNotice, useElapsed, type GlyphKind } from "colagem-ui";

const GLYPH: Record<string, GlyphKind> = {
  open: "none", queued: "none", running: "partial", needs_approval: "partial", pending: "partial",
  succeeded: "full", done: "full", approved: "full", failed: "fail", rejected: "fail", expired: "fail",
};
const LABEL: Record<string, string> = {
  open: "aberto", queued: "na fila", running: "em execução", needs_approval: "aguarda aprovação",
  pending: "pendente", succeeded: "concluído", done: "concluído", approved: "aprovado", failed: "falhou",
  rejected: "rejeitado", expired: "expirado",
};

export const WAKE_LABELS = {
  waking: (service: string, elapsed: number, expected: number) =>
    `Acordando ${service}: ${elapsed} s de cerca de ${expected} s. Sem uso, o serviço dorme.`,
  failed: (service: string) => `${service} não respondeu.`,
  retry: "Tentar de novo",
};

export function Seal({ status }: { status: string }) {
  return <StatusSeal kind={GLYPH[status] ?? "none"} label={LABEL[status] ?? status} />;
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="alert"><span aria-hidden="true">✕ </span>{message}</p>;
}

const noop = () => undefined;

/** Plain text first; after a few seconds explain that the Fly service may be waking (FE-003). */
export function Loading({ service = "a API" }: { service?: string }) {
  const elapsed = useElapsed(true);
  if (elapsed < 4) return <p>carregando…</p>;
  return <WakeNotice service={service} elapsed={elapsed} expected={20} onRetry={noop} labels={WAKE_LABELS} />;
}
