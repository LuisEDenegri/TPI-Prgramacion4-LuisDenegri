import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "@/shared/api/queryClient";
import { setupInterceptors } from "@/shared/api/setupInterceptors";
import App from "./App";
import "./index.css";

// antes de montar: asi la primera request ya pasa por el interceptor de 401
setupInterceptors();

const contenedor = document.getElementById("root");
if (!contenedor) throw new Error("Falta el elemento #root en index.html");

createRoot(contenedor).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
