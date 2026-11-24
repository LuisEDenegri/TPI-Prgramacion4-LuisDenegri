import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { handleApiError } from "@/shared/api/handleApiError";
import { formatearFecha, formatearPrecio } from "@/shared/formato";
import EstadoError from "@/shared/components/EstadoError";
import EstadoVacio from "@/shared/components/EstadoVacio";
import Paginacion from "@/shared/components/Paginacion";
import Skeleton from "@/shared/components/Skeleton";
import BadgeEstado from "@/shared/ui/BadgeEstado";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Modal from "@/shared/ui/Modal";
import { claseInput } from "@/shared/ui/Input";
import DetallePedidoCard from "../components/DetallePedidoCard";
import { useCambiarEstadoPedido, usePedidos } from "../hooks/usePedidos";
import { TRANSICIONES, type EstadoPedido, type Pedido } from "../types/pedido.types";

const POR_PAGINA = 10;

const ESTADOS: EstadoPedido[] = ["PENDIENTE", "EN_PREPARACION", "ENTREGADO", "CANCELADO"];

const ETIQUETAS: Record<EstadoPedido, string> = {
  PENDIENTE: "Pendiente",
  EN_PREPARACION: "En preparación",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

// el value de un select es string: se valida contra la lista en vez de castear
const aEstado = (valor: string): EstadoPedido | undefined => ESTADOS.find((e) => e === valor);

const columnHelper = createColumnHelper<Pedido>();

export default function AdminPedidosPage() {
  const [pagina, setPagina] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | undefined>(undefined);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const { data, isPending, isError, error, refetch } = usePedidos({
    skip: pagina * POR_PAGINA,
    limit: POR_PAGINA,
    estado: filtroEstado,
  });
  const cambiarEstado = useCambiarEstadoPedido();

  // se busca en la lista en vez de guardar el pedido: asi el modal refleja el
  // estado nuevo despues de una transicion
  const detalle = data?.items.find((p) => p.id === detalleId) ?? null;

  const columnas = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "N°",
        cell: (info) => `#${info.getValue()}`,
      }),
      columnHelper.accessor("created_at", {
        header: "Fecha",
        cell: (info) => formatearFecha(info.getValue()),
      }),
      columnHelper.accessor("usuario_id", { header: "Usuario" }),
      columnHelper.accessor("estado", {
        header: "Estado",
        cell: (info) => <BadgeEstado estado={info.getValue()} />,
      }),
      columnHelper.accessor("total", {
        header: "Total",
        cell: (info) => formatearPrecio(info.getValue()),
      }),
      columnHelper.display({
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => {
          const pedido = row.original;

          return (
            <div className="flex flex-wrap gap-2">
              <Button variante="secundario" onClick={() => setDetalleId(pedido.id)}>
                Ver
              </Button>

              {/* TRANSICIONES evita ofrecer cambios que el backend rechaza igual */}
              {TRANSICIONES[pedido.estado].map((siguiente) => (
                <Button
                  key={siguiente}
                  variante={siguiente === "CANCELADO" ? "peligro" : "primario"}
                  disabled={cambiarEstado.isPending}
                  onClick={() => cambiarEstado.mutate({ id: pedido.id, estado: siguiente })}
                >
                  {ETIQUETAS[siguiente]}
                </Button>
              ))}
            </div>
          );
        },
      }),
    ],
    [cambiarEstado],
  );

  const tabla = useReactTable({
    data: data?.items ?? [],
    columns: columnas,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold">Pedidos</h1>

      <div className="mb-4 flex items-end gap-3">
        <div>
          <label htmlFor="filtro-estado" className="mb-1 block text-sm font-medium text-slate-700">
            Estado
          </label>
          <select
            id="filtro-estado"
            className={claseInput}
            value={filtroEstado ?? ""}
            onChange={(e) => {
              setFiltroEstado(aEstado(e.target.value));
              // cambiar el filtro invalida la pagina actual
              setPagina(0);
            }}
          >
            <option value="">Todos</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETAS[estado]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cambiarEstado.isError && (
        <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {handleApiError(cambiarEstado.error, "No se pudo cambiar el estado")}
        </p>
      )}

      {isPending && <Skeleton filas={3} />}

      {isError && (
        <EstadoError
          mensaje={handleApiError(error, "No se pudieron cargar los pedidos")}
          onReintentar={() => void refetch()}
        />
      )}

      {data && data.items.length === 0 && <EstadoVacio mensaje="No hay pedidos para este filtro" />}

      {data && data.items.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Listado de pedidos</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              {tabla.getHeaderGroups().map((grupo) => (
                <tr key={grupo.id}>
                  {grupo.headers.map((header) => (
                    <th key={header.id} scope="col" className="px-4 py-3">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tabla.getRowModel().rows.map((row) => (
                <tr key={row.id}>
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
      )}

      {data && (
        <Paginacion pagina={pagina} total={data.total} porPagina={POR_PAGINA} onCambiar={setPagina} />
      )}

      <Modal
        abierto={detalle !== null}
        titulo={detalle ? `Pedido #${detalle.id}` : ""}
        onClose={() => setDetalleId(null)}
        pie={
          <Button variante="secundario" onClick={() => setDetalleId(null)}>
            Cerrar
          </Button>
        }
      >
        {detalle && <DetallePedidoCard pedido={detalle} />}
      </Modal>
    </section>
  );
}
