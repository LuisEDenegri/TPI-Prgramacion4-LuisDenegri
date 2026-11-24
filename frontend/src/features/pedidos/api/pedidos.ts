import axiosInstance from "@/shared/api/axiosInstance";
import type {
  EstadoPedido,
  Pedido,
  PedidoInput,
  PedidosPaginados,
  ResumenPedidos,
} from "../types/pedido.types";

/** Query params de GET /pedidos. */
export interface FiltrosPedidos {
  skip?: number;
  limit?: number;
  estado?: EstadoPedido;
}

export async function apiCrearPedido(payload: PedidoInput): Promise<Pedido> {
  const { data } = await axiosInstance.post<Pedido>("/pedidos", payload);
  return data;
}

export async function apiListarPedidos(filtros: FiltrosPedidos = {}): Promise<PedidosPaginados> {
  const { data } = await axiosInstance.get<PedidosPaginados>("/pedidos", { params: filtros });
  return data;
}

export async function apiResumenPedidos(): Promise<ResumenPedidos> {
  const { data } = await axiosInstance.get<ResumenPedidos>("/pedidos/resumen");
  return data;
}

export async function apiObtenerPedido(id: number): Promise<Pedido> {
  const { data } = await axiosInstance.get<Pedido>(`/pedidos/${id}`);
  return data;
}

export async function apiCambiarEstadoPedido(id: number, estado: EstadoPedido): Promise<Pedido> {
  const { data } = await axiosInstance.patch<Pedido>(`/pedidos/${id}/estado`, { estado });
  return data;
}

export async function apiCancelarPedido(id: number): Promise<Pedido> {
  const { data } = await axiosInstance.patch<Pedido>(`/pedidos/${id}/cancelar`);
  return data;
}
