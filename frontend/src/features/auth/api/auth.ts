import axiosInstance from "@/shared/api/axiosInstance";
import type { RegisterPayload, Usuario } from "../types/auth.types";

export async function apiLogin(username: string, password: string): Promise<void> {
  // /auth/token espera un formulario OAuth2, no JSON
  const form = new URLSearchParams({ username, password });
  await axiosInstance.post("/auth/token", form);
}

export async function apiLogout(): Promise<void> {
  await axiosInstance.post("/auth/logout");
}

export async function apiMe(): Promise<Usuario> {
  const { data } = await axiosInstance.get<Usuario>("/auth/me");
  return data;
}

export async function apiRegister(payload: RegisterPayload): Promise<Usuario> {
  const { data } = await axiosInstance.post<Usuario>("/auth/register", payload);
  return data;
}
