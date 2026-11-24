import { useId, useState } from "react";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Modal from "@/shared/ui/Modal";
import { handleApiError } from "@/shared/api/handleApiError";
import { useProductosMutations } from "../hooks/useProductos";
import type { Producto } from "../types/producto.types";

interface Props {
  producto: Producto;
  onClose: () => void;
}

export default function StockModal({ producto, onClose }: Props) {
  const idDisponible = useId();
  const [stock, setStock] = useState(String(producto.stock));
  const [disponible, setDisponible] = useState(producto.disponible);
  const [errorApi, setErrorApi] = useState<string | null>(null);

  const { cambiarStock } = useProductosMutations();

  const numero = Number(stock);
  const errorStock =
    stock.trim() === "" || Number.isNaN(numero)
      ? "Ingresá un stock válido"
      : !Number.isInteger(numero)
        ? "El stock tiene que ser un número entero"
        : numero < 0
          ? "El stock no puede ser negativo"
          : null;

  const guardar = async () => {
    if (errorStock) return;
    setErrorApi(null);
    try {
      await cambiarStock.mutateAsync({ id: producto.id, datos: { stock: numero, disponible } });
      onClose();
    } catch (error) {
      setErrorApi(handleApiError(error, "No se pudo actualizar el stock"));
    }
  };

  return (
    <Modal
      abierto
      titulo={`Stock de ${producto.nombre}`}
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => void guardar()}
            disabled={errorStock !== null || cambiarStock.isPending}
          >
            {cambiarStock.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errorApi && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorApi}
          </p>
        )}

        <Input
          id="stock-modal-stock"
          label="Stock"
          type="number"
          min={0}
          step="1"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          errores={errorStock ? [errorStock] : []}
        />

        <div className="flex items-center gap-2">
          <input
            id={idDisponible}
            type="checkbox"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
          />
          <label htmlFor={idDisponible} className="text-sm font-medium text-slate-700">
            Disponible para la venta
          </label>
        </div>
      </div>
    </Modal>
  );
}
