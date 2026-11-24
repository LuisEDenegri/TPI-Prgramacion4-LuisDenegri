import { useRef } from "react";
import { Navigate } from "react-router-dom";
import { useCartStore } from "@/store/cartStore";
import { formatearPrecio } from "@/shared/formato";
import Card from "@/shared/ui/Card";
import CheckoutForm from "../components/CheckoutForm";

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total());

  // al confirmar, el formulario vacia el carrito y navega a "mis pedidos". Las
  // dos cosas entran en el mismo render, asi que sin esta marca la guarda de
  // abajo veria el carrito vacio y mandaria al catalogo, pisando esa navegacion
  const huboItems = useRef(false);
  if (items.length > 0) huboItems.current = true;

  // se entro al checkout con el carrito vacio (link directo o recarga)
  if (items.length === 0 && !huboItems.current) return <Navigate to="/" replace />;
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <CheckoutForm />
        </Card>

        <Card className="h-fit p-5">
          <h2 className="mb-3 text-lg font-semibold">Tu pedido</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {items.map((item) => (
              <li key={item.producto_id} className="flex justify-between gap-3 py-2">
                <span className="text-slate-600">
                  {item.cantidad} × {item.nombre}
                </span>
                <span className="font-medium">
                  {formatearPrecio(item.precio_unitario * item.cantidad)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-orange-700">{formatearPrecio(total)}</span>
          </div>
        </Card>
      </div>
    </section>
  );
}
