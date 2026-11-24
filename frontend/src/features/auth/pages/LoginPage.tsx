import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { handleApiError } from "@/shared/api/handleApiError";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Input from "@/shared/ui/Input";
import { useAuthStore } from "@/store/authStore";

interface EstadoNavegacion {
  from?: string;
  registrado?: string;
}

/** El state de react-router llega sin tipar: se valida campo por campo. */
function leerEstado(state: unknown): EstadoNavegacion {
  if (typeof state !== "object" || state === null) return {};

  return {
    from: "from" in state && typeof state.from === "string" ? state.from : undefined,
    registrado:
      "registrado" in state && typeof state.registrado === "string" ? state.registrado : undefined,
  };
}

export default function LoginPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");

  const estado = leerEstado(location.state);

  const form = useForm({
    defaultValues: { username: "", password: "" },
    onSubmit: async ({ value }) => {
      setError("");
      try {
        await login(value.username, value.password);
        navigate(estado.from ?? "/", { replace: true });
      } catch (e) {
        setError(handleApiError(e, "No se pudo iniciar sesión"));
      }
    },
  });

  if (usuario) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <h1 className="mb-6 text-xl font-bold text-slate-800">Ingresar</h1>

        {estado.registrado && (
          <p
            role="status"
            className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            Cuenta creada, ya podés ingresar
          </p>
        )}

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="username"
            validators={{ onChange: ({ value }) => (value.trim() ? undefined : "Ingresá tu usuario") }}
          >
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                label="Usuario"
                autoComplete="username"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                errores={field.state.meta.errors}
              />
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{ onChange: ({ value }) => (value ? undefined : "Ingresá tu contraseña") }}
          >
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                type="password"
                label="Contraseña"
                autoComplete="current-password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                errores={field.state.meta.errors}
              />
            )}
          </form.Field>

          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(enviando) => (
              <Button type="submit" disabled={enviando} className="w-full">
                {enviando ? "Ingresando…" : "Ingresar"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          ¿No tenés cuenta?{" "}
          <Link to="/register" className="font-medium text-orange-600 hover:underline">
            Registrate
          </Link>
        </p>
      </Card>
    </div>
  );
}
