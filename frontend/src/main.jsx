import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AstraProvider } from "./store/astraStore";
import "./index.css";

// Register Service Worker for offline PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.log("Service Worker registration skipped or failed:", err);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AstraProvider>
      <App />
    </AstraProvider>
  </React.StrictMode>
);

