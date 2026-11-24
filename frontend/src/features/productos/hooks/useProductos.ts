import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarProducto,
  actualizarStock,
  crearProducto,
  eliminarProducto,
  getProducto,
  getProductos,
} from "../api/productos";
import type { FiltrosProductos, ProductoInput, ProductoStockInput } from "../types/producto.types";

export function useProductos(filtros: FiltrosProductos = {}) {
  return useQuery({
    queryKey: ["productos", filtros],
    queryFn: () => getProductos(filtros),
    // al paginar o filtrar se conserva la pagina anterior en pantalla: sin esto
    // la grilla se vacia y salta el layout en cada tecla del buscador
    placeholderData: (previa) => previa,
  });
}

export function useProducto(id: number | null) {
  return useQuery({
    queryKey: ["productos", "detalle", id],
    queryFn: () => getProducto(id ?? 0),
    enabled: id !== null,
  });
}

export function useProductosMutations() {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["productos"] });

  const crear = useMutation({
    mutationFn: (datos: ProductoInput) => crearProducto(datos),
    onSuccess: invalidar,
  });

  const editar = useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: Partial<ProductoInput> }) =>
      actualizarProducto(id, datos),
    onSuccess: invalidar,
  });

  const cambiarStock = useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: ProductoStockInput }) =>
      actualizarStock(id, datos),
    onSuccess: invalidar,
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => eliminarProducto(id),
    onSuccess: invalidar,
  });

  return { crear, editar, cambiarStock, eliminar };
}
