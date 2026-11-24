import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actualizarCategoria, crearCategoria, eliminarCategoria, getCategorias } from "../api/categorias";
import type { Categoria, CategoriaInput } from "../types/categoria.types";

interface EdicionArgs {
  id: number;
  payload: CategoriaInput;
}

export function useCategorias() {
  const queryClient = useQueryClient();

  const query = useQuery<Categoria[]>({
    queryKey: ["categorias"],
    queryFn: getCategorias,
  });

  // cada producto muestra el nombre de su categoria, asi que renombrar o dar de
  // baja una categoria deja el listado de productos desactualizado
  const invalidar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["categorias"] }),
      queryClient.invalidateQueries({ queryKey: ["productos"] }),
    ]);
  };

  const crear = useMutation({
    mutationFn: (payload: CategoriaInput) => crearCategoria(payload),
    onSuccess: invalidar,
  });

  const editar = useMutation({
    mutationFn: ({ id, payload }: EdicionArgs) => actualizarCategoria(id, payload),
    onSuccess: invalidar,
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => eliminarCategoria(id),
    onSuccess: invalidar,
  });

  return { ...query, crear, editar, eliminar };
}
