import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { formatearPrecio } from "@/shared/formato";
import EstadoVacio from "@/shared/components/EstadoVacio";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";

export default function CarritoPage() {
  const items = useCartStore((s) => s.items);
  const quitar = useCartStore((s) => s.quitar);
  const cambiarCantidad = useCartStore((s) => s.cambiarCantidad);
  const vaciar = useCartStore((s) => s.vaciar);
  const total = useCartStore((s) => s.total());
  const usuario = useAuthStore((s) => s.usuario);
  const navigate = useNavigate();

  function continuar() {
    // sin sesion no se puede crear el pedido: se vuelve al checkout tras entrar
    if (!usuario) {
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }
    navigate("/checkout");
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold">Mi carrito</h1>
        <EstadoVacio mensaje="Tu carrito está vacío" detalle="Agregá productos del catálogo." />
        <div className="mt-4 text-center">
          <Link to="/" className="text-sm font-medium text-orange-600 hover:underline">
            Ir al catálogo
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Mi carrito</h1>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.producto_id}>
            <Card className="flex flex-wrap items-center gap-4 p-4">
              {item.imagen_url && (
                <img
                  src={item.imagen_url}
                  alt={item.nombre}
                  className="h-16 w-16 rounded object-cover"
                />
              )}

              <div className="min-w-40 flex-1">
                <p className="font-medium">{item.nombre}</p>
                <p className="text-sm text-slate-500">
                  {formatearPrecio(item.precio_unitario)} c/u · {item.stock_disponible} en stock
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variante="secundario"
                  aria-label={`Quitar una unidad de ${item.nombre}`}
                  disabled={item.cantidad <= 1}
                  onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}
                >
                  −
                </Button>
                <span className="w-8 text-center text-sm font-medium" aria-live="polite">
                  {item.cantidad}
                </span>
                <Button
                  variante="secundario"
                  aria-label={`Agregar una unidad de ${item.nombre}`}
                  disabled={item.cantidad >= item.stock_disponible}
                  onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}
                >
                  +
                </Button>
              </div>

              <p className="w-28 text-right font-semibold">
                {formatearPrecio(item.precio_unitario * item.cantidad)}
              </p>

              <Button
                variante="peligro"
                aria-label={`Quitar ${item.nombre} del carrito`}
                onClick={() => quitar(item.producto_id)}
              >
                Quitar
              </Button>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="mt-6 p-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-xl font-bold text-orange-700">{formatearPrecio(total)}</span>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variante="secundario" onClick={vaciar}>
            Vaciar carrito
          </Button>
          <Button onClick={continuar}>Continuar</Button>
        </div>
      </Card>
    </section>
  );
}
