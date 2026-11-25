import axios from "axios";

const LOCALES = ["localhost", "127.0.0.1"];

// localhost y 127.0.0.1 son la misma maquina pero para el navegador son sitios
// distintos: si la pagina esta en uno y la API en el otro, la cookie samesite=lax
// no viaja y el login "anda" pero la sesion no queda. Por eso, en local, la API
// se llama con el mismo host con el que se abrio la pagina.
function urlDeLaApi(): string {
  const url = new URL(import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1");
  const hostPagina = window.location.hostname;
  if (LOCALES.includes(url.hostname) && LOCALES.includes(hostPagina)) {
    url.hostname = hostPagina;
  }
  return url.toString().replace(/\/$/, "");
}

// withCredentials: sin esto el navegador no manda ni guarda la cookie con el
// JWT. El frontend nunca lee el token: es HttpOnly.
const axiosInstance = axios.create({
  baseURL: urlDeLaApi(),
  withCredentials: true,
});

export default axiosInstance;
