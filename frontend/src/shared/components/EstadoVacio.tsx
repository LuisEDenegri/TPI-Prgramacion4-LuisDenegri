interface Props {
  mensaje: string;
  detalle?: string;
}

export default function EstadoVacio({ mensaje, detalle }: Props) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
      <p className="font-medium text-slate-600">{mensaje}</p>
      {detalle && <p className="mt-1 text-sm text-slate-400">{detalle}</p>}
    </div>
  );
}
