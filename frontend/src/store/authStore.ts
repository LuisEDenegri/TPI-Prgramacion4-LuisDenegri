import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiLogin, apiLogout, apiMe, type Usuario } from "@/features/auth";

interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  limpiarSesion: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      // arranca en true: al abrir la app todavia no se sabe si hay sesion y
      // ProtectedRoute tiene que esperar en vez de mandar al login
      cargando: true,

      login: async (username, password) => {
        await apiLogin(username, password);
        // el token quedo en la cookie; /auth/me dice quien es
        const usuario = await apiMe();
        set({ usuario, cargando: false });
      },

      logout: async () => {
        try {
          await apiLogout();
        } finally {
          // aunque el logout falle en el server, en el navegador se cierra
          set({ usuario: null, cargando: false });
        }
      },

      checkSession: async () => {
        try {
          const usuario = await apiMe();
          set({ usuario, cargando: false });
        } catch {
          // 401 sin sesion, 400 cuenta desactivada: en los dos casos no hay usuario
          set({ usuario: null, cargando: false });
        }
      },

      limpiarSesion: () => set({ usuario: null, cargando: false }),
    }),
    {
      name: "auth-storage",
      // partialize: solo se guarda el usuario para pintar la Navbar sin
      // parpadeo. El token nunca pasa por aca, vive en la cookie HttpOnly.
      partialize: (state) => ({ usuario: state.usuario }),
    },
  ),
);

export const esAdmin = (usuario: Usuario | null): boolean => usuario?.role === "admin";
