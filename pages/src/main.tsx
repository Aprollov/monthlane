import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../app/globals.css";
import { MonthlaneApp } from "../../app/src/MonthlaneApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MonthlaneApp />
  </StrictMode>,
);
