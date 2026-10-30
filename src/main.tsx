import "@fontsource/anton/400.css";
import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadConfig } from "./config";
import "./styles/tokens.css";
import "./styles/console.css";

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
        <h1 className="headline">Console indisponível</h1>
        <p role="alert">Não foi possível carregar a configuração. Tente novamente em instantes.</p>
      </main>,
    ),
  );
