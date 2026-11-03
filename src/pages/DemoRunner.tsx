import { useEffect, useRef, useState } from "react";
import { Button, Panel } from "colagem-ui";
import { describeError, type Api } from "../api/client";
import { ErrorNote } from "../components/Feedback";
import { FlowChart } from "../components/FlowChart";
import { PRESETS, demoCustomer, type Preset, type RunView } from "../flow";

const POLL_MS = 2000;
const TERMINAL = new Set(["succeeded", "failed", "needs_approval", "expired"]);

const EMPTY: RunView = { ticketCreated: false, taskAccepted: false, status: null, error: null, result: null };

/** One click: pick an example, the console creates the ticket, starts the analysis and draws each stage as it happens. */
export function DemoRunner({ api, tenant, onCreated }: { api: Api; tenant: string; onCreated: () => Promise<void> }) {
  const [run, setRun] = useState<RunView>(EMPTY);
  const [error, setError] = useState("");
  const [last, setLast] = useState<Preset | null>(null);
  const [busy, setBusy] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    if (!taskId) return;
    let stopped = false;
    const poll = async () => {
      const { data, error: failure, response } = await api.GET("/v1/tasks/{task_id}", { params: { path: { task_id: taskId } } });
      if (stopped) return;
      if (!data) {
        setError(describeError(response.status, failure));
        setBusy(false);
        return;
      }
      const result = data.result && typeof data.result === "object" ? (data.result as Record<string, unknown>) : null;
      setRun((before) => ({ ...before, status: data.status, error: data.error ?? null, result }));
      if (TERMINAL.has(data.status)) {
        setBusy(false);
        return;
      }
      timer.current = window.setTimeout(() => void poll(), POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer.current);
    };
  }, [api, taskId]);

  async function start(preset: Preset) {
    setBusy(true);
    setError("");
    setLast(preset);
    setTaskId(null);
    setRun(EMPTY);
    const created = await api.POST("/v1/tickets", { body: { customer_id: demoCustomer(tenant), subject: preset.subject, body: preset.body } });
    if (!created.data?.id) {
      setError(describeError(created.response.status, created.error));
      setBusy(false);
      return;
    }
    setRun({ ...EMPTY, ticketCreated: true });
    void onCreated();
    const started = await api.POST("/v1/tasks", { params: { header: { "Idempotency-Key": crypto.randomUUID() } }, body: { ticket_id: created.data.id } });
    if (!started.data) {
      setError(describeError(started.response.status, started.error));
      setBusy(false);
      return;
    }
    setRun((before) => ({ ...before, taskAccepted: true, status: started.data?.status ?? "queued" }));
    setTaskId(started.data.id);
  }

  const answer = typeof run.result?.response === "string" ? run.result.response : "";
  const started = run.ticketCreated || error !== "";
  return (
    <Panel title="Veja o projeto funcionando">
      <p className="lead">Escolha um exemplo. O console cria o ticket, analisa e mostra cada etapa e qual projeto anterior faz o trabalho.</p>
      <ul className="presets" aria-label="Exemplos de ticket">
        {PRESETS.map((preset) => (
          <li key={preset.id}>
            <Button variant="secondary" disabled={busy} disabledReason={busy ? "Aguarde a análise terminar." : undefined} onClick={() => void start(preset)}>
              {preset.label}
            </Button>
            <span className="muted preset-hint">{preset.hint}</span>
          </li>
        ))}
      </ul>
      <div aria-live="polite">
        {error && (
          <>
            <ErrorNote message={error} />
            {last && <Button onClick={() => void start(last)} disabled={busy}>Tentar de novo</Button>}
          </>
        )}
        {run.status === "failed" && <ErrorNote message={`A análise falhou${run.error ? `: ${run.error}` : "."} Tente de novo.`} />}
        {run.status === "failed" && last && <Button onClick={() => void start(last)} disabled={busy}>Tentar de novo</Button>}
      </div>
      {started && <FlowChart run={run} />}
      {answer && (
        <>
          <h3 className="sub">Resposta</h3>
          <p className="lead prewrap">{answer}</p>
        </>
      )}
      {run.status === "needs_approval" && <p>Há um reembolso aguardando decisão. Um aprovador decide na aba Aprovações.</p>}
    </Panel>
  );
}
