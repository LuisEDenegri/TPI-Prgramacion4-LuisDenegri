import { handleApiError } from "@/shared/api/handleApiError";
import { formatearPrecio } from "@/shared/formato";
import EstadoError from "@/shared/components/EstadoError";
import Skeleton from "@/shared/components/Skeleton";
import TarjetaResumen from "../components/TarjetaResumen";
import { useResumenPedidos } from "../hooks/usePedidos";

export default function AdminResumenPage() {
  const { data, isPending, isError, error, refetch } = useResumenPedidos();

  if (isPending) return <Skeleton filas={6} />;
  if (isError) {
    return (
      <EstadoError
        mensaje={handleApiError(error, "No se pudo cargar el resumen")}
        onReintentar={() => void refetch()}
      />
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold">Resumen</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TarjetaResumen titulo="Pendientes" valor={data.pendientes} />
        <TarjetaResumen titulo="En preparación" valor={data.en_preparacion} />
        <TarjetaResumen titulo="Entregados" valor={data.entregados} />
        <TarjetaResumen titulo="Cancelados" valor={data.cancelados} />
        <TarjetaResumen titulo="Pedidos de hoy" valor={data.pedidos_hoy} />
        <TarjetaResumen
          titulo="Ingresos (entregados)"
          valor={formatearPrecio(data.ingresos_entregados)}
          acento
        />
      </div>
    </section>
  );
}
