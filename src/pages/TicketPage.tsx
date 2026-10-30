import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { describeError, type Api, type Task, type Ticket } from "../api/client";
import { ErrorNote, Seal, Toast } from "../components/Feedback";
import { PageTitle } from "../components/Layout";

const POLL_MS = 3000;
const TERMINAL = new Set(["succeeded", "failed", "needs_approval", "expired"]);

interface Citation { document_id?: string; title?: string; text?: string }

function taskKey(ticketId: string) {
  return `triage-task:${ticketId}`;
}

function readStoredTask(ticketId: string): string | null {
  try {
    return window.sessionStorage.getItem(taskKey(ticketId));
  } catch {
    return null;
  }
}

export function TicketPage({ api, id, canAct }: { api: Api; id: string; canAct: boolean }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const closeToast = useCallback(() => setToast(""), []);

  useEffect(() => {
    void api.GET("/v1/tickets/{ticket_id}", { params: { path: { ticket_id: id } } }).then(({ data, error: failure, response }) => {
      if (data) setTicket(data);
      else setError(describeError(response.status, failure));
    });
  }, [api, id]);

  if (error) return <><PageTitle>Ticket</PageTitle><ErrorNote message={error} /><p><a href="#/tickets">Voltar para tickets</a></p></>;
  if (!ticket) return <p>carregando…</p>;
  return (
    <>
      <p><a href="#/tickets">← Voltar para tickets</a></p>
      <PageTitle>{ticket.subject}</PageTitle>
      <article className="card focus">
        <Seal status={ticket.status ?? "open"} />
        <p className="prewrap">{ticket.body}</p>
        <p className="meta"><span>{new Date(ticket.created_at ?? "").toLocaleString("pt-BR")}</span><span className="tag">{ticket.customer_id}</span></p>
      </article>
      <Triage api={api} ticketId={id} canAct={canAct} />
      {canAct && <Refund api={api} ticketId={id} onDone={setToast} />}
      {canAct && <Rating api={api} ticketId={id} onDone={setToast} />}
      {toast && <Toast message={toast} onClose={closeToast} />}
    </>
  );
}

function Triage({ api, ticketId, canAct }: { api: Api; ticketId: string; canAct: boolean }) {
  const [taskId, setTaskId] = useState(() => readStoredTask(ticketId));
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    if (!taskId) return;
    let stopped = false;
    const poll = async () => {
      const { data, error: failure, response } = await api.GET("/v1/tasks/{task_id}", { params: { path: { task_id: taskId } } });
      if (stopped) return;
      if (data) setTask(data);
      else setError(describeError(response.status, failure));
      if (data && !TERMINAL.has(data.status)) timer.current = window.setTimeout(() => void poll(), POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer.current);
    };
  }, [api, taskId]);

  async function start() {
    setBusy(true);
    setError("");
    setTask(null);
    const { data, error: failure, response } = await api.POST("/v1/tasks", {
      params: { header: { "Idempotency-Key": crypto.randomUUID() } },
      body: { ticket_id: ticketId },
    });
    setBusy(false);
    if (!data) {
      setError(describeError(response.status, failure));
      return;
    }
    try {
      window.sessionStorage.setItem(taskKey(ticketId), data.id);
    } catch {
      // Only the reload convenience is lost when storage is blocked.
    }
    setTaskId(data.id);
  }

  const running = task !== null && !TERMINAL.has(task.status);
  const result = task?.result as { response?: string; citations?: Citation[]; approval_state?: string; refund?: { amount_cents?: number } } | null | undefined;
  return (
    <section className="panel" aria-labelledby="triage-title">
      <h2 id="triage-title" className="panel-title">Análise</h2>
      {error && <ErrorNote message={error} />}
      {canAct && <button className="btn" onClick={() => void start()} disabled={busy || running}>{task ? "Analisar novamente" : "Analisar ticket"}</button>}
      {!task && !taskId && <p className="muted">Nenhuma análise nesta sessão.</p>}
      <div aria-live="polite">
        {task && <p><Seal status={task.status} /></p>}
        {task?.error && <p className="alert">✕ Falha: {task.error}</p>}
        {result?.response && <p className="lead prewrap">{result.response}</p>}
        {task?.status === "needs_approval" && <p>Reembolso proposto. A tarefa continua depois da decisão de um aprovador.</p>}
        {result?.refund && <p>✓ Reembolso simulado registrado.</p>}
      </div>
      {result?.citations && result.citations.length > 0 && (
        <>
          <h3 className="sub">Fontes</h3>
          <ul className="citations">
            {result.citations.map((citation, index) => (
              <li key={index}><strong>{citation.title ?? citation.document_id}</strong><p className="muted">{citation.text}</p></li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Refund({ api, ticketId, onDone }: { api: Api; ticketId: string; onDone: (message: string) => void }) {
  const [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    const { data, error: failure, response } = await api.POST("/v1/tickets/{ticket_id}/refund-approvals", {
      params: { path: { ticket_id: ticketId }, header: { "Idempotency-Key": key.current } },
      body: { amount_cents: Number(new FormData(form).get("amount_cents")) },
    });
    if (data) {
      key.current = crypto.randomUUID();
      form.reset();
      onDone("Solicitação enviada para aprovação");
    } else {
      setError(describeError(response.status, failure));
    }
  }

  return (
    <form className="panel" onSubmit={(event) => void submit(event)}>
      <h2 className="panel-title">Solicitar reembolso</h2>
      {error && <ErrorNote message={error} />}
      <label htmlFor="amount_cents">Valor em centavos (1 a 5000)</label>
      <input id="amount_cents" name="amount_cents" type="number" min={1} max={5000} required />
      <p className="muted" id="refund-note">Registra um pedido de aprovação. O efeito do reembolso só é executado pela tarefa de análise.</p>
      <button className="btn ghost">Pedir aprovação</button>
    </form>
  );
}

function Rating({ api, ticketId, onDone }: { api: Api; ticketId: string; onDone: (message: string) => void }) {
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setError("");
    const { data, error: failure, response } = await api.POST("/v1/tickets/{ticket_id}/feedback", {
      params: { path: { ticket_id: ticketId } },
      body: { rating: Number(values.get("rating")), comment: String(values.get("comment")) },
    });
    if (data) {
      form.reset();
      onDone("Avaliação registrada");
    } else {
      setError(describeError(response.status, failure));
    }
  }

  return (
    <form className="panel" onSubmit={(event) => void submit(event)}>
      <h2 className="panel-title">Avaliar atendimento</h2>
      {error && <ErrorNote message={error} />}
      <label htmlFor="rating">Nota</label>
      <select id="rating" name="rating" defaultValue="5">
        {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
      <label htmlFor="comment">Comentário</label>
      <textarea id="comment" name="comment" maxLength={1000} rows={2} />
      <button className="btn ghost">Enviar avaliação</button>
    </form>
  );
}
