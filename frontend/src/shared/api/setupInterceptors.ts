import { isAxiosError } from "axios";
import { useAuthStore } from "@/store/authStore";
import axiosInstance from "./axiosInstance";

// en estas dos un 401 es una respuesta esperada (clave incorrecta, o todavia
// no hay sesion al abrir la app) y la maneja el propio store
const SIN_LIMPIAR = ["/auth/token", "/auth/me"];

let configurado = false;

/** Se llama una sola vez, en main.tsx, antes de montar la aplicacion. */
export function setupInterceptors(): void {
  if (configurado) return;
  configurado = true;

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (isAxiosError<{ detail?: string }>(error)) {
        const status = error.response?.status;
        const url = error.config?.url ?? "";
        const detail = error.response?.data?.detail;

        const esRutaDeSesion = SIN_LIMPIAR.some((ruta) => url.includes(ruta));
        const cuentaDesactivada = status === 400 && detail === "Cuenta de usuario desactivada";

        // 401: la sesion vencio o la cookie ya no vale.
        // 400 "Cuenta de usuario desactivada": el admin lo dio de baja mientras
        // navegaba. En los dos casos se limpia el store y ProtectedRoute
        // manda al login. Un 403 NO entra aca: la sesion sigue siendo valida,
        // solo falta permiso para esa accion.
        if ((status === 401 && !esRutaDeSesion) || cuentaDesactivada) {
          useAuthStore.getState().limpiarSesion();
        }
      }

      return Promise.reject(error);
    },
  );
}
