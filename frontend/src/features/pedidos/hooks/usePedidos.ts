import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiCambiarEstadoPedido,
  apiCancelarPedido,
  apiCrearPedido,
  apiListarPedidos,
  apiObtenerPedido,
  apiResumenPedidos,
  type FiltrosPedidos,
} from "../api/pedidos";
import type { EstadoPedido, Pedido } from "../types/pedido.types";

export function usePedidos(filtros: FiltrosPedidos = {}) {
  return useQuery({
    queryKey: ["pedidos", filtros],
    queryFn: () => apiListarPedidos(filtros),
  });
}

export function usePedido(id: number | null) {
  return useQuery({
    queryKey: ["pedidos", "detalle", id],
    queryFn: () => apiObtenerPedido(id ?? 0),
    enabled: id !== null,
  });
}

export function useResumenPedidos() {
  return useQuery({
    queryKey: ["pedidos", "resumen"],
    queryFn: apiResumenPedidos,
  });
}

export function useCrearPedido() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: apiCrearPedido,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      // crear descuenta stock: el catalogo cacheado queda desactualizado
      void qc.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}

export function useCambiarEstadoPedido() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoPedido }) =>
      apiCambiarEstadoPedido(id, estado),
    onSuccess: (pedido: Pedido) => {
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      // solo cancelar repone el stock; los demas estados no lo tocan
      if (pedido.estado === "CANCELADO") {
        void qc.invalidateQueries({ queryKey: ["productos"] });
      }
    },
  });
}

export function useCancelarPedido() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: apiCancelarPedido,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      // cancelar devuelve las unidades reservadas al stock
      void qc.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}
