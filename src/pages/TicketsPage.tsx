import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, Card, EmptyState, Field, Panel } from "colagem-ui";
import { describeError, type Api, type Ticket } from "../api/client";
import { ErrorNote, Loading, Seal } from "../components/Feedback";
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
          {tickets === null && !error && <Loading />}
          {tickets?.length === 0 && <EmptyState numeral="00" text="Nenhum ticket neste tenant ainda." />}
          <ul className="items">
            {newest.map((ticket, index) => (
              <li key={ticket.id}>
                <Card
                  index={index}
                  headingLevel={2}
                  label={`Ticket: ${ticket.subject}`}
                  seal={<Seal status={ticket.status ?? "open"} />}
                  title={<a className="card-link" href={`#/tickets/${encodeURIComponent(ticket.id ?? "")}`}>{ticket.subject}</a>}
                  summary={ticket.body}
                  clamp
                  meta={new Date(ticket.created_at ?? "").toLocaleString("pt-BR")}
                  tag={ticket.customer_id}
                />
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
    <Panel as="form" title="Novo ticket" onSubmit={(event) => void submit(event)}>
      {error && <ErrorNote message={error} />}
      <Field label="Cliente" name="customer_id" required maxLength={100} />
      <Field label="Assunto" name="subject" required maxLength={200} />
      <Field label="Descrição" name="body" multiline required maxLength={10000} />
      <Button type="submit" disabled={busy}>{busy ? "Enviando…" : "Criar ticket"}</Button>
    </Panel>
  );
}
