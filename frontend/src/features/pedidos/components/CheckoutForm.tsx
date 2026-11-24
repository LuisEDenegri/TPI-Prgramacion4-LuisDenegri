import { useForm } from "@tanstack/react-form";
import { useNavigate } from "react-router-dom";
import { handleApiError } from "@/shared/api/handleApiError";
import { useCartStore } from "@/store/cartStore";
import Button from "@/shared/ui/Button";
import Input, { claseInput } from "@/shared/ui/Input";
import { useCrearPedido } from "../hooks/usePedidos";
import type { FormaPago, PedidoInput } from "../types/pedido.types";

const FORMAS_PAGO: { valor: FormaPago; etiqueta: string }[] = [
  { valor: "EFECTIVO", etiqueta: "Efectivo" },
  { valor: "TRANSFERENCIA", etiqueta: "Transferencia" },
];

// los errores de tanstack form no vienen tipados como ReactNode
const textos = (errores: unknown[]): string[] =>
  errores.filter((e): e is string => typeof e === "string");

function validarDireccion(valor: string): string | undefined {
  const limpio = valor.trim();
  if (limpio.length < 5) return "La dirección debe tener al menos 5 caracteres";
  if (limpio.length > 200) return "La dirección no puede superar los 200 caracteres";
  return undefined;
}

function validarNotas(valor: string): string | undefined {
  return valor.length > 500 ? "Las notas no pueden superar los 500 caracteres" : undefined;
}

interface ValoresCheckout {
  direccion_entrega: string;
  forma_pago: FormaPago;
  notas: string;
}

const VALORES_INICIALES: ValoresCheckout = {
  direccion_entrega: "",
  forma_pago: "EFECTIVO",
  notas: "",
};

export default function CheckoutForm() {
  const items = useCartStore((s) => s.items);
  const vaciar = useCartStore((s) => s.vaciar);
  const crearPedido = useCrearPedido();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: VALORES_INICIALES,
    onSubmit: async ({ value }) => {
      const payload: PedidoInput = {
        items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
        forma_pago: value.forma_pago,
        direccion_entrega: value.direccion_entrega.trim(),
        notas: value.notas.trim() === "" ? null : value.notas.trim(),
      };

      await crearPedido.mutateAsync(payload);
      vaciar();
      navigate("/mis-pedidos", { replace: true });
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-5"
    >
      {crearPedido.isError && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {handleApiError(crearPedido.error, "No se pudo crear el pedido")}
        </p>
      )}

      <form.Field name="direccion_entrega" validators={{ onChange: ({ value }) => validarDireccion(value) }}>
        {(field) => (
          <Input
            id={field.name}
            name={field.name}
            label="Dirección de entrega"
            required
            maxLength={200}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            errores={field.state.meta.isTouched ? textos(field.state.meta.errors) : []}
          />
        )}
      </form.Field>

      <form.Field name="forma_pago">
        {(field) => (
          <fieldset>
            <legend className="mb-1 block text-sm font-medium text-slate-700">Forma de pago</legend>
            <div className="flex gap-4">
              {FORMAS_PAGO.map((opcion) => (
                <label key={opcion.valor} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={field.name}
                    value={opcion.valor}
                    checked={field.state.value === opcion.valor}
                    onBlur={field.handleBlur}
                    onChange={() => field.handleChange(opcion.valor)}
                    className="accent-orange-600"
                  />
                  {opcion.etiqueta}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </form.Field>

      <form.Field name="notas" validators={{ onChange: ({ value }) => validarNotas(value) }}>
        {(field) => {
          const errores = field.state.meta.isTouched ? textos(field.state.meta.errors) : [];
          return (
            <div>
              <label htmlFor={field.name} className="mb-1 block text-sm font-medium text-slate-700">
                Notas (opcional)
              </label>
              <textarea
                id={field.name}
                name={field.name}
                rows={3}
                maxLength={500}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={errores.length > 0}
                className={`${claseInput} ${errores.length > 0 ? "border-red-500" : ""}`}
              />
              <p className="mt-1 text-xs text-slate-400">{field.state.value.length}/500</p>
              {errores.length > 0 && <p className="mt-1 text-xs text-red-600">{errores.join(". ")}</p>}
            </div>
          );
        }}
      </form.Field>

      <form.Subscribe selector={(s) => ({ puedeEnviar: s.canSubmit, enviando: s.isSubmitting })}>
        {({ puedeEnviar, enviando }) => (
          <Button type="submit" disabled={!puedeEnviar || enviando} className="w-full">
            {enviando ? "Confirmando…" : "Confirmar pedido"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
