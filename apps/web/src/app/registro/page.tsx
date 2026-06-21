export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:px-6 lg:px-8">
      <div className="soft-panel rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Registro</p>
        <h1 className="mt-3 font-serif text-4xl text-stone-900">Crear una cuenta</h1>
        <form className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Nombre</span>
            <input className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Email</span>
            <input className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm" type="email" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-stone-900">Contrasena</span>
            <input className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm" type="password" />
          </label>
          <button className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white" type="submit">
            Registrarme
          </button>
        </form>
      </div>
    </div>
  );
}

