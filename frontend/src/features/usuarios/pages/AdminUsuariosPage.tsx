import { useMemo, useState } from "react";
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
import { formatearFecha } from "@/shared/formato";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import { claseInput } from "@/shared/ui/Input";
import { useAuthStore } from "@/store/authStore";
import { useUsuarios } from "../hooks/useUsuarios";
import type { Usuario } from "../types/usuario.types";

const columnHelper = createColumnHelper<Usuario>();

const ESTILO_ROL: Record<Usuario["role"], string> = {
  admin: "bg-orange-100 text-orange-800",
  user: "bg-slate-100 text-slate-700",
};

const ETIQUETA_ROL: Record<Usuario["role"], string> = {
  admin: "Admin",
  user: "Usuario",
};

function Badge({ className, children }: { className: string; children: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export default function AdminUsuariosPage() {
  const { data, isPending, isError, error, refetch, activar, desactivar } = useUsuarios();
  const usuarioSesion = useAuthStore((s) => s.usuario);
  const [filtro, setFiltro] = useState("");
  const [errorAccion, setErrorAccion] = useState("");

  const usuarios = useMemo(() => data ?? [], [data]);
  const enProceso = activar.isPending || desactivar.isPending;

  async function cambiarEstado(usuario: Usuario) {
    setErrorAccion("");
    try {
      if (usuario.disabled) {
        await activar.mutateAsync(usuario.id);
      } else {
        await desactivar.mutateAsync(usuario.id);
      }
    } catch (e) {
      setErrorAccion(handleApiError(e, "No se pudo cambiar el estado del usuario"));
    }
  }

  const columnas = [
    columnHelper.accessor("username", { header: "Usuario" }),
    columnHelper.accessor("full_name", { header: "Nombre completo" }),
    columnHelper.accessor("email", { header: "Email" }),
    columnHelper.accessor("role", {
      header: "Rol",
      cell: (info) => <Badge className={ESTILO_ROL[info.getValue()]}>{ETIQUETA_ROL[info.getValue()]}</Badge>,
    }),
    columnHelper.accessor("disabled", {
      header: "Estado",
      cell: (info) =>
        info.getValue() ? (
          <Badge className="bg-red-100 text-red-800">Desactivado</Badge>
        ) : (
          <Badge className="bg-green-100 text-green-800">Activo</Badge>
        ),
    }),
    columnHelper.accessor("created_at", {
      header: "Alta",
      cell: (info) => formatearFecha(info.getValue()),
    }),
    columnHelper.display({
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => {
        const usuario = row.original;
        // el backend rechaza con 400 que un admin se desactive a si mismo:
        // no se ofrece un boton que ya se sabe que va a fallar
        if (!usuario.disabled && usuario.id === usuarioSesion?.id) {
          return <span className="text-xs text-slate-400">(vos)</span>;
        }
        return (
          <Button
            variante={usuario.disabled ? "primario" : "peligro"}
            disabled={enProceso}
            onClick={() => void cambiarEstado(usuario)}
          >
            {usuario.disabled ? "Activar" : "Desactivar"}
          </Button>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: usuarios,
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
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Usuarios</h1>

      {isPending && <p className="text-slate-500">Cargando usuarios…</p>}

      {isError && (
        <EstadoError
          mensaje={handleApiError(error, "No se pudieron cargar los usuarios")}
          onReintentar={() => void refetch()}
        />
      )}

      {!isPending && !isError && usuarios.length === 0 && (
        <EstadoVacio mensaje="No hay usuarios registrados" />
      )}

      {!isPending && !isError && usuarios.length > 0 && (
        <>
          {errorAccion && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {errorAccion}
            </p>
          )}

          <div className="mb-4">
            <label htmlFor="filtro-usuarios" className="mb-1 block text-sm font-medium text-slate-700">
              Buscar
            </label>
            <input
              id="filtro-usuarios"
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar por usuario, nombre o email"
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
              Ningún usuario coincide con la búsqueda.
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
    </section>
  );
}
