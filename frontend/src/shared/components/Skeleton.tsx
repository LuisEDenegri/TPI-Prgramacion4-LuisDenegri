/** Placeholder gris mientras carga una lista. Evita el salto de layout. */
export default function Skeleton({ filas = 6 }: { filas?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 h-32 rounded bg-slate-200" />
          <div className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
