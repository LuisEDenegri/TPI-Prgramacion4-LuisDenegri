import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activarUsuario, desactivarUsuario, getUsuarios } from "../api/usuarios";
import type { Usuario } from "../types/usuario.types";

export function useUsuarios() {
  const queryClient = useQueryClient();

  const query = useQuery<Usuario[]>({
    queryKey: ["usuarios"],
    queryFn: getUsuarios,
  });

  const invalidar = async () => {
    await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
  };

  const activar = useMutation({
    mutationFn: (id: number) => activarUsuario(id),
    onSuccess: invalidar,
  });

  const desactivar = useMutation({
    mutationFn: (id: number) => desactivarUsuario(id),
    onSuccess: invalidar,
  });

  return { ...query, activar, desactivar };
}
