import { useCallback, useEffect, useState, type FormEvent } from "react";
import { describeError, type Api, type Ticket } from "../api/client";
import { ErrorNote, Seal } from "../components/Feedback";
import { PageTitle } from "../components/Layout";

export function TicketsPage({ api, canWrite }: { api: Api; canWrite: boolean }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: failure, response } = await api.GET("/v1/tickets");
    if (data) setTickets(data);
    else setError(describeError(response.status, failure));
  }, [api]);

  useEffect(() => void load(), [load]);

  const newest = tickets ? [...tickets].reverse() : [];
  return (
    <>
      <PageTitle>Tickets</PageTitle>
      {error && <ErrorNote message={error} />}
      <div className={canWrite ? "split" : undefined}>
      {canWrite && <NewTicket api={api} onCreated={load} />}
      <div>
      {tickets === null && !error && <p>carregando…</p>}
      {tickets?.length === 0 && (
        <div className="card empty"><span className="ghost-number" aria-hidden="true">00</span><p>Nenhum ticket neste tenant ainda.</p></div>
      )}
      <ul className="items">
        {newest.map((ticket) => (
          <li key={ticket.id}>
            <article className="card">
              <Seal status={ticket.status ?? "open"} />
              <h2 className="card-title"><a href={`#/tickets/${encodeURIComponent(ticket.id ?? "")}`}>{ticket.subject}</a></h2>
              <p className="muted clamp">{ticket.body}</p>
              <p className="meta"><span>{new Date(ticket.created_at ?? "").toLocaleString("pt-BR")}</span><span className="tag">{ticket.customer_id}</span></p>
            </article>
          </li>
        ))}
      </ul>
      </div>
      </div>
    </>
  );
}

function NewTicket({ api, onCreated }: { api: Api; onCreated: () => Promise<void> }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setError("");
    const { data, error: failure, response } = await api.POST("/v1/tickets", {
      body: {
        customer_id: String(values.get("customer_id")),
        subject: String(values.get("subject")),
        body: String(values.get("body")),
      },
    });
    setBusy(false);
    if (data) {
      form.reset();
      await onCreated();
    } else {
      setError(describeError(response.status, failure));
    }
  }

  return (
    <form className="panel" onSubmit={(event) => void submit(event)}>
      <h2 className="panel-title">Novo ticket</h2>
      {error && <ErrorNote message={error} />}
      <label htmlFor="customer_id">Cliente</label>
      <input id="customer_id" name="customer_id" required maxLength={100} />
      <label htmlFor="subject">Assunto</label>
      <input id="subject" name="subject" required maxLength={200} />
      <label htmlFor="body">Descrição</label>
      <textarea id="body" name="body" required maxLength={10000} rows={4} />
      <button className="btn" disabled={busy}>{busy ? "Enviando…" : "Criar ticket"}</button>
    </form>
  );
}
