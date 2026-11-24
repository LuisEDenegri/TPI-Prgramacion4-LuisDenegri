import { Link, NavLink, useNavigate } from "react-router-dom";
import { esAdmin, useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";

function claseLink({ isActive }: { isActive: boolean }): string {
  return isActive
    ? "rounded-md bg-orange-700 px-3 py-1.5 text-white"
    : "rounded-md px-3 py-1.5 text-orange-50 hover:bg-orange-700/60";
}

export default function Navbar() {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const cantidad = useCartStore((s) => s.cantidadTotal());
  const navigate = useNavigate();

  async function cerrarSesion() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="bg-orange-600 shadow">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-lg font-bold text-white">
          Food Store
        </Link>

        <div className="flex flex-wrap items-center gap-1 text-sm">
          <NavLink to="/" end className={claseLink}>
            Catálogo
          </NavLink>

          <NavLink to="/carrito" className={claseLink}>
            Carrito
            {cantidad > 0 && (
              <span className="ml-1.5 rounded-full bg-white px-1.5 py-0.5 text-xs font-bold text-orange-700">
                {cantidad}
              </span>
            )}
          </NavLink>

          {usuario && (
            <NavLink to="/mis-pedidos" className={claseLink}>
              Mis pedidos
            </NavLink>
          )}

          {esAdmin(usuario) && (
            <>
              <span className="mx-1 h-5 w-px bg-orange-400" aria-hidden="true" />
              <NavLink to="/admin/resumen" className={claseLink}>
                Panel
              </NavLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {usuario ? (
            <>
              <span className="text-orange-50">
                {usuario.full_name}
                {esAdmin(usuario) && (
                  <span className="ml-1.5 rounded bg-orange-800 px-1.5 py-0.5 text-xs">admin</span>
                )}
              </span>
              <button
                type="button"
                onClick={cerrarSesion}
                className="rounded-md border border-orange-300 px-3 py-1.5 text-orange-50 hover:bg-orange-700"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <NavLink to="/login" className={claseLink}>
              Ingresar
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  );
}
