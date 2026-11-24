import { useCallback, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import { claseInput } from "@/shared/ui/Input";
import EstadoError from "@/shared/components/EstadoError";
import EstadoVacio from "@/shared/components/EstadoVacio";
import Skeleton from "@/shared/components/Skeleton";
import { formatearPrecio } from "@/shared/formato";
import { handleApiError } from "@/shared/api/handleApiError";
import ProductoFormModal from "../components/ProductoFormModal";
import StockModal from "../components/StockModal";
import { useProductos, useProductosMutations } from "../hooks/useProductos";
import type { Producto } from "../types/producto.types";

// el panel trae el catalogo entero de una y pagina/ordena/filtra en memoria con
// TanStack Table: asi el admin ordena por cualquier columna sin ida y vuelta al
// backend, que solo ordena por los campos que expone
const LIMITE_ADMIN = 100;

const columnHelper = createColumnHelper<Producto>();

export default function AdminProductosPage() {
  const [filtroGlobal, setFiltroGlobal] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formAbierto, setFormAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Producto | null>(null);
  const [enStock, setEnStock] = useState<Producto | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = useProductos({ limit: LIMITE_ADMIN });
  const { eliminar } = useProductosMutations();
  const eliminarProducto = eliminar.mutateAsync;

  const productos = useMemo(() => data?.items ?? [], [data]);

  const abrirAlta = () => {
    setEnEdicion(null);
    setFormAbierto(true);
  };

  const abrirEdicion = useCallback((producto: Producto) => {
    setEnEdicion(producto);
    setFormAbierto(true);
  }, []);

  const confirmarEliminar = useCallback(
    async (producto: Producto) => {
      if (!window.confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) {
        return;
      }
      setErrorAccion(null);
      try {
        await eliminarProducto(producto.id);
      } catch (e) {
        setErrorAccion(handleApiError(e, "No se pudo eliminar el producto"));
      }
    },
    [eliminarProducto],
  );

  const columnas = useMemo(
    () => [
      columnHelper.accessor("id", { header: "ID" }),
      columnHelper.accessor("nombre", { header: "Nombre" }),
      columnHelper.accessor((fila) => fila.categoria?.nombre ?? "—", {
        id: "categoria",
        header: "Categoría",
      }),
      columnHelper.accessor("precio_base", {
        header: "Precio",
        cell: (info) => formatearPrecio(info.getValue()),
      }),
      columnHelper.accessor("stock", { header: "Stock" }),
      columnHelper.accessor("disponible", {
        header: "Disponible",
        cell: (info) => (info.getValue() ? "Sí" : "No"),
      }),
      columnHelper.display({
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variante="secundario" onClick={() => abrirEdicion(row.original)}>
              Editar
            </Button>
            <Button variante="secundario" onClick={() => setEnStock(row.original)}>
              Stock
            </Button>
            <Button variante="peligro" onClick={() => void confirmarEliminar(row.original)}>
              Eliminar
            </Button>
          </div>
        ),
      }),
    ],
    [abrirEdicion, confirmarEliminar],
  );

  const tabla = useReactTable({
    data: productos,
    columns: columnas,
    state: { sorting, globalFilter: filtroGlobal },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltroGlobal,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
        <Button onClick={abrirAlta}>Nuevo producto</Button>
      </header>

      {errorAccion && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorAccion}
        </p>
      )}

      {isPending ? (
        <Skeleton filas={6} />
      ) : isError ? (
        <EstadoError
          mensaje={handleApiError(error, "No se pudieron cargar los productos")}
          onReintentar={() => void refetch()}
        />
      ) : productos.length === 0 ? (
        <EstadoVacio
          mensaje="Todavía no hay productos"
          detalle="Creá el primero con el botón «Nuevo producto»."
        />
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="admin-filtro" className="mb-1 block text-sm font-medium text-slate-700">
              Filtrar
            </label>
            <input
              id="admin-filtro"
              type="search"
              value={filtroGlobal}
              onChange={(e) => setFiltroGlobal(e.target.value)}
              placeholder="Nombre, categoría…"
              className={`${claseInput} sm:max-w-xs`}
            />
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                {tabla.getHeaderGroups().map((grupo) => (
                  <tr key={grupo.id}>
                    {grupo.headers.map((header) => {
                      const ordenable = header.column.getCanSort();
                      const orden = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            orden === "asc"
                              ? "ascending"
                              : orden === "desc"
                                ? "descending"
                                : "none"
                          }
                          className="px-4 py-3 font-medium"
                        >
                          {ordenable ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="flex items-center gap-1 hover:text-slate-900"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {orden === "asc" ? "▲" : orden === "desc" ? "▼" : ""}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {tabla.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {tabla.getRowModel().rows.length === 0 && (
            <p className="mt-4 text-center text-sm text-slate-500">
              Ningún producto coincide con el filtro.
            </p>
          )}

          {tabla.getPageCount() > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Paginación">
              <Button
                variante="secundario"
                disabled={!tabla.getCanPreviousPage()}
                onClick={() => tabla.previousPage()}
              >
                Anterior
              </Button>
              <span className="text-sm text-slate-600">
                Página {tabla.getState().pagination.pageIndex + 1} de {tabla.getPageCount()}
              </span>
              <Button
                variante="secundario"
                disabled={!tabla.getCanNextPage()}
                onClick={() => tabla.nextPage()}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}

      {formAbierto && (
        <ProductoFormModal
          // remontar el modal resetea los defaultValues del form al cambiar de fila
          key={enEdicion?.id ?? "nuevo"}
          abierto
          producto={enEdicion}
          onClose={() => setFormAbierto(false)}
        />
      )}

      {enStock && <StockModal producto={enStock} onClose={() => setEnStock(null)} />}
    </section>
  );
}
