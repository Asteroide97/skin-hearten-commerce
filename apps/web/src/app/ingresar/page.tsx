import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:px-6 lg:px-8">
      <div className="soft-panel rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Login</p>
        <h1 className="mt-3 font-serif text-4xl text-stone-900">Accede a tu cuenta</h1>
        <form className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Email</span>
            <input className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm" type="email" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Contrasena</span>
            <input className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm" type="password" />
          </label>
          <button className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white" type="submit">
            Entrar
          </button>
        </form>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-stone-600">
          <Link href="/registro">Crear cuenta</Link>
          <Link href="/recuperar-contrasena">Recuperar contrasena</Link>
        </div>
      </div>
    </div>
  );
}

