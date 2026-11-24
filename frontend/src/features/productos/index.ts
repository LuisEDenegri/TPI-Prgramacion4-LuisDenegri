export { default as CatalogoPage } from "./pages/CatalogoPage";
export { default as AdminProductosPage } from "./pages/AdminProductosPage";
export { default as ProductoCard } from "./components/ProductoCard";

export { useProductos, useProducto, useProductosMutations } from "./hooks/useProductos";

export type {
  Producto,
  ProductoInput,
  ProductoStockInput,
  ProductosPaginados,
  FiltrosProductos,
} from "./types/producto.types";
