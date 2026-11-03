import { usedProjects, viewRun, type RunView, type StageState } from "../flow";

const WORD: Record<StageState, string> = {
  idle: "Aguardando",
  active: "Em andamento",
  done: "Feito",
  skipped: "Não usado",
  failed: "Bloqueado",
  unknown: "Sem informação",
};
const GLYPH: Record<StageState, string> = { idle: "○", active: "●", done: "✓", skipped: "–", failed: "✕", unknown: "?" };

/** The path of the ticket, one box per stage, with the earlier project that does it. Reads only the run it is given. */
export function FlowChart({ run }: { run: RunView }) {
  const views = viewRun(run);
  const used = usedProjects(views);
  return (
    <section className="flowchart" aria-label="O que acontece com o ticket">
      <h3 className="sub">O caminho do ticket</h3>
      <ol className="fc-list">
        {views.map(({ stage, state, note }, index) => (
          <li key={stage.id} className="fc-step" data-state={state}>
            <div className="fc-box">
              <p className="fc-top">
                <span className="fc-n">{index + 1}</span>
                <span className="fc-proj" title={stage.projectName}>{stage.project} · {stage.projectName}</span>
                <span className="fc-state"><span aria-hidden="true">{GLYPH[state]} </span>{WORD[state]}</span>
              </p>
              <p className="fc-title">{stage.title}</p>
              <p className="fc-what">{stage.what}</p>
              {note && <p className="fc-note">{note}</p>}
            </div>
          </li>
        ))}
      </ol>
      {used.length > 0 && <p className="muted fc-used">Projetos usados nesta execução: {used.join(", ")}.</p>}
    </section>
  );
}
