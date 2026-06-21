import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-[#f5efe8]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <p className="font-serif text-2xl text-stone-900">Skin Hearten</p>
          <p className="text-sm leading-7 text-stone-600">
            Skincare curado para mujeres que priorizan resultados reales, sensorial premium y compra segura.
          </p>
        </div>
        <div className="space-y-3 text-sm text-stone-600">
          <p className="font-semibold uppercase tracking-[0.2em] text-stone-500">Contacto</p>
          <p>hola@skinhearten.com</p>
          <p>WhatsApp: +52 55 0000 0000</p>
          <p>Ciudad de Mexico, Mexico</p>
        </div>
        <div className="space-y-3 text-sm text-stone-600">
          <p className="font-semibold uppercase tracking-[0.2em] text-stone-500">Navegacion</p>
          <Link className="block hover:text-stone-950" href="/productos">
            Catalogo
          </Link>
          <Link className="block hover:text-stone-950" href="/blog">
            Blog
          </Link>
          <Link className="block hover:text-stone-950" href="/cuenta">
            Cuenta
          </Link>
        </div>
        <div className="space-y-3 text-sm text-stone-600">
          <p className="font-semibold uppercase tracking-[0.2em] text-stone-500">Legal</p>
          <Link className="block hover:text-stone-950" href="#">
            Aviso de privacidad
          </Link>
          <Link className="block hover:text-stone-950" href="#">
            Terminos y condiciones
          </Link>
          <Link className="block hover:text-stone-950" href="#">
            Politicas de envio
          </Link>
        </div>
      </div>
    </footer>
  );
}

