import axios from "axios";

// withCredentials: sin esto el navegador no manda ni guarda la cookie con el
// JWT. El frontend nunca lee el token: es HttpOnly.
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
  withCredentials: true,
});

export default axiosInstance;
