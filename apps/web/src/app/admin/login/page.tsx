"use client";

import { Suspense, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ADMIN_HOME_PATH, normalizeAdminNextPath } from "@/lib/admin-session";

type LoginApiResponse =
  | {
      ok: true;
      data: { scope: string };
    }
  | {
      ok: false;
      message?: string;
      reason: string;
    };

function getErrorMessage(reason: string, message?: string) {
  if (message && message.trim().length > 0) {
    return message;
  }

  switch (reason) {
    case "api_url_missing":
      return "Configura NEXT_PUBLIC_API_URL para conectar el login con FastAPI.";
    case "forbidden":
      return "Esta cuenta no tiene acceso de SuperAdmin.";
    case "invalid_credentials":
      return "Email o contrasena incorrectos.";
    default:
      return "No pudimos iniciar sesion por ahora.";
  }
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginContent />
    </Suspense>
  );
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setErrorMessage("Email y contrasena son obligatorios.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: normalizedPassword,
        }),
      });

      const payload = (await response.json()) as LoginApiResponse;

      if (!response.ok || !payload.ok) {
        const reason = payload.ok ? "fetch_failed" : payload.reason;
        const message = payload.ok ? undefined : payload.message;
        setErrorMessage(getErrorMessage(reason, message));
        return;
      }

      const nextPath = normalizeAdminNextPath(searchParams.get("next")) || ADMIN_HOME_PATH;
      router.replace(nextPath);
      router.refresh();
    } catch {
      setErrorMessage("No pudimos iniciar sesion por ahora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf7_0%,#fff_45%,#f8efe8_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-[#eaded4] bg-white/85 p-8 shadow-[0_24px_80px_rgba(67,46,35,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">Skin Hearten Admin</p>
            <h1 className="mt-4 font-serif text-4xl text-stone-900 sm:text-5xl">
              Acceso seguro para SuperAdmin
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
              Inicia sesion con tu cuenta administradora para consultar pedidos, CRM, cupones, importaciones y operacion comercial desde un solo panel.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Panel protegido con token JWT",
                "Acceso directo a pedidos y CRM",
                "Sesion admin separada del storefront",
                "Compatible con FastAPI actual",
              ].map((item) => (
                <div
                  className="rounded-[1.2rem] border border-[#efe4dc] bg-[#fffaf6] px-4 py-4 text-sm text-stone-700"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#eaded4] bg-white p-8 shadow-[0_24px_80px_rgba(67,46,35,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">Ingreso</p>
            <h2 className="mt-3 font-serif text-3xl text-stone-900">Entrar al panel</h2>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-semibold text-stone-900">Email</span>
                <input
                  autoComplete="email"
                  className="mt-3 w-full rounded-[1.25rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                  placeholder="admin@skinhearten.com"
                  type="email"
                  value={email}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-stone-900">Contrasena</span>
                <input
                  autoComplete="current-password"
                  className="mt-3 w-full rounded-[1.25rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                  placeholder="Tu contrasena"
                  type="password"
                  value={password}
                />
              </label>

              {errorMessage ? (
                <div className="rounded-[1.2rem] border border-[#ead0c7] bg-[#fff6f2] px-4 py-4 text-sm leading-7 text-[#8a4d3b]">
                  {errorMessage}
                </div>
              ) : null}

              <button
                className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            <div className="mt-6 text-sm text-stone-500">
              <p>Necesitas una cuenta con rol `superadmin` en FastAPI.</p>
              <Link className="mt-3 inline-block font-medium text-stone-900 underline-offset-4 hover:underline" href="/">
                Volver al storefront
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AdminLoginFallback() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf7_0%,#fff_45%,#f8efe8_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10 sm:px-6 lg:px-8">
        <div className="w-full rounded-[2rem] border border-[#eaded4] bg-white/85 p-8 text-center shadow-[0_24px_80px_rgba(67,46,35,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">Skin Hearten Admin</p>
          <h1 className="mt-4 font-serif text-4xl text-stone-900">Cargando acceso seguro</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            Preparando la sesion de SuperAdmin.
          </p>
        </div>
      </div>
    </div>
  );
}
