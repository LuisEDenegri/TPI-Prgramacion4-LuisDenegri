import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 127.0.0.1 ademas de localhost: en Windows "localhost" resuelve primero a
    // ::1 y el dev server, atado solo a esa interfaz, rechaza las conexiones
    // por IPv4. Con "true" escucha en todas y las dos URLs funcionan.
    host: true,
    port: 5173,
  },
  resolve: {
    // "@/features/pedidos" -> "src/features/pedidos" (el mismo alias va en tsconfig.app.json)
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
