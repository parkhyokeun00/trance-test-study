import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

window.addEventListener("hashchange", () =>
  window.parent.postMessage(
    {
      hash: window.location.hash,
    },
    "https://huggingface.co"
  )
);
