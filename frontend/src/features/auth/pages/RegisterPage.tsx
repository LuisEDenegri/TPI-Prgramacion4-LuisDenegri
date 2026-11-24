import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "react-router-dom";
import { handleApiError } from "@/shared/api/handleApiError";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Input from "@/shared/ui/Input";
import { apiRegister } from "../api/auth";

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const form = useForm({
    defaultValues: { username: "", full_name: "", email: "", password: "", confirmacion: "" },
    onSubmit: async ({ value }) => {
      setError("");
      try {
        // confirmacion es solo del formulario, el backend no la recibe
        await apiRegister({
          username: value.username,
          full_name: value.full_name,
          email: value.email,
          password: value.password,
        });
        navigate("/login", { replace: true, state: { registrado: value.username } });
      } catch (e) {
        setError(handleApiError(e, "No se pudo crear la cuenta"));
      }
    },
  });

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <h1 className="mb-6 text-xl font-bold text-slate-800">Crear cuenta</h1>

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
            validators={{
              onChange: ({ value }) =>
                value.trim().length >= 3 ? undefined : "Mínimo 3 caracteres",
            }}
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
            name="full_name"
            validators={{
              onChange: ({ value }) => (value.trim() ? undefined : "Ingresá tu nombre completo"),
            }}
          >
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                label="Nombre completo"
                autoComplete="name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                errores={field.state.meta.errors}
              />
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => (RE_EMAIL.test(value) ? undefined : "Email inválido"),
            }}
          >
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                type="email"
                label="Email"
                autoComplete="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                errores={field.state.meta.errors}
              />
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => (value.length >= 8 ? undefined : "Mínimo 8 caracteres"),
            }}
          >
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                type="password"
                label="Contraseña"
                autoComplete="new-password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                errores={field.state.meta.errors}
              />
            )}
          </form.Field>

          <form.Field
            name="confirmacion"
            validators={{
              // onChangeListenTo: si cambia password hay que revalidar la confirmacion
              onChangeListenTo: ["password"],
              onChange: ({ value, fieldApi }) =>
                value === fieldApi.form.getFieldValue("password")
                  ? undefined
                  : "Las contraseñas no coinciden",
            }}
          >
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                type="password"
                label="Repetir contraseña"
                autoComplete="new-password"
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
                {enviando ? "Creando…" : "Crear cuenta"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="font-medium text-orange-600 hover:underline">
            Ingresá
          </Link>
        </p>
      </Card>
    </div>
  );
}
