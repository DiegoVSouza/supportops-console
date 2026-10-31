import "colagem-ui/fonts.css";
import "colagem-ui/plate-fonts.css";
import "colagem-ui/tokens.css";
import "colagem-ui/style.css";
import "./styles/console.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Headline } from "colagem-ui";
import { App } from "./App";
import { ErrorNote } from "./components/Feedback";
import { loadConfig } from "./config";

const root = createRoot(document.getElementById("root") as HTMLElement);

loadConfig()
  .then((config) =>
    root.render(
      <StrictMode>
        <App config={config} />
      </StrictMode>,
    ),
  )
  .catch(() =>
    root.render(
      <main className="wrap">
        <Headline>Console indisponível</Headline>
        <ErrorNote message="Não foi possível carregar a configuração. Tente novamente em instantes." />
      </main>,
    ),
  );
