import { useEffect, useId, useState } from "react";
import EstadoError from "@/shared/components/EstadoError";
import EstadoVacio from "@/shared/components/EstadoVacio";
import Paginacion from "@/shared/components/Paginacion";
import Skeleton from "@/shared/components/Skeleton";
import { claseInput } from "@/shared/ui/Input";
import { handleApiError } from "@/shared/api/handleApiError";
import ProductoCard from "../components/ProductoCard";
import { useCategorias } from "@/features/categorias";
import { useProductos } from "../hooks/useProductos";

const LIMITE = 9;
const ESPERA_BUSQUEDA = 400;

export default function CatalogoPage() {
  const idBusqueda = useId();
  const idCategoria = useId();

  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);

  // se espera a que deje de tipear: sin esto sale una request por tecla
  useEffect(() => {
    const id = setTimeout(() => setBusquedaAplicada(busqueda.trim()), ESPERA_BUSQUEDA);
    return () => clearTimeout(id);
  }, [busqueda]);

  // con otro filtro la pagina actual puede no existir y el backend devolveria vacio
  useEffect(() => {
    setPagina(0);
  }, [busquedaAplicada, categoriaId]);

  const { data: categorias = [] } = useCategorias();

  const { data, isPending, isError, error, refetch } = useProductos({
    skip: pagina * LIMITE,
    limit: LIMITE,
    search: busquedaAplicada || undefined,
    categoria_id: categoriaId ?? undefined,
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Catálogo</h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor={idBusqueda} className="mb-1 block text-sm font-medium text-slate-700">
            Buscar
          </label>
          <input
            id={idBusqueda}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre del producto"
            className={claseInput}
          />
        </div>

        <div>
          <label htmlFor={idCategoria} className="mb-1 block text-sm font-medium text-slate-700">
            Categoría
          </label>
          <select
            id={idCategoria}
            value={categoriaId ?? ""}
            onChange={(e) => setCategoriaId(e.target.value === "" ? null : Number(e.target.value))}
            className={claseInput}
          >
            <option value="">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isPending ? (
        <Skeleton filas={LIMITE} />
      ) : isError ? (
        <EstadoError
          mensaje={handleApiError(error, "No se pudieron cargar los productos")}
          onReintentar={() => void refetch()}
        />
      ) : data.total === 0 ? (
        <EstadoVacio
          mensaje="No hay productos para mostrar"
          detalle="Probá con otra búsqueda o cambiá la categoría."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((producto) => (
              <ProductoCard key={producto.id} producto={producto} />
            ))}
          </div>

          <Paginacion
            pagina={pagina}
            total={data.total}
            porPagina={LIMITE}
            onCambiar={setPagina}
          />
        </>
      )}
    </section>
  );
}
