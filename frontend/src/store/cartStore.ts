import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ItemCarrito {
  producto_id: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  imagen_url: string | null;
  /** Tope conocido al agregar: evita pedir mas de lo que hay en gondola. */
  stock_disponible: number;
}

interface CartState {
  items: ItemCarrito[];
  agregar: (item: Omit<ItemCarrito, "cantidad">, cantidad?: number) => void;
  quitar: (producto_id: number) => void;
  cambiarCantidad: (producto_id: number, cantidad: number) => void;
  vaciar: () => void;
  total: () => number;
  cantidadTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      agregar: (item, cantidad = 1) =>
        set((estado) => {
          const existente = estado.items.find((i) => i.producto_id === item.producto_id);

          // el mismo producto no se duplica: se suma a la linea que ya estaba
          if (existente) {
            return {
              items: estado.items.map((i) =>
                i.producto_id === item.producto_id
                  ? { ...i, cantidad: Math.min(i.cantidad + cantidad, i.stock_disponible) }
                  : i,
              ),
            };
          }

          return { items: [...estado.items, { ...item, cantidad }] };
        }),

      quitar: (producto_id) =>
        set((estado) => ({ items: estado.items.filter((i) => i.producto_id !== producto_id) })),

      cambiarCantidad: (producto_id, cantidad) =>
        set((estado) => ({
          items: estado.items.map((i) =>
            i.producto_id === producto_id
              ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock_disponible)) }
              : i,
          ),
        })),

      vaciar: () => set({ items: [] }),

      total: () => get().items.reduce((suma, i) => suma + i.precio_unitario * i.cantidad, 0),

      cantidadTotal: () => get().items.reduce((suma, i) => suma + i.cantidad, 0),
    }),
    { name: "cart-storage" },
  ),
);
