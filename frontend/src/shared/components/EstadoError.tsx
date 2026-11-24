import Button from "@/shared/ui/Button";

interface Props {
  mensaje: string;
  onReintentar?: () => void;
}

export default function EstadoError({ mensaje, onReintentar }: Props) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-red-700">{mensaje}</p>
      {onReintentar && (
        <Button variante="secundario" onClick={onReintentar} className="mt-4">
          Reintentar
        </Button>
      )}
    </div>
  );
}
