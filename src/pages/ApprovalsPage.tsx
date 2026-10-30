import { useCallback, useEffect, useState } from "react";
import { describeError, formatCents, type Api, type Approval } from "../api/client";
import { ErrorNote, Toast } from "../components/Feedback";
import { PageTitle } from "../components/Layout";

type Decision = "approved" | "rejected";

export function ApprovalsPage({ api, canApprove }: { api: Api; canApprove: boolean }) {
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pending, setPending] = useState<{ id: string; decision: Decision } | null>(null);
  const closeToast = useCallback(() => setToast(""), []);

  const load = useCallback(async () => {
    const { data, error: failure, response } = await api.GET("/v1/approvals", { params: { query: { state: "pending" } } });
    if (data) setApprovals(data);
    else setError(describeError(response.status, failure));
  }, [api]);

  useEffect(() => {
    if (canApprove) void load();
  }, [canApprove, load]);

  async function decide(id: string, decision: Decision) {
    setError("");
    const { data, error: failure, response } = await api.POST("/v1/approvals/{approval_id}/decision", {
      params: { path: { approval_id: id } },
      body: { decision },
    });
    setPending(null);
    if (data) setToast(decision === "approved" ? "Reembolso aprovado" : "Reembolso rejeitado");
    else setError(describeError(response.status, failure));
    await load();
  }

  if (!canApprove) return <><PageTitle>Aprovações</PageTitle><ErrorNote message="Seu perfil não permite decidir aprovações." /></>;
  return (
    <>
      <PageTitle>Aprovações</PageTitle>
      {error && <ErrorNote message={error} />}
      {approvals === null && !error && <p>carregando…</p>}
      {approvals?.length === 0 && <div className="card empty"><span className="ghost-number" aria-hidden="true">00</span><p>Nenhuma aprovação pendente.</p></div>}
      {approvals && approvals.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="sr">Reembolsos aguardando decisão</caption>
            <thead>
              <tr><th scope="col">Ticket</th><th scope="col">Ação</th><th scope="col" className="num">Valor</th><th scope="col">Solicitante</th><th scope="col">Decisão</th></tr>
            </thead>
            <tbody>
              {approvals.map((approval) => {
                const confirming = pending?.id === approval.id ? pending.decision : null;
                const amount = formatCents(approval.amount_cents);
                return (
                  <tr key={approval.id}>
                    <td><a href={`#/tickets/${encodeURIComponent(approval.ticket_id)}`}>Abrir ticket</a></td>
                    <td>{approval.action === "issue_refund" ? "Reembolso" : approval.action}</td>
                    <td className="num">{amount}</td>
                    <td>{approval.requested_by}</td>
                    <td className="actions">
                      {confirming ? (
                        <>
                          <button className="btn small" onClick={() => void decide(approval.id, confirming)}>
                            Confirmar {confirming === "approved" ? "aprovação" : "rejeição"} de {amount}
                          </button>
                          <button className="btn small ghost" onClick={() => setPending(null)}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button className="btn small" aria-label={`Aprovar reembolso de ${amount}`} onClick={() => setPending({ id: approval.id, decision: "approved" })}>Aprovar</button>
                          <button className="btn small danger" aria-label={`Rejeitar reembolso de ${amount}`} onClick={() => setPending({ id: approval.id, decision: "rejected" })}>✕ Rejeitar</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {toast && <Toast message={toast} onClose={closeToast} />}
    </>
  );
}
