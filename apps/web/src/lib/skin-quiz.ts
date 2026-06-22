import type { Product } from "@/lib/types";

export const SKIN_QUIZ_COMPLETED_KEY = "skin_quiz_completed";
export const SKIN_QUIZ_DISMISSED_UNTIL_KEY = "skin_quiz_dismissed_until";
export const SKIN_QUIZ_LEAD_KEY = "skin_quiz_lead";
export const SKIN_QUIZ_RESULT_KEY = "skin_quiz_result";
export const SKIN_QUIZ_WHATSAPP_MESSAGE =
  "Hola, hice el Skin Quiz y quiero recibir ayuda con mi rutina recomendada.";
export const SKIN_QUIZ_WHATSAPP_NUMBER = "525500000000";

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
const storageFallback = new Map<string, string>();

export type SkinQuizOpenSource = "auto_home" | "header" | "home";

export type SkinQuizSkinType = "seca" | "mixta" | "grasa" | "sensible" | "no_segura";
export type SkinQuizGoal =
  | "manchas"
  | "acne"
  | "lineas_expresion"
  | "hidratacion"
  | "luminosidad"
  | "proteccion_solar";
export type SkinQuizAgeRange = "18_24" | "25_34" | "35_44" | "45_plus";
export type SkinQuizFrequency = "manana_noche" | "una_vez" | "a_veces" | "casi_nunca";
export type SkinQuizSensitivity =
  | "nada_sensible"
  | "algo_sensible"
  | "muy_sensible"
  | "se_irrita_facil";
export type SkinQuizCommitment = "2_min" | "5_min" | "10_min" | "sin_limite";

export type SkinQuizAnswers = {
  skinType: SkinQuizSkinType;
  goal: SkinQuizGoal;
  ageRange: SkinQuizAgeRange;
  frequency: SkinQuizFrequency;
  sensitivity: SkinQuizSensitivity;
  timeCommitment: SkinQuizCommitment;
};

export type SkinQuizQuestionId = keyof SkinQuizAnswers;

export type SkinQuizOption<TValue extends string> = {
  value: TValue;
  label: string;
  description: string;
};

export type SkinQuizQuestion<TId extends SkinQuizQuestionId = SkinQuizQuestionId> = {
  id: TId;
  title: string;
  options: SkinQuizOption<SkinQuizAnswers[TId]>[];
};

export type SkinQuizRoutineStep = {
  slot: string;
  product: Product;
  note: string;
};

export type SkinQuizResult = {
  answers: SkinQuizAnswers;
  summary: string;
  amRoutine: SkinQuizRoutineStep[];
  pmRoutine: SkinQuizRoutineStep[];
  recommendedProducts: Product[];
  collectionHref: string;
  recommendedProductIds: string[];
  generatedAt: string;
};

export type SkinQuizLeadInput = {
  name: string;
  whatsapp: string;
  email: string;
  acceptedMarketing: boolean;
};

export type SkinQuizLead = SkinQuizLeadInput & {
  createdAt: string;
  quizResult: SkinQuizResult;
};

type BrowserStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type CandidateStep = SkinQuizRoutineStep & {
  priority: number;
};

const skinTypeLabels: Record<SkinQuizSkinType, string> = {
  seca: "seca",
  mixta: "mixta",
  grasa: "grasa",
  sensible: "sensible",
  no_segura: "que aun estas descubriendo",
};

const goalLabels: Record<SkinQuizGoal, string> = {
  manchas: "manchas",
  acne: "acne adulto",
  lineas_expresion: "lineas de expresion",
  hidratacion: "hidratacion profunda",
  luminosidad: "luminosidad",
  proteccion_solar: "proteccion solar",
};

const commitmentLabels: Record<SkinQuizCommitment, string> = {
  "2_min": "ultra corta",
  "5_min": "corta pero completa",
  "10_min": "completa",
  sin_limite: "sin prisa",
};

export const skinQuizQuestions: SkinQuizQuestion[] = [
  {
    id: "skinType",
    title: "Que tipo de piel tienes?",
    options: [
      { value: "seca", label: "Seca", description: "Busca confort, elasticidad y cero tirantez." },
      { value: "mixta", label: "Mixta", description: "Necesita equilibrio entre hidratacion y ligereza." },
      { value: "grasa", label: "Grasa", description: "Prefiere texturas ligeras y control de brillo." },
      { value: "sensible", label: "Sensible", description: "Prioriza formulas calmantes y bien toleradas." },
      { value: "no_segura", label: "No estoy segura", description: "Te guiamos con una propuesta versatil." },
    ],
  },
  {
    id: "goal",
    title: "Cual es tu principal objetivo?",
    options: [
      { value: "manchas", label: "Manchas", description: "Uniformidad y proteccion diaria constante." },
      { value: "acne", label: "Acne", description: "Brotes, poros visibles y textura irregular." },
      { value: "lineas_expresion", label: "Lineas de expresion", description: "Firmeza, suavidad y renovacion." },
      { value: "hidratacion", label: "Hidratacion", description: "Confort, barrera y sensacion de piel llena." },
      { value: "luminosidad", label: "Luminosidad", description: "Piel mas fresca, uniforme y descansada." },
      { value: "proteccion_solar", label: "Proteccion solar", description: "Fotoproteccion elegante y facil de usar." },
    ],
  },
  {
    id: "ageRange",
    title: "Que edad tienes?",
    options: [
      { value: "18_24", label: "18 a 24", description: "Rutina ligera, efectiva y facil de sostener." },
      { value: "25_34", label: "25 a 34", description: "Prevencion inteligente y constancia diaria." },
      { value: "35_44", label: "35 a 44", description: "Mayor enfoque en firmeza, tono y confort." },
      { value: "45_plus", label: "45+", description: "Rutina nutritiva y de apoyo a la elasticidad." },
    ],
  },
  {
    id: "frequency",
    title: "Usas productos de skincare todos los dias?",
    options: [
      {
        value: "manana_noche",
        label: "Si, manana y noche",
        description: "Podemos proponerte una rutina con capas mas completas.",
      },
      { value: "una_vez", label: "Si, una vez al dia", description: "Conviene una rutina clara y muy facil de repetir." },
      { value: "a_veces", label: "A veces", description: "Priorizamos constancia antes que saturacion." },
      { value: "casi_nunca", label: "Casi nunca", description: "Empezamos por esenciales que si quieras usar." },
    ],
  },
  {
    id: "sensitivity",
    title: "Que tan sensible es tu piel?",
    options: [
      { value: "nada_sensible", label: "Nada sensible", description: "Permite una rutina mas activa." },
      { value: "algo_sensible", label: "Algo sensible", description: "Mejor con activos nobles y textura suave." },
      { value: "muy_sensible", label: "Muy sensible", description: "Conviene evitar exceso de friccion y sobreexfoliacion." },
      { value: "se_irrita_facil", label: "Se irrita facilmente", description: "La prioridad es calma, barrera y progresion suave." },
    ],
  },
  {
    id: "timeCommitment",
    title: "Cuanto tiempo quieres dedicar a tu rutina?",
    options: [
      { value: "2_min", label: "2 minutos", description: "Solo esenciales, con foco en adherencia." },
      { value: "5_min", label: "5 minutos", description: "Rutina breve pero con cobertura solida." },
      { value: "10_min", label: "10 minutos", description: "Rutina AM y PM mucho mas completa." },
      { value: "sin_limite", label: "No me importa si funciona", description: "Podemos recomendar una rutina completa sin recortar pasos." },
    ],
  },
];

function getStorage(): BrowserStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof window.localStorage !== "undefined") {
    return window.localStorage;
  }

  return {
    getItem: (key) => storageFallback.get(key) ?? null,
    setItem: (key, value) => {
      storageFallback.set(key, value);
    },
    removeItem: (key) => {
      storageFallback.delete(key);
    },
  };
}

function getProductMap(products: Product[]) {
  return new Map(products.map((product) => [product.id, product]));
}

function getCollectionHref(goal: SkinQuizGoal) {
  switch (goal) {
    case "manchas":
      return "/productos?problema=Manchas";
    case "acne":
      return "/productos?problema=Acne";
    case "lineas_expresion":
      return "/productos?problema=Firmeza";
    case "hidratacion":
      return "/productos?problema=Deshidratacion";
    case "proteccion_solar":
      return "/productos?categoria=protector-solar";
    case "luminosidad":
    default:
      return "/productos?destacados=true";
  }
}

function dedupeProducts(products: Product[]) {
  return products.filter((product, index, list) => list.findIndex((entry) => entry.id === product.id) === index);
}

function dedupeRoutineSteps(steps: CandidateStep[]) {
  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = `${step.slot}:${step.product.id}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function pickProduct(product: Product | undefined, fallback: Product) {
  return product ?? fallback;
}

function getRecommendedLimit(timeCommitment: SkinQuizCommitment) {
  switch (timeCommitment) {
    case "2_min":
      return 3;
    case "5_min":
      return 4;
    case "10_min":
    case "sin_limite":
    default:
      return 5;
  }
}

function buildSummary(answers: SkinQuizAnswers, recommendedProducts: Product[]) {
  const sensitivityCopy =
    answers.skinType === "sensible" ||
    answers.sensitivity === "muy_sensible" ||
    answers.sensitivity === "se_irrita_facil"
      ? "Priorizamos formulas suaves y bien toleradas para cuidar la barrera sin perder eficacia."
      : "Combinamos tratamiento y soporte diario para avanzar con mas consistencia.";
  const habitCopy =
    answers.timeCommitment === "2_min" || answers.frequency === "casi_nunca"
      ? "Reducimos la propuesta a esenciales faciles de repetir todos los dias."
      : `La seleccion se ajusta a una rutina ${commitmentLabels[answers.timeCommitment]} con productos que ya existen en el catalogo actual.`;

  return `Tu piel ${skinTypeLabels[answers.skinType]} con foco en ${goalLabels[answers.goal]} se beneficia de una seleccion curada de ${recommendedProducts.length} productos. ${sensitivityCopy} ${habitCopy}`;
}

export function readStoredSkinQuizResult() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const rawResult = storage.getItem(SKIN_QUIZ_RESULT_KEY);
  if (!rawResult) {
    return null;
  }

  try {
    return JSON.parse(rawResult) as SkinQuizResult;
  } catch {
    storage.removeItem(SKIN_QUIZ_RESULT_KEY);
    return null;
  }
}

export function readStoredSkinQuizLead() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const rawLead = storage.getItem(SKIN_QUIZ_LEAD_KEY);
  if (!rawLead) {
    return null;
  }

  try {
    return JSON.parse(rawLead) as SkinQuizLead;
  } catch {
    storage.removeItem(SKIN_QUIZ_LEAD_KEY);
    return null;
  }
}

export function isSkinQuizCompleted() {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  return storage.getItem(SKIN_QUIZ_COMPLETED_KEY) === "true";
}

export function getSkinQuizDismissedUntil() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  return storage.getItem(SKIN_QUIZ_DISMISSED_UNTIL_KEY);
}

export function shouldAutoOpenSkinQuiz(now = Date.now()) {
  if (isSkinQuizCompleted()) {
    return false;
  }

  const dismissedUntil = getSkinQuizDismissedUntil();
  if (!dismissedUntil) {
    return true;
  }

  const dismissedTimestamp = new Date(dismissedUntil).getTime();
  if (Number.isNaN(dismissedTimestamp)) {
    return true;
  }

  return dismissedTimestamp <= now;
}

export function dismissSkinQuizForDays(days = 7) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const dismissedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  storage.setItem(SKIN_QUIZ_DISMISSED_UNTIL_KEY, dismissedUntil);
}

export function saveSkinQuizResult(result: SkinQuizResult) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(SKIN_QUIZ_COMPLETED_KEY, "true");
  storage.setItem(SKIN_QUIZ_RESULT_KEY, JSON.stringify(result));
  storage.removeItem(SKIN_QUIZ_DISMISSED_UNTIL_KEY);
}

export function saveSkinQuizLead(lead: SkinQuizLead) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(SKIN_QUIZ_LEAD_KEY, JSON.stringify(lead));
}

export function clearSkinQuizDismissal() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(SKIN_QUIZ_DISMISSED_UNTIL_KEY);
}

export function calculateSkinQuizResult(answers: SkinQuizAnswers, products: Product[]): SkinQuizResult {
  if (products.length === 0) {
    throw new Error("Skin quiz requires at least one product in the catalog.");
  }

  const productMap = getProductMap(products);
  const firstProduct = products[0];

  const cleanser = pickProduct(productMap.get("prod-002"), firstProduct);
  const renewalSerum = pickProduct(productMap.get("prod-001"), cleanser);
  const richMoisturizer = pickProduct(productMap.get("prod-003"), renewalSerum);
  const sunscreen = pickProduct(productMap.get("prod-004"), richMoisturizer);
  const darkSpotTreatment = pickProduct(productMap.get("prod-005"), renewalSerum);
  const hydratingEssence = pickProduct(productMap.get("prod-006"), richMoisturizer);
  const acneTreatment = pickProduct(productMap.get("prod-007"), renewalSerum);

  const isSensitive =
    answers.skinType === "sensible" ||
    answers.sensitivity === "muy_sensible" ||
    answers.sensitivity === "se_irrita_facil";
  const needsRichMoisture =
    answers.skinType === "seca" ||
    answers.ageRange === "35_44" ||
    answers.ageRange === "45_plus" ||
    answers.goal === "lineas_expresion";

  const moisturizer = needsRichMoisture ? richMoisturizer : hydratingEssence;
  const dailyTreatment =
    answers.goal === "acne"
      ? isSensitive
        ? renewalSerum
        : acneTreatment
      : answers.goal === "manchas"
        ? isSensitive
          ? renewalSerum
          : darkSpotTreatment
        : answers.goal === "hidratacion" || answers.goal === "proteccion_solar"
          ? hydratingEssence
          : renewalSerum;

  let amRoutine: CandidateStep[] = [];
  let pmRoutine: CandidateStep[] = [];
  let productPriority: Product[] = [];

  switch (answers.goal) {
    case "manchas":
      amRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Prepara la piel sin resecar.", priority: 4 },
        { slot: "Serum o tratamiento", product: renewalSerum, note: "Aporta apoyo renovador y mejor tono visible.", priority: 1 },
        { slot: "Hidratante", product: moisturizer, note: "Sella confort y ayuda a tolerar los activos.", priority: 5 },
        { slot: "Protector solar", product: sunscreen, note: "Clave para evitar que las manchas se marquen mas.", priority: 2 },
      ];
      pmRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Retira el dia con una limpieza amable.", priority: 4 },
        { slot: "Tratamiento", product: dailyTreatment, note: "Trabaja tono desigual mientras descansas.", priority: 1 },
        { slot: "Hidratante", product: moisturizer, note: "Mantiene barrera y confort nocturno.", priority: 5 },
      ];
      productPriority = [dailyTreatment, sunscreen, cleanser, moisturizer, renewalSerum];
      break;
    case "acne":
      amRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Limpia sin agredir ni dejar sensacion tirante.", priority: 1 },
        { slot: "Hidratante", product: hydratingEssence, note: "Aporta hidratacion ligera y tolerable.", priority: 3 },
        { slot: "Protector solar", product: sunscreen, note: "Protege y ayuda a que las marcas no se intensifiquen.", priority: 4 },
      ];
      pmRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Mantiene la barrera mientras retira residuos.", priority: 1 },
        { slot: "Tratamiento", product: dailyTreatment, note: "Se enfoca en textura, brotes y poros visibles.", priority: 2 },
        { slot: "Hidratante", product: hydratingEssence, note: "Compensa sin sentir la piel pesada.", priority: 3 },
      ];
      productPriority = [cleanser, dailyTreatment, hydratingEssence, sunscreen];
      break;
    case "lineas_expresion":
      amRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Limpieza suave para comenzar sin friccion.", priority: 4 },
        { slot: "Serum o tratamiento", product: renewalSerum, note: "Peptidos y antioxidantes para apoyar firmeza.", priority: 1 },
        { slot: "Hidratante", product: richMoisturizer, note: "Aporta nutricion y elasticidad visible.", priority: 2 },
        { slot: "Protector solar", product: sunscreen, note: "Esencial para prevenir fotoenvejecimiento.", priority: 3 },
      ];
      pmRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Prepara la piel para la capa de tratamiento.", priority: 4 },
        { slot: "Tratamiento", product: renewalSerum, note: "Renovacion enfocada en suavidad y firmeza.", priority: 1 },
        { slot: "Hidratante", product: richMoisturizer, note: "Sella el confort durante la noche.", priority: 2 },
      ];
      productPriority = [renewalSerum, richMoisturizer, sunscreen, cleanser];
      break;
    case "hidratacion":
      amRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Limpieza suave para no comprometer la barrera.", priority: 3 },
        { slot: "Serum o tratamiento", product: hydratingEssence, note: "Primera capa de agua y confort inmediato.", priority: 1 },
        { slot: "Hidratante", product: richMoisturizer, note: "Retiene hidratacion por mas tiempo.", priority: 2 },
        { slot: "Protector solar", product: sunscreen, note: "Proteccion diaria con acabado ligero.", priority: 4 },
      ];
      pmRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Retira el dia sin resecar.", priority: 3 },
        { slot: "Tratamiento", product: hydratingEssence, note: "Rehidrata y prepara la piel para sellar.", priority: 1 },
        { slot: "Hidratante", product: richMoisturizer, note: "Aporta confort profundo mientras descansas.", priority: 2 },
      ];
      productPriority = [richMoisturizer, hydratingEssence, cleanser, sunscreen];
      break;
    case "proteccion_solar":
      amRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Base limpia y suave para proteger mejor.", priority: 2 },
        { slot: "Serum o tratamiento", product: hydratingEssence, note: "Ligereza e hidratacion antes del FPS.", priority: 3 },
        { slot: "Hidratante", product: moisturizer, note: "Confort sin hacer pesada la proteccion.", priority: 4 },
        { slot: "Protector solar", product: sunscreen, note: "La pieza central de esta rutina.", priority: 1 },
      ];
      pmRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Importante para retirar protector solar y residuos.", priority: 2 },
        { slot: "Tratamiento", product: isSensitive ? hydratingEssence : renewalSerum, note: "Apoyo antioxidante para el siguiente dia.", priority: 3 },
        { slot: "Hidratante", product: moisturizer, note: "Refuerza la barrera por la noche.", priority: 4 },
      ];
      productPriority = [sunscreen, cleanser, moisturizer, hydratingEssence, renewalSerum];
      break;
    case "luminosidad":
    default:
      amRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Limpieza amable para una piel mas fresca.", priority: 4 },
        { slot: "Serum o tratamiento", product: renewalSerum, note: "Aporta tono mas uniforme y mejor luz.", priority: 1 },
        { slot: "Hidratante", product: hydratingEssence, note: "Mantiene la piel flexible y comoda.", priority: 3 },
        { slot: "Protector solar", product: sunscreen, note: "Ayuda a sostener la luminosidad todos los dias.", priority: 2 },
      ];
      pmRoutine = [
        { slot: "Limpiador", product: cleanser, note: "Retira impurezas sin friccion extra.", priority: 4 },
        { slot: "Tratamiento", product: renewalSerum, note: "Renueva la textura para una piel mas uniforme.", priority: 1 },
        { slot: "Hidratante", product: richMoisturizer, note: "Sella la hidratacion con tacto aterciopelado.", priority: 3 },
      ];
      productPriority = [renewalSerum, sunscreen, hydratingEssence, cleanser, richMoisturizer];
      break;
  }

  const recommendedLimit = getRecommendedLimit(answers.timeCommitment);
  const allowedProductIds = new Set(
    dedupeProducts(productPriority).slice(0, recommendedLimit).map((product) => product.id),
  );

  const filteredAmRoutine = dedupeRoutineSteps(amRoutine).filter((step) => allowedProductIds.has(step.product.id));
  const filteredPmRoutine = dedupeRoutineSteps(pmRoutine).filter((step) => allowedProductIds.has(step.product.id));
  const recommendedProducts = dedupeProducts([...filteredAmRoutine, ...filteredPmRoutine].map((step) => step.product));

  return {
    answers,
    summary: buildSummary(answers, recommendedProducts),
    amRoutine: filteredAmRoutine.map(({ slot, product, note }) => ({ slot, product, note })),
    pmRoutine: filteredPmRoutine.map(({ slot, product, note }) => ({ slot, product, note })),
    recommendedProducts,
    collectionHref: getCollectionHref(answers.goal),
    recommendedProductIds: recommendedProducts.map((product) => product.id),
    generatedAt: new Date().toISOString(),
  };
}

export function getSkinQuizDismissedWindow() {
  return SEVEN_DAYS_IN_MS;
}

export function getSkinQuizWhatsAppHref() {
  return `https://wa.me/${SKIN_QUIZ_WHATSAPP_NUMBER}?text=${encodeURIComponent(SKIN_QUIZ_WHATSAPP_MESSAGE)}`;
}
