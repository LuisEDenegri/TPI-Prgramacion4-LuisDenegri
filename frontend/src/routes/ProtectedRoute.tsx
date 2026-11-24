import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

interface Props {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const usuario = useAuthStore((s) => s.usuario);
  const cargando = useAuthStore((s) => s.cargando);
  const location = useLocation();

  // mientras checkSession no termina no se puede decidir: redirigir aca
  // mandaria al login a un usuario que si tiene sesion valida
  if (cargando) {
    return (
      <div className="flex justify-center py-20" role="status" aria-label="Cargando">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
