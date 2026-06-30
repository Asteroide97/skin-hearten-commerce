import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-[#f6f1ea]">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.75fr_0.75fr_0.85fr] lg:px-8">
        <div className="space-y-4">
          <p className="font-serif text-[2rem] leading-none text-stone-950">Skin Hearten</p>
          <p className="max-w-sm text-sm leading-7 text-stone-600">
            Skincare curado para resultados visibles, compra tranquila y una experiencia editorial que prioriza claridad.
          </p>
        </div>
        <div className="space-y-3 text-sm text-stone-600">
          <p className="section-label">Contacto</p>
          <p>hola@skinhearten.com</p>
          <p>WhatsApp: +52 55 0000 0000</p>
          <p>Ciudad de Mexico, Mexico</p>
        </div>
        <div className="space-y-3 text-sm text-stone-600">
          <p className="section-label">Explorar</p>
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
          <p className="section-label">Legal</p>
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
