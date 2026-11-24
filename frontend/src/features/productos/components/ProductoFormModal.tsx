import { useId, useState } from "react";
import { useForm } from "@tanstack/react-form";
import Button from "@/shared/ui/Button";
import Input, { claseInput } from "@/shared/ui/Input";
import Modal from "@/shared/ui/Modal";
import { handleApiError } from "@/shared/api/handleApiError";
import { useCategorias } from "@/features/categorias";
import { useProductosMutations } from "../hooks/useProductos";
import type { Producto, ProductoInput } from "../types/producto.types";

interface Props {
  abierto: boolean;
  /** null = alta. */
  producto: Producto | null;
  onClose: () => void;
}

/** Los validadores devuelven string | undefined; el resto no se muestra. */
function soloMensajes(errores: unknown[]): string[] {
  return errores.filter((e): e is string => typeof e === "string");
}

function validarTexto(valor: string, etiqueta: string, maximo: number): string | undefined {
  if (valor.trim() === "") return `${etiqueta} es obligatorio`;
  if (valor.length > maximo) return `${etiqueta} supera los ${maximo} caracteres`;
  return undefined;
}

export default function ProductoFormModal({ abierto, producto, onClose }: Props) {
  const idForm = useId();
  const idCategoria = useId();
  const idDisponible = useId();

  const [errorApi, setErrorApi] = useState<string | null>(null);
  const { data: categorias = [] } = useCategorias();
  const { crear, editar } = useProductosMutations();

  // los numericos viven como texto en el form: con type=number un campo vacio
  // da NaN y dejaria el input inusable mientras se borra el valor
  const form = useForm({
    defaultValues: {
      nombre: producto?.nombre ?? "",
      descripcion: producto?.descripcion ?? "",
      precio_base: producto ? String(producto.precio_base) : "",
      imagen_url: producto?.imagen_url ?? "",
      stock: producto ? String(producto.stock) : "0",
      disponible: producto?.disponible ?? true,
      categoria_id: producto ? String(producto.categoria_id) : "",
    },
    onSubmit: async ({ value }) => {
      setErrorApi(null);
      const datos: ProductoInput = {
        nombre: value.nombre.trim(),
        descripcion: value.descripcion.trim() || null,
        precio_base: Number(value.precio_base),
        imagen_url: value.imagen_url.trim() || null,
        stock: Number(value.stock),
        disponible: value.disponible,
        categoria_id: Number(value.categoria_id),
      };

      try {
        if (producto) {
          await editar.mutateAsync({ id: producto.id, datos });
        } else {
          await crear.mutateAsync(datos);
        }
        onClose();
      } catch (error) {
        setErrorApi(handleApiError(error, "No se pudo guardar el producto"));
      }
    },
  });

  return (
    <Modal
      abierto={abierto}
      titulo={producto ? "Editar producto" : "Nuevo producto"}
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <form.Subscribe
            selector={(estado) => ({
              puedeEnviar: estado.canSubmit,
              enviando: estado.isSubmitting,
            })}
          >
            {({ puedeEnviar, enviando }) => (
              <Button type="submit" form={idForm} disabled={!puedeEnviar}>
                {enviando ? "Guardando…" : "Guardar"}
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id={idForm}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="grid gap-4"
      >
        {errorApi && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorApi}
          </p>
        )}

        <form.Field
          name="nombre"
          validators={{ onChange: ({ value }) => validarTexto(value, "El nombre", 150) }}
        >
          {(field) => (
            <Input
              id={field.name}
              name={field.name}
              label="Nombre"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              errores={soloMensajes(field.state.meta.errors)}
            />
          )}
        </form.Field>

        <form.Field
          name="descripcion"
          validators={{
            onChange: ({ value }) =>
              value.length > 1000 ? "La descripción supera los 1000 caracteres" : undefined,
          }}
        >
          {(field) => (
            <div>
              <label
                htmlFor={field.name}
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Descripción
              </label>
              <textarea
                id={field.name}
                name={field.name}
                rows={3}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={claseInput}
              />
              {soloMensajes(field.state.meta.errors).map((mensaje) => (
                <p key={mensaje} className="mt-1 text-xs text-red-600">
                  {mensaje}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field
            name="precio_base"
            validators={{
              onChange: ({ value }) => {
                const numero = Number(value);
                if (value.trim() === "" || Number.isNaN(numero)) return "Ingresá un precio válido";
                if (numero < 0) return "El precio no puede ser negativo";
                return undefined;
              },
            }}
          >
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                label="Precio base"
                type="number"
                min={0}
                step="0.01"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                errores={soloMensajes(field.state.meta.errors)}
              />
            )}
          </form.Field>

          <form.Field
            name="stock"
            validators={{
              onChange: ({ value }) => {
                const numero = Number(value);
                if (value.trim() === "" || Number.isNaN(numero)) return "Ingresá un stock válido";
                if (!Number.isInteger(numero)) return "El stock tiene que ser un número entero";
                if (numero < 0) return "El stock no puede ser negativo";
                return undefined;
              },
            }}
          >
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                label="Stock"
                type="number"
                min={0}
                step="1"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                errores={soloMensajes(field.state.meta.errors)}
              />
            )}
          </form.Field>
        </div>

        <form.Field
          name="imagen_url"
          validators={{
            onChange: ({ value }) =>
              value.length > 500 ? "La URL supera los 500 caracteres" : undefined,
          }}
        >
          {(field) => (
            <Input
              id={field.name}
              name={field.name}
              label="URL de la imagen"
              type="url"
              placeholder="https://…"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              errores={soloMensajes(field.state.meta.errors)}
            />
          )}
        </form.Field>

        <form.Field
          name="categoria_id"
          validators={{
            onChange: ({ value }) => (value === "" ? "Elegí una categoría" : undefined),
          }}
        >
          {(field) => {
            const errores = soloMensajes(field.state.meta.errors);
            return (
              <div>
                <label
                  htmlFor={idCategoria}
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Categoría
                </label>
                <select
                  id={idCategoria}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={errores.length > 0}
                  className={`${claseInput} ${errores.length > 0 ? "border-red-500" : ""}`}
                >
                  <option value="">Seleccioná una categoría</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
                {errores.map((mensaje) => (
                  <p key={mensaje} className="mt-1 text-xs text-red-600">
                    {mensaje}
                  </p>
                ))}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="disponible">
          {(field) => (
            <div className="flex items-center gap-2">
              <input
                id={idDisponible}
                name={field.name}
                type="checkbox"
                checked={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor={idDisponible} className="text-sm font-medium text-slate-700">
                Disponible para la venta
              </label>
            </div>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
