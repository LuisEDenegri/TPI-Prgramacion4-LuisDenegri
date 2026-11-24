import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "secundario" | "peligro";

const ESTILOS: Record<Variante, string> = {
  primario: "bg-orange-600 text-white hover:bg-orange-700 disabled:bg-orange-300",
  secundario: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400",
  peligro: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  children: ReactNode;
}

export default function Button({ variante = "primario", className = "", children, ...props }: Props) {
  return (
    <button
      {...props}
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${ESTILOS[variante]} ${className}`}
    >
      {children}
    </button>
  );
}
