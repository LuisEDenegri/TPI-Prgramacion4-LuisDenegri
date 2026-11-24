import Card from "@/shared/ui/Card";

interface Props {
  titulo: string;
  valor: string | number;
  acento?: boolean;
}

export default function TarjetaResumen({ titulo, valor, acento = false }: Props) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${acento ? "text-orange-700" : "text-slate-800"}`}>
        {valor}
      </p>
    </Card>
  );
}
