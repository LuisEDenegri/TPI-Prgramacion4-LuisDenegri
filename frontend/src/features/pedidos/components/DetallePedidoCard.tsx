import { formatearFecha, formatearPrecio } from "@/shared/formato";
import BadgeEstado from "@/shared/ui/BadgeEstado";
import type { FormaPago, Pedido } from "../types/pedido.types";

const PAGO: Record<FormaPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

export default function DetallePedidoCard({ pedido }: { pedido: Pedido }) {
  return (
    <article className="space-y-4 text-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Pedido #{pedido.id}</h3>
          <p className="text-slate-500">{formatearFecha(pedido.created_at)}</p>
        </div>
        <BadgeEstado estado={pedido.estado} />
      </header>

      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Dirección de entrega</dt>
          <dd className="font-medium">{pedido.direccion_entrega}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Forma de pago</dt>
          <dd className="font-medium">{PAGO[pedido.forma_pago]}</dd>
        </div>
        {pedido.notas && (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Notas</dt>
            <dd className="font-medium whitespace-pre-line">{pedido.notas}</dd>
          </div>
        )}
      </dl>

      <table className="w-full border-t border-slate-200">
        <caption className="sr-only">Detalle del pedido #{pedido.id}</caption>
        <thead>
          <tr className="text-left text-xs uppercase text-slate-500">
            <th scope="col" className="py-2">
              Producto
            </th>
            <th scope="col" className="py-2 text-right">
              Precio
            </th>
            <th scope="col" className="py-2 text-right">
              Cant.
            </th>
            <th scope="col" className="py-2 text-right">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pedido.items.map((linea) => (
            <tr key={linea.producto_id}>
              <td className="py-2">{linea.nombre_producto}</td>
              <td className="py-2 text-right">{formatearPrecio(linea.precio_unitario)}</td>
              <td className="py-2 text-right">{linea.cantidad}</td>
              <td className="py-2 text-right font-medium">{formatearPrecio(linea.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200">
            <td colSpan={3} className="py-2 text-right font-semibold">
              Total
            </td>
            <td className="py-2 text-right font-bold text-orange-700">
              {formatearPrecio(pedido.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
