import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Card, Field, Panel, SelectField, Toast } from "colagem-ui";
import { describeError, type Api, type Task, type Ticket } from "../api/client";
import { ErrorNote, Loading, Seal } from "../components/Feedback";
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

function storeTask(ticketId: string, id: string) {
  try {
    window.sessionStorage.setItem(taskKey(ticketId), id);
  } catch {
    // Only the reload convenience is lost when storage is blocked.
  }
}

export function TicketPage({ api, id, canAct }: { api: Api; id: string; canAct: boolean }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [taskId, setTaskId] = useState(() => readStoredTask(id));
  const closeToast = useCallback(() => setToast(""), []);
  const followTask = useCallback((task: string) => {
    storeTask(id, task);
    setTaskId(task);
  }, [id]);

  useEffect(() => {
    void api.GET("/v1/tickets/{ticket_id}", { params: { path: { ticket_id: id } } }).then(({ data, error: failure, response }) => {
      if (data) setTicket(data);
      else setError(describeError(response.status, failure));
    });
  }, [api, id]);

  if (error) return <><PageTitle>Ticket</PageTitle><ErrorNote message={error} /><p><a href="#/tickets">Voltar para tickets</a></p></>;
  if (!ticket) return <Loading />;
  return (
    <>
      <p><a href="#/tickets">← Voltar para tickets</a></p>
      <PageTitle>{ticket.subject}</PageTitle>
      <Card
        variant="focus"
        index={1}
        headingLevel={2}
        label={`Ticket: ${ticket.subject}`}
        seal={<Seal status={ticket.status ?? "open"} />}
        title="Descrição"
        meta={new Date(ticket.created_at ?? "").toLocaleString("pt-BR")}
        tag={ticket.customer_id}
      >
        <p className="card-sum prewrap">{ticket.body}</p>
      </Card>
      <Triage api={api} ticketId={id} canAct={canAct} taskId={taskId} onStarted={followTask} />
      {canAct && <Refund api={api} ticketId={id} onDone={setToast} onTask={followTask} />}
      {canAct && <Rating api={api} ticketId={id} onDone={setToast} />}
      {toast && <Toast kind="ok" onClose={closeToast} closeLabel="Fechar aviso">{toast}</Toast>}
    </>
  );
}

function Triage({ api, ticketId, canAct, taskId, onStarted }: {
  api: Api;
  ticketId: string;
  canAct: boolean;
  taskId: string | null;
  onStarted: (task: string) => void;
}) {
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
    onStarted(data.id);
  }

  const running = task !== null && !TERMINAL.has(task.status);
  const result = task?.result as { response?: string; citations?: Citation[]; approval_state?: string; refund?: { amount_cents?: number } } | null | undefined;
  return (
    <Panel title="Análise">
      {error && <ErrorNote message={error} />}
      {canAct && <Button onClick={() => void start()} disabled={busy || running} disabledReason={running ? "A análise está em andamento." : undefined}>{task ? "Analisar novamente" : "Analisar ticket"}</Button>}
      {!task && !taskId && <p className="muted">Nenhuma análise nesta sessão.</p>}
      <div aria-live="polite">
        {task && <p><Seal status={task.status} /></p>}
        {task?.error && <ErrorNote message={`Falha: ${task.error}`} />}
        {result?.response && <p className="lead prewrap">{result.response}</p>}
        {task?.status === "needs_approval" && <p>Reembolso aguardando decisão. A tarefa continua depois que um aprovador decidir.</p>}
        {result?.refund && <p>✓ Reembolso simulado registrado.</p>}
        {result?.approval_state === "rejected" && <p>✕ Reembolso rejeitado pelo aprovador.</p>}
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
    </Panel>
  );
}

function Refund({ api, ticketId, onDone, onTask }: {
  api: Api;
  ticketId: string;
  onDone: (message: string) => void;
  onTask: (task: string) => void;
}) {
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
      if (data.task_id) onTask(data.task_id);
      onDone("Solicitação enviada para aprovação");
    } else {
      setError(describeError(response.status, failure));
    }
  }

  return (
    <Panel as="form" title="Solicitar reembolso" onSubmit={(event) => void submit(event)}>
      {error && <ErrorNote message={error} />}
      <Field label="Valor em centavos (1 a 5000)" name="amount_cents" type="number" min={1} max={5000} required hint="Um aprovador decide. Aprovado, o reembolso é executado no valor pedido. A autorização vale 15 minutos." />
      <Button type="submit" variant="secondary">Pedir aprovação</Button>
    </Panel>
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
    <Panel as="form" title="Avaliar atendimento" onSubmit={(event) => void submit(event)}>
      {error && <ErrorNote message={error} />}
      <SelectField label="Nota" name="rating" defaultValue="5">
        {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}</option>)}
      </SelectField>
      <Field label="Comentário" name="comment" multiline maxLength={1000} />
      <Button type="submit" variant="secondary">Enviar avaliação</Button>
    </Panel>
  );
}
