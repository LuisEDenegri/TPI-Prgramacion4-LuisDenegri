import { isAxiosError } from "axios";

interface DetalleValidacion {
  msg?: string;
}

/** Convierte el `detail` de FastAPI en un mensaje para mostrar en pantalla. */
export function handleApiError(error: unknown, porDefecto = "Ocurrió un error"): string {
  if (isAxiosError<{ detail?: string | DetalleValidacion[] }>(error)) {
    const detail = error.response?.data?.detail;

    // 400, 401, 403, 404 y 409 mandan un string
    if (typeof detail === "string") return detail;

    // 422 manda la lista de campos que no validaron
    if (Array.isArray(detail)) {
      const mensajes = detail.map((e) => e.msg).filter(Boolean);
      if (mensajes.length > 0) return mensajes.join(". ");
    }

    if (!error.response) return "No se pudo conectar con el servidor";
  }

  return error instanceof Error ? error.message : porDefecto;
}

export function esErrorDePermisos(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 403;
}
