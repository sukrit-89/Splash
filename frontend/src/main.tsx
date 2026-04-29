import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installErrorTracking } from "./lib/errorTracking";
import "./styles.css";

installErrorTracking();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
