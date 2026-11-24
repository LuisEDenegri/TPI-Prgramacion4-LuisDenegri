import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import { formatearPrecio } from "@/shared/formato";
import { useCartStore } from "@/store/cartStore";
import type { Producto } from "../types/producto.types";

interface Props {
  producto: Producto;
}

export default function ProductoCard({ producto }: Props) {
  const agregar = useCartStore((estado) => estado.agregar);
  const sinStock = producto.stock === 0 || !producto.disponible;

  const alAgregar = () =>
    agregar(
      {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio_unitario: producto.precio_base,
        imagen_url: producto.imagen_url,
        stock_disponible: producto.stock,
      },
      1,
    );

  return (
    <Card className="flex flex-col overflow-hidden">
      {producto.imagen_url ? (
        <img
          src={producto.imagen_url}
          alt={producto.nombre}
          loading="lazy"
          className="h-40 w-full object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={`Sin imagen de ${producto.nombre}`}
          className="flex h-40 w-full items-center justify-center bg-slate-200 px-3 text-center text-sm font-medium text-slate-500"
        >
          {producto.nombre}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-semibold text-slate-800">{producto.nombre}</h3>

        {producto.categoria && (
          <p className="text-xs uppercase tracking-wide text-orange-600">
            {producto.categoria.nombre}
          </p>
        )}

        {producto.descripcion && (
          <p className="line-clamp-2 text-sm text-slate-500">{producto.descripcion}</p>
        )}

        <p className="mt-2 text-lg font-bold text-slate-900">
          {formatearPrecio(producto.precio_base)}
        </p>

        <div className="mt-auto pt-3">
          {sinStock && <p className="mb-2 text-sm font-medium text-red-600">Sin stock</p>}
          <Button onClick={alAgregar} disabled={sinStock} className="w-full">
            Agregar al carrito
          </Button>
        </div>
      </div>
    </Card>
  );
}
