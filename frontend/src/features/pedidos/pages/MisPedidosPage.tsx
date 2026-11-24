import { useState } from "react";
import { handleApiError } from "@/shared/api/handleApiError";
import { formatearFecha, formatearPrecio } from "@/shared/formato";
import EstadoError from "@/shared/components/EstadoError";
import EstadoVacio from "@/shared/components/EstadoVacio";
import Paginacion from "@/shared/components/Paginacion";
import Skeleton from "@/shared/components/Skeleton";
import BadgeEstado from "@/shared/ui/BadgeEstado";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import DetallePedidoCard from "../components/DetallePedidoCard";
import { useCancelarPedido, usePedidos } from "../hooks/usePedidos";

const POR_PAGINA = 10;

export default function MisPedidosPage() {
  const [pagina, setPagina] = useState(0);
  const [abierto, setAbierto] = useState<number | null>(null);
  const { data, isPending, isError, error, refetch } = usePedidos({
    skip: pagina * POR_PAGINA,
    limit: POR_PAGINA,
  });
  const cancelar = useCancelarPedido();

  function confirmarCancelacion(id: number) {
    if (!window.confirm(`¿Cancelar el pedido #${id}? Esta acción no se puede deshacer.`)) return;
    cancelar.mutate(id);
  }

  if (isPending) return <Skeleton filas={3} />;
  if (isError) {
    return (
      <EstadoError
        mensaje={handleApiError(error, "No se pudieron cargar tus pedidos")}
        onReintentar={() => void refetch()}
      />
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Mis pedidos</h1>

      {cancelar.isError && (
        <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {handleApiError(cancelar.error, "No se pudo cancelar el pedido")}
        </p>
      )}

      {data.items.length === 0 ? (
        <EstadoVacio mensaje="Todavía no hiciste pedidos" detalle="Cuando compres, van a aparecer acá." />
      ) : (
        <ul className="space-y-3">
          {data.items.map((pedido) => {
            const expandido = abierto === pedido.id;

            return (
              <li key={pedido.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Pedido #{pedido.id}</p>
                      <p className="text-sm text-slate-500">{formatearFecha(pedido.created_at)}</p>
                    </div>

                    <BadgeEstado estado={pedido.estado} />

                    <p className="font-bold text-orange-700">{formatearPrecio(pedido.total)}</p>

                    <div className="flex gap-2">
                      <Button
                        variante="secundario"
                        aria-expanded={expandido}
                        aria-controls={`detalle-${pedido.id}`}
                        onClick={() => setAbierto(expandido ? null : pedido.id)}
                      >
                        {expandido ? "Ocultar" : "Ver detalle"}
                      </Button>

                      {/* el boton solo aparece en PENDIENTE, pero el backend vuelve a validarlo */}
                      {pedido.estado === "PENDIENTE" && (
                        <Button
                          variante="peligro"
                          disabled={cancelar.isPending}
                          onClick={() => confirmarCancelacion(pedido.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>

                  {expandido && (
                    <div id={`detalle-${pedido.id}`} className="mt-4 border-t border-slate-200 pt-4">
                      <DetallePedidoCard pedido={pedido} />
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Paginacion
        pagina={pagina}
        total={data.total}
        porPagina={POR_PAGINA}
        onCambiar={setPagina}
      />
    </section>
  );
}
