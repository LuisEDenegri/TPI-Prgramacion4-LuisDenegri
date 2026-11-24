import Button from "@/shared/ui/Button";

interface Props {
  pagina: number;
  total: number;
  porPagina: number;
  onCambiar: (pagina: number) => void;
}

export default function Paginacion({ pagina, total, porPagina, onCambiar }: Props) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;

  return (
    <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Paginación">
      <Button variante="secundario" disabled={pagina === 0} onClick={() => onCambiar(pagina - 1)}>
        Anterior
      </Button>
      <span className="text-sm text-slate-600">
        Página {pagina + 1} de {paginas}
      </span>
      <Button
        variante="secundario"
        disabled={pagina >= paginas - 1}
        onClick={() => onCambiar(pagina + 1)}
      >
        Siguiente
      </Button>
    </nav>
  );
}
