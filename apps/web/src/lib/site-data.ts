import type {
  AdminCustomer,
  AdminOrder,
  Benefit,
  BlogPost,
  Brand,
  Category,
  DashboardMetric,
  Product,
  Testimonial,
} from "@/lib/types";

export const categories: Category[] = [
  {
    id: "cat-cleanser",
    name: "Limpiadores",
    slug: "limpiadores",
    description: "Texturas suaves para limpiar sin comprometer la barrera cutanea.",
  },
  {
    id: "cat-serum",
    name: "Serums",
    slug: "serums",
    description: "Activos concentrados para firmeza, luminosidad e hidratacion.",
  },
  {
    id: "cat-moisturizer",
    name: "Hidratantes",
    slug: "hidratantes",
    description: "Cremas y emulsiones para sellar hidratacion todo el dia.",
  },
  {
    id: "cat-sunscreen",
    name: "Protector Solar",
    slug: "protector-solar",
    description: "Proteccion diaria con sensorial elegante y acabado ligero.",
  },
  {
    id: "cat-treatment",
    name: "Tratamientos",
    slug: "tratamientos",
    description: "Soluciones focalizadas para manchas, textura y sensibilidad.",
  },
];

export const brands: Brand[] = [
  {
    id: "brand-sh",
    name: "Skin Hearten Lab",
    description: "Formula propia enfocada en piel madura y resultados visibles.",
  },
  {
    id: "brand-natura",
    name: "Natura Ritual",
    description: "Botanicos de alto desempeo y acabados limpios.",
  },
  {
    id: "brand-atelier",
    name: "Atelier Derm",
    description: "Dermocosmetica premium para rutina de precision.",
  },
  {
    id: "brand-lumiere",
    name: "Lumiere Bio",
    description: "Activos antioxidantes para luminosidad diaria.",
  },
];

export const products: Product[] = [
  {
    id: "prod-001",
    slug: "serum-renovador-peptidos",
    name: "Serum Renovador Peptidos",
    brand: "Skin Hearten Lab",
    category: "Serums",
    sku: "SH-SER-001",
    price: 1199,
    compareAtPrice: 1399,
    stock: 18,
    description:
      "Serum de textura sedosa con peptidos, niacinamida y antioxidantes para mejorar firmeza y suavidad.",
    benefits: [
      "Mejora la apariencia de lineas finas",
      "Aporta luminosidad uniforme",
      "Refuerza la barrera de hidratacion",
    ],
    ingredients: ["Peptidos", "Niacinamida", "Escualano", "Vitamina E"],
    usage: [
      "Aplicar 2 a 3 gotas por la noche",
      "Presionar sobre rostro y cuello limpios",
      "Sellar con crema hidratante",
    ],
    faq: [
      {
        question: "Se puede usar con vitamina C?",
        answer: "Si, en rutinas alternadas o despues de tolerancia inicial.",
      },
      {
        question: "Es apto para piel sensible?",
        answer: "Si, su formula fue planteada para uso progresivo y diario.",
      },
    ],
    skinTypes: ["Seca", "Mixta", "Madura"],
    concerns: ["Firmeza", "Lineas finas", "Textura"],
    images: ["rose", "linen", "sand"],
    highlight: "Firmeza y luminosidad en una sola capa.",
    gradient: "from-rose-100 via-white to-stone-100",
    featured: true,
    bestSeller: true,
  },
  {
    id: "prod-002",
    slug: "gel-limpiador-barrera",
    name: "Gel Limpiador Barrera",
    brand: "Atelier Derm",
    category: "Limpiadores",
    sku: "AD-CLN-014",
    price: 649,
    stock: 22,
    description:
      "Gel cremoso que remueve protector solar y maquillaje ligero sin resecar.",
    benefits: [
      "Respeta la barrera cutanea",
      "Limpieza confortable",
      "Ideal para manana y noche",
    ],
    ingredients: ["Avena coloidal", "Pantenol", "Glicerina"],
    usage: [
      "Masajear sobre piel humeda",
      "Enjuagar con agua tibia",
      "Continuar con serum o esencia",
    ],
    faq: [
      {
        question: "Sirve para piel reactiva?",
        answer: "Si, fue formulado para limpieza suave y sensorial calmante.",
      },
    ],
    skinTypes: ["Seca", "Sensible", "Normal"],
    concerns: ["Sensibilidad", "Deshidratacion"],
    images: ["sand", "cream", "linen"],
    highlight: "Limpieza suave, cero sensacion tirante.",
    gradient: "from-stone-100 via-white to-amber-50",
    featured: true,
    bestSeller: false,
  },
  {
    id: "prod-003",
    slug: "crema-firmeza-ceramidas",
    name: "Crema Firmeza Ceramidas",
    brand: "Skin Hearten Lab",
    category: "Hidratantes",
    sku: "SH-MOI-009",
    price: 980,
    compareAtPrice: 1120,
    stock: 14,
    description:
      "Crema nutritiva con ceramidas y peptidos para piel que busca confort y elasticidad.",
    benefits: [
      "Sella hidratacion por horas",
      "Apoya elasticidad visible",
      "Acabado aterciopelado sin pesadez",
    ],
    ingredients: ["Ceramidas", "Peptidos", "Manteca de karite", "Escualano"],
    usage: [
      "Aplicar al final de la rutina",
      "Extender en rostro y cuello",
      "Usar de dia y de noche",
    ],
    faq: [
      {
        question: "Funciona bajo maquillaje?",
        answer: "Si, deja una base uniforme y comoda para la piel.",
      },
    ],
    skinTypes: ["Seca", "Normal", "Madura"],
    concerns: ["Firmeza", "Deshidratacion"],
    images: ["blush", "linen", "sand"],
    highlight: "Confort prolongado y mejor elasticidad.",
    gradient: "from-orange-50 via-rose-50 to-white",
    featured: true,
    bestSeller: true,
  },
  {
    id: "prod-004",
    slug: "protector-solar-seda-fps50",
    name: "Protector Solar Seda FPS 50",
    brand: "Lumiere Bio",
    category: "Protector Solar",
    sku: "LB-SUN-003",
    price: 759,
    stock: 31,
    description:
      "Proteccion amplia con acabado ligero, sin residuo blanco y con defensa antioxidante.",
    benefits: [
      "Proteccion UVA y UVB",
      "Acabado ligero para reaplicacion",
      "Ideal para clima calido",
    ],
    ingredients: ["Filtros fotoestables", "Vitamina E", "Extracto de arroz"],
    usage: [
      "Aplicar como ultimo paso de la rutina",
      "Reaplicar cada 2 a 3 horas",
      "Extender en rostro, cuello y escote",
    ],
    faq: [
      {
        question: "Deja brillo?",
        answer: "No, su textura fue pensada para un acabado natural y elegante.",
      },
    ],
    skinTypes: ["Mixta", "Normal", "Madura"],
    concerns: ["Fotoenvejecimiento", "Manchas"],
    images: ["white", "sand", "linen"],
    highlight: "Proteccion diaria con acabado elegante.",
    gradient: "from-yellow-50 via-white to-rose-50",
    featured: false,
    bestSeller: true,
  },
  {
    id: "prod-005",
    slug: "tratamiento-nocturno-manchas",
    name: "Tratamiento Nocturno Manchas",
    brand: "Natura Ritual",
    category: "Tratamientos",
    sku: "NR-TRT-011",
    price: 1290,
    stock: 9,
    description:
      "Tratamiento renovador con acidos suaves y antioxidantes para mejorar tono desigual.",
    benefits: [
      "Ayuda a mejorar la uniformidad",
      "Refina textura opaca",
      "Rutina de noche de alto desempeno",
    ],
    ingredients: ["Acido mandelico", "Niacinamida", "Resveratrol"],
    usage: [
      "Usar por la noche en dias alternados",
      "Aplicar sobre piel seca",
      "No olvidar protector solar al dia siguiente",
    ],
    faq: [
      {
        question: "Cuanto tarda en verse cambio?",
        answer: "La constancia de 6 a 8 semanas suele mostrar mejora visible.",
      },
    ],
    skinTypes: ["Mixta", "Normal", "Madura"],
    concerns: ["Manchas", "Textura"],
    images: ["rose", "amber", "linen"],
    highlight: "Correccion gradual con sensorial premium.",
    gradient: "from-amber-100 via-rose-50 to-white",
    featured: false,
    bestSeller: false,
  },
  {
    id: "prod-006",
    slug: "bruma-hidratante-esencia",
    name: "Bruma Hidratante Esencia",
    brand: "Lumiere Bio",
    category: "Hidratantes",
    sku: "LB-MST-019",
    price: 540,
    stock: 27,
    description:
      "Esencia en bruma para refrescar, hidratar y preparar la piel antes del serum.",
    benefits: [
      "Hidratacion ligera inmediata",
      "Mejora absorcion de capas siguientes",
      "Reaplicacion sencilla durante el dia",
    ],
    ingredients: ["Agua de rosas", "Glicerina", "Beta glucanos"],
    usage: [
      "Rociar a 20 cm del rostro",
      "Dejar absorber o presionar suavemente",
      "Usar antes del serum o durante el dia",
    ],
    faq: [
      {
        question: "Sirve sobre maquillaje?",
        answer: "Si, puede usarse para refrescar sin alterar el acabado.",
      },
    ],
    skinTypes: ["Todas"],
    concerns: ["Deshidratacion", "Opacidad"],
    images: ["blush", "rose", "white"],
    highlight: "Capas de hidratacion ligera y sofisticada.",
    gradient: "from-rose-50 via-white to-orange-50",
    featured: true,
    bestSeller: false,
  },
];

export const benefits: Benefit[] = [
  {
    title: "Envios a todo Mexico",
    description: "Cobertura nacional con seguimiento y tiempos claros desde checkout.",
  },
  {
    title: "Productos originales",
    description: "Curaduria enfocada en marcas confiables y formulas de alto desempeno.",
  },
  {
    title: "Pago seguro",
    description: "Checkout preparado para Mercado Pago, PayPal y Stripe.",
  },
  {
    title: "Soporte especializado",
    description: "Atencion enfocada en rutina, uso correcto y confianza post compra.",
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "tm-1",
    name: "Mariana G.",
    text: "La experiencia se siente limpia, clara y premium. Encontre productos sin perder tiempo.",
  },
  {
    id: "tm-2",
    name: "Lucia R.",
    text: "El checkout se entiende rapido en movil y la seleccion de productos transmite confianza.",
  },
  {
    id: "tm-3",
    name: "Daniela H.",
    text: "La curaduria se nota. Todo comunica una marca cuidada y profesional.",
  },
];

export const blogPosts: BlogPost[] = [
  {
    id: "post-001",
    slug: "como-armar-rutina-piel-madura",
    title: "Como armar una rutina efectiva para piel madura",
    excerpt: "Capas, activos y orden correcto para priorizar firmeza, hidratacion y confort.",
    author: "Equipo Skin Hearten",
    publishedAt: "2026-06-18",
    metaTitle: "Rutina para piel madura | Skin Hearten",
    metaDescription: "Guia base para construir una rutina premium y efectiva para piel madura.",
    content: [
      "Una rutina solida parte de limpieza suave, tratamiento dirigido y fotoproteccion constante.",
      "Para piel madura, conviene priorizar hidratacion inteligente, antioxidantes y peptidos.",
      "El valor real no esta en usar mas productos, sino en combinar capas compatibles y constantes.",
    ],
  },
  {
    id: "post-002",
    slug: "niacinamida-beneficios-reales",
    title: "Niacinamida: beneficios reales y como usarla",
    excerpt: "Uno de los activos mas nobles para textura, tono y barrera cutanea.",
    author: "Equipo Skin Hearten",
    publishedAt: "2026-06-14",
    metaTitle: "Niacinamida para la piel | Skin Hearten",
    metaDescription: "Que hace la niacinamida y como integrarla sin saturar la rutina.",
    content: [
      "La niacinamida es versatil, bien tolerada y util para tono desigual, poros y soporte de barrera.",
      "Conviene introducirla en concentraciones razonables y sostener el uso por varias semanas.",
      "En Skin Hearten la usamos como activo puente entre confort y resultados medibles.",
    ],
  },
  {
    id: "post-003",
    slug: "protector-solar-texturas-que-si-se-usan",
    title: "Protector solar: texturas que si se usan todos los dias",
    excerpt: "La mejor formula es la que puedes reaplicar sin friccion en tu rutina.",
    author: "Equipo Skin Hearten",
    publishedAt: "2026-06-10",
    metaTitle: "Protector solar diario | Skin Hearten",
    metaDescription: "Como elegir protector solar comodo, elegante y constante.",
    content: [
      "La adherencia mejora cuando la textura acompana tu estilo de vida y tu clima.",
      "Acabados ligeros, fotoestables y sin residuo blanco elevan la constancia real.",
      "Un buen protector solar no se siente como sacrificio, sino como una extension natural de la rutina.",
    ],
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  { label: "Ventas hoy", value: "$18,420", detail: "+12% vs ayer" },
  { label: "Ventas semana", value: "$96,300", detail: "54 ordenes confirmadas" },
  { label: "Ventas mes", value: "$382,900", detail: "Ticket promedio $1,176" },
  { label: "Ordenes pendientes", value: "11", detail: "3 requieren validacion manual" },
  { label: "Ticket promedio", value: "$1,176", detail: "Mayor a objetivo mensual" },
  { label: "Productos sin stock", value: "4", detail: "Reposicion sugerida esta semana" },
];

export const adminOrders: AdminOrder[] = [
  {
    id: "SH-1045",
    customer: "Mariana Gonzalez",
    status: "Pagado",
    total: 2310,
    paymentMethod: "Stripe",
    createdAt: "2026-06-21",
  },
  {
    id: "SH-1044",
    customer: "Lucia Herrera",
    status: "Preparando",
    total: 1649,
    paymentMethod: "PayPal",
    createdAt: "2026-06-21",
  },
  {
    id: "SH-1043",
    customer: "Gabriela Ruiz",
    status: "Enviado",
    total: 980,
    paymentMethod: "Mercado Pago",
    createdAt: "2026-06-20",
  },
];

export const adminCustomers: AdminCustomer[] = [
  {
    id: "cus-001",
    name: "Mariana Gonzalez",
    email: "mariana@example.com",
    phone: "+52 55 5555 1201",
    totalSpent: 8420,
    purchases: 7,
  },
  {
    id: "cus-002",
    name: "Lucia Herrera",
    email: "lucia@example.com",
    phone: "+52 81 4444 9981",
    totalSpent: 5210,
    purchases: 4,
  },
  {
    id: "cus-003",
    name: "Gabriela Ruiz",
    email: "gabriela@example.com",
    phone: "+52 33 7777 6603",
    totalSpent: 3890,
    purchases: 3,
  },
];

export function getFeaturedProducts() {
  return products.filter((product) => product.featured);
}

export function getBestSellerProducts() {
  return products.filter((product) => product.bestSeller);
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

