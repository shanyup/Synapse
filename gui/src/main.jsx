import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Block default browser right-click context menu globally
window.addEventListener("contextmenu", (e) => e.preventDefault(), { capture: true });
document.addEventListener("contextmenu", (e) => e.preventDefault(), { capture: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
