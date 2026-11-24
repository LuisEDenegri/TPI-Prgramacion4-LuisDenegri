import type { InputHTMLAttributes, ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  errores?: ReactNode[];
}

export const claseInput =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

export default function Input({ label, errores = [], id, className = "", ...props }: Props) {
  const conError = errores.length > 0;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={conError}
        className={`${claseInput} ${conError ? "border-red-500" : ""} ${className}`}
      />
      {conError && (
        <p className="mt-1 text-xs text-red-600">
          {errores.filter(Boolean).map(String).join(". ")}
        </p>
      )}
    </div>
  );
}
