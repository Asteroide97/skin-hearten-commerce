export type NeedAnalyticsValue =
  | "acne"
  | "manchas"
  | "antiedad"
  | "hidratacion"
  | "piel_sensible"
  | "protector_solar";

export type SkinQuizAnalyticsSource = "auto_home" | "header" | "home";

export type AnalyticsEventMap = {
  product_view: {
    product_id: string;
    product_name: string;
    category: string;
    price: number;
  };
  add_to_cart: {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  };
  search_used: {
    query: string;
    source: "header";
  };
  need_card_click: {
    need: NeedAnalyticsValue;
  };
  checkout_started: {
    cart_total: number;
    item_count: number;
  };
  purchase_attempted: {
    payment_method: "mercadopago" | "paypal" | "stripe";
    cart_total: number;
    item_count: number;
  };
  skin_quiz_opened: {
    source: SkinQuizAnalyticsSource;
    has_saved_result: boolean;
  };
  skin_quiz_started: {
    source: SkinQuizAnalyticsSource;
  };
  skin_quiz_step_answered: {
    step_id: "skinType" | "goal" | "ageRange" | "frequency" | "sensitivity" | "timeCommitment";
    answer: string;
    step_number: number;
  };
  skin_quiz_completed: {
    goal:
      | "manchas"
      | "acne"
      | "lineas_expresion"
      | "hidratacion"
      | "luminosidad"
      | "proteccion_solar";
    skin_type: "seca" | "mixta" | "grasa" | "sensible" | "no_segura";
    recommended_product_ids: string[];
  };
  skin_quiz_dismissed: {
    source: SkinQuizAnalyticsSource;
    reason: "now_later" | "close";
    reopen_after_days: number;
  };
  skin_quiz_add_routine_to_cart: {
    product_ids: string[];
    item_count: number;
    cart_total: number;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

export type AnalyticsEventPayload<TEvent extends AnalyticsEventName> = AnalyticsEventMap[TEvent];

export type AnalyticsTrackedEvent<TEvent extends AnalyticsEventName = AnalyticsEventName> = {
  name: TEvent;
  payload: AnalyticsEventPayload<TEvent>;
  timestamp: string;
  page: string;
};

const ANALYTICS_STORAGE_KEY = "skin-hearten.analytics.queue";
const analyticsQueue: AnalyticsTrackedEvent[] = [];

function isBrowser() {
  return typeof window !== "undefined";
}

function getSessionStorage() {
  if (!isBrowser() || typeof window.sessionStorage === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function readStoredQueue() {
  const sessionStorage = getSessionStorage();
  if (!sessionStorage) {
    return [];
  }

  try {
    const storedQueue = sessionStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!storedQueue) {
      return [];
    }

    const parsedQueue = JSON.parse(storedQueue);
    return Array.isArray(parsedQueue) ? parsedQueue : [];
  } catch {
    return [];
  }
}

function persistQueue(queue: AnalyticsTrackedEvent[]) {
  const sessionStorage = getSessionStorage();
  if (!sessionStorage) {
    return;
  }

  try {
    sessionStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage failures so telemetry never blocks the storefront.
  }
}

export function getQueuedAnalyticsEvents() {
  return [...(analyticsQueue.length > 0 ? analyticsQueue : readStoredQueue())];
}

function getAnalyticsEndpoint() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  return `${apiUrl.replace(/\/$/, "")}/events`;
}

export function buildAnalyticsApiRequest<TEvent extends AnalyticsEventName>(
  event: AnalyticsTrackedEvent<TEvent>,
) {
  const endpoint = getAnalyticsEndpoint();
  if (!endpoint) {
    return null;
  }

  return {
    url: endpoint,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      keepalive: true,
    } satisfies RequestInit,
  };
}

export function trackEvent<TEvent extends AnalyticsEventName>(
  name: TEvent,
  payload: AnalyticsEventPayload<TEvent>,
) {
  if (!isBrowser()) {
    return;
  }

  const trackedEvent: AnalyticsTrackedEvent<TEvent> = {
    name,
    payload,
    timestamp: new Date().toISOString(),
    page: typeof window.location?.pathname === "string" ? window.location.pathname : "",
  };

  const nextQueue = [
    ...(analyticsQueue.length > 0 ? analyticsQueue : readStoredQueue()),
    trackedEvent,
  ];

  analyticsQueue.splice(0, analyticsQueue.length, ...nextQueue);
  persistQueue(nextQueue);

  if (process.env.NODE_ENV === "development") {
    const request = buildAnalyticsApiRequest(trackedEvent);
    console.log("[analytics]", trackedEvent, {
      pendingApiEndpoint: request?.url ?? null,
    });
  }

  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(
      new CustomEvent("skin-hearten-analytics", {
        detail: trackedEvent,
      }),
    );
  }
}
