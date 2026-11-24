import { useEffect, type ReactNode } from "react";

interface Props {
  abierto: boolean;
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  pie?: ReactNode;
}

export default function Modal({ abierto, titulo, onClose, children, pie }: Props) {
  // cerrar con Escape: se espera de cualquier modal
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto, onClose]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        // sin esto, un clic adentro del modal burbujea al fondo y lo cierra
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <header className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold">{titulo}</h2>
        </header>
        <div className="px-5 py-4">{children}</div>
        {pie && <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{pie}</footer>}
      </div>
    </div>
  );
}
