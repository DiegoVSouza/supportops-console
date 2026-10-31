import { useCallback, useEffect, useState } from "react";
import { Button, DataTable, EmptyState, Toast } from "colagem-ui";
import { describeError, formatCents, type Api, type Approval } from "../api/client";
import { ErrorNote, Loading } from "../components/Feedback";
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
      {approvals === null && !error && <Loading />}
      {approvals?.length === 0 && <EmptyState numeral="00" text="Nenhuma aprovação pendente." />}
      {approvals && approvals.length > 0 && (
        <DataTable<Approval>
          caption="Reembolsos aguardando decisão"
          rowKey={(approval) => approval.id}
          rows={approvals}
          columns={[
            { key: "ticket", label: "Ticket", render: (a) => <a href={`#/tickets/${encodeURIComponent(a.ticket_id)}`}>Abrir ticket</a> },
            { key: "action", label: "Ação", render: (a) => (a.action === "issue_refund" ? "Reembolso" : a.action) },
            { key: "amount", label: "Valor", numeric: true, render: (a) => formatCents(a.amount_cents) },
            { key: "by", label: "Solicitante", render: (a) => a.requested_by },
            {
              key: "decision",
              label: "Decisão",
              render: (a) => {
                const confirming = pending?.id === a.id ? pending.decision : null;
                const amount = formatCents(a.amount_cents);
                return confirming ? (
                  <span className="actions">
                    <Button size="sm" onClick={() => void decide(a.id, confirming)}>
                      Confirmar {confirming === "approved" ? "aprovação" : "rejeição"} de {amount}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setPending(null)}>Cancelar</Button>
                  </span>
                ) : (
                  <span className="actions">
                    <Button size="sm" aria-label={`Aprovar reembolso de ${amount}`} onClick={() => setPending({ id: a.id, decision: "approved" })}>Aprovar</Button>
                    <Button size="sm" variant="danger" aria-label={`Rejeitar reembolso de ${amount}`} onClick={() => setPending({ id: a.id, decision: "rejected" })}>Rejeitar</Button>
                  </span>
                );
              },
            },
          ]}
        />
      )}
      {toast && <Toast kind="ok" onClose={closeToast} closeLabel="Fechar aviso">{toast}</Toast>}
    </>
  );
}
