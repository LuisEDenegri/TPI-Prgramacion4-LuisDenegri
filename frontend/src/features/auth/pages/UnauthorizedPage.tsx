import { Link } from "react-router-dom";
import Card from "@/shared/ui/Card";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <p className="text-4xl font-bold text-orange-600">403</p>
        <h1 className="mt-2 text-xl font-bold text-slate-800">Acceso denegado</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu cuenta no tiene permisos para ver esta sección.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700"
        >
          Volver al catálogo
        </Link>
      </Card>
    </div>
  );
}
