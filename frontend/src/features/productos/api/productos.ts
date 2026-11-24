import axiosInstance from "@/shared/api/axiosInstance";
import type {
  FiltrosProductos,
  Producto,
  ProductoInput,
  ProductoStockInput,
  ProductosPaginados,
} from "../types/producto.types";

type ValorParam = string | number | boolean;

// axios manda `?search=undefined` si se le pasa la clave con undefined
function sinUndefined(filtros: FiltrosProductos): Record<string, ValorParam> {
  const entradas = Object.entries(filtros).filter(
    (entrada): entrada is [string, ValorParam] => entrada[1] !== undefined,
  );
  return Object.fromEntries(entradas);
}

export async function getProductos(filtros: FiltrosProductos = {}): Promise<ProductosPaginados> {
  const { data } = await axiosInstance.get<ProductosPaginados>("/productos", {
    params: sinUndefined(filtros),
  });
  return data;
}

export async function getProducto(id: number): Promise<Producto> {
  const { data } = await axiosInstance.get<Producto>(`/productos/${id}`);
  return data;
}

export async function crearProducto(datos: ProductoInput): Promise<Producto> {
  const { data } = await axiosInstance.post<Producto>("/productos", datos);
  return data;
}

export async function actualizarProducto(
  id: number,
  datos: Partial<ProductoInput>,
): Promise<Producto> {
  const { data } = await axiosInstance.put<Producto>(`/productos/${id}`, datos);
  return data;
}

export async function actualizarStock(id: number, datos: ProductoStockInput): Promise<Producto> {
  const { data } = await axiosInstance.patch<Producto>(`/productos/${id}/stock`, datos);
  return data;
}

export async function eliminarProducto(id: number): Promise<void> {
  await axiosInstance.delete(`/productos/${id}`);
}
