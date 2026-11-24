import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { handleApiError } from "@/shared/api/handleApiError";
import EstadoError from "@/shared/components/EstadoError";
import EstadoVacio from "@/shared/components/EstadoVacio";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Input, { claseInput } from "@/shared/ui/Input";
import Modal from "@/shared/ui/Modal";
import { useCategorias } from "../hooks/useCategorias";
import type { Categoria } from "../types/categoria.types";

const columnHelper = createColumnHelper<Categoria>();

function validarNombre(valor: string): string | undefined {
  const limpio = valor.trim();
  if (limpio.length < 2) return "El nombre debe tener al menos 2 caracteres";
  if (limpio.length > 100) return "El nombre no puede superar los 100 caracteres";
  return undefined;
}

export default function AdminCategoriasPage() {
  const { data, isPending, isError, error, refetch, crear, editar, eliminar } = useCategorias();
  const [enEdicion, setEnEdicion] = useState<Categoria | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [filtro, setFiltro] = useState("");

  const categorias = useMemo(() => data ?? [], [data]);

  const form = useForm({
    defaultValues: { nombre: "", descripcion: "" },
    onSubmit: async ({ value }) => {
      // el 409 por nombre repetido se resuelve recien en el backend: se muestra
      // dentro del modal para no perder lo que el usuario ya escribio
      setErrorModal("");
      const payload = {
        nombre: value.nombre.trim(),
        descripcion: value.descripcion.trim() === "" ? null : value.descripcion.trim(),
      };
      try {
        if (enEdicion) {
          await editar.mutateAsync({ id: enEdicion.id, payload });
        } else {
          await crear.mutateAsync(payload);
        }
        cerrarModal();
      } catch (e) {
        setErrorModal(handleApiError(e, "No se pudo guardar la categoría"));
      }
    },
  });

  function abrirModal(categoria: Categoria | null) {
    setEnEdicion(categoria);
    setErrorModal("");
    form.reset({
      nombre: categoria?.nombre ?? "",
      descripcion: categoria?.descripcion ?? "",
    });
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setEnEdicion(null);
    setErrorModal("");
  }

  async function confirmarBaja(categoria: Categoria) {
    if (!window.confirm(`¿Dar de baja la categoría "${categoria.nombre}"?`)) return;
    try {
      await eliminar.mutateAsync(categoria.id);
    } catch (e) {
      window.alert(handleApiError(e, "No se pudo eliminar la categoría"));
    }
  }

  const columnas = [
    columnHelper.accessor("id", { header: "ID" }),
    columnHelper.accessor("nombre", { header: "Nombre" }),
    columnHelper.accessor("descripcion", {
      header: "Descripción",
      cell: (info) => info.getValue() ?? <span className="text-slate-400">—</span>,
      enableSorting: false,
    }),
    columnHelper.display({
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variante="secundario" onClick={() => abrirModal(row.original)}>
            Editar
          </Button>
          <Button
            variante="peligro"
            disabled={eliminar.isPending}
            onClick={() => void confirmarBaja(row.original)}
          >
            Eliminar
          </Button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: categorias,
    columns: columnas,
    state: { globalFilter: filtro },
    onGlobalFilterChange: setFiltro,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Categorías</h1>
        <Button onClick={() => abrirModal(null)}>Nueva categoría</Button>
      </div>

      {isPending && <p className="text-slate-500">Cargando categorías…</p>}

      {isError && (
        <EstadoError
          mensaje={handleApiError(error, "No se pudieron cargar las categorías")}
          onReintentar={() => void refetch()}
        />
      )}

      {!isPending && !isError && categorias.length === 0 && (
        <EstadoVacio
          mensaje="Todavía no hay categorías"
          detalle="Creá la primera con el botón Nueva categoría."
        />
      )}

      {!isPending && !isError && categorias.length > 0 && (
        <>
          <div className="mb-4">
            <label htmlFor="filtro-categorias" className="mb-1 block text-sm font-medium text-slate-700">
              Buscar
            </label>
            <input
              id="filtro-categorias"
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar por nombre o descripción"
              className={claseInput}
            />
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                {table.getHeaderGroups().map((grupo) => (
                  <tr key={grupo.id}>
                    {grupo.headers.map((header) => {
                      const ordenable = header.column.getCanSort();
                      return (
                        <th key={header.id} scope="col" className="px-4 py-3 font-medium">
                          {ordenable ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="flex items-center gap-1 font-medium hover:text-slate-900"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() === "asc" && <span aria-hidden="true">▲</span>}
                              {header.column.getIsSorted() === "desc" && <span aria-hidden="true">▼</span>}
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
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-slate-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {table.getRowModel().rows.length === 0 && (
            <p className="mt-4 text-center text-sm text-slate-500">
              Ninguna categoría coincide con la búsqueda.
            </p>
          )}

          {table.getPageCount() > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Paginación">
              <Button
                variante="secundario"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                Anterior
              </Button>
              <span className="text-sm text-slate-600">
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
              </span>
              <Button
                variante="secundario"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}

      <Modal
        abierto={modalAbierto}
        titulo={enEdicion ? "Editar categoría" : "Nueva categoría"}
        onClose={cerrarModal}
        pie={
          <>
            <Button variante="secundario" onClick={cerrarModal}>
              Cancelar
            </Button>
            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
              {([puedeEnviar, enviando]) => (
                <Button type="submit" form="form-categoria" disabled={!puedeEnviar || enviando}>
                  {enviando ? "Guardando…" : "Guardar"}
                </Button>
              )}
            </form.Subscribe>
          </>
        }
      >
        <form
          id="form-categoria"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          {errorModal && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorModal}
            </p>
          )}

          <form.Field name="nombre" validators={{ onChange: ({ value }) => validarNombre(value) }}>
            {(field) => (
              <Input
                id="categoria-nombre"
                label="Nombre"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                errores={field.state.meta.isTouched ? field.state.meta.errors : []}
                required
              />
            )}
          </form.Field>

          <form.Field name="descripcion">
            {(field) => (
              <div>
                <label
                  htmlFor="categoria-descripcion"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Descripción (opcional)
                </label>
                <textarea
                  id="categoria-descripcion"
                  rows={3}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className={claseInput}
                />
              </div>
            )}
          </form.Field>
        </form>
      </Modal>
    </section>
  );
}
