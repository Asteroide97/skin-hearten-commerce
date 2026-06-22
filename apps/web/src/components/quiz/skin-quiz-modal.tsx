"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowUpRightIcon } from "@/components/shared/icons";
import { SkinQuizLeadStep } from "@/components/quiz/skin-quiz-lead-step";
import { SkinQuizResult } from "@/components/quiz/skin-quiz-result";
import { trackEvent } from "@/lib/analytics";
import {
  calculateSkinQuizResult,
  clearSkinQuizDismissal,
  dismissSkinQuizForDays,
  getSkinQuizDismissedWindow,
  getSkinQuizWhatsAppHref,
  readStoredSkinQuizResult,
  readStoredSkinQuizLead,
  saveSkinQuizLead,
  saveSkinQuizLeadSyncStatus,
  saveSkinQuizResult,
  shouldAutoOpenSkinQuiz,
  skinQuizQuestions,
  syncSkinQuizLeadToApi,
  type SkinQuizAnswers,
  type SkinQuizLead,
  type SkinQuizLeadInput,
  type SkinQuizQuestionId,
  type SkinQuizResult as SkinQuizResultValue,
} from "@/lib/skin-quiz";
import type { SkinQuizLeadValues } from "@/schemas/skin-quiz-lead";
import { products } from "@/lib/site-data";
import { cn } from "@/lib/utils";
import { useSkinQuizStore } from "@/store/skin-quiz-store";
import { useCartStore } from "@/store/cart-store";

type DismissReason = "now_later" | "close";

const dismissWindowInDays = getSkinQuizDismissedWindow() / (24 * 60 * 60 * 1000);

export function SkinQuizModal() {
  const pathname = usePathname();
  const addItem = useCartStore((state) => state.addItem);
  const close = useSkinQuizStore((state) => state.close);
  const isOpen = useSkinQuizStore((state) => state.isOpen);
  const open = useSkinQuizStore((state) => state.open);
  const sessionId = useSkinQuizStore((state) => state.sessionId);
  const source = useSkinQuizStore((state) => state.source);

  const [answers, setAnswers] = useState<Partial<SkinQuizAnswers>>({});
  const [pendingResult, setPendingResult] = useState<SkinQuizResultValue | null>(null);
  const [result, setResult] = useState<SkinQuizResultValue | null>(null);
  const [storedLead, setStoredLead] = useState<SkinQuizLead | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [routineAdded, setRoutineAdded] = useState(false);
  const autoPromptedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const currentQuestion = skinQuizQuestions[stepIndex];
  const isLeadStepActive = pendingResult !== null && result === null;
  const progress = useMemo(
    () => (result || isLeadStepActive ? 100 : Math.round(((Math.min(stepIndex + 1, skinQuizQuestions.length)) / skinQuizQuestions.length) * 100)),
    [isLeadStepActive, result, stepIndex],
  );

  const handleDismiss = useCallback((reason: DismissReason) => {
    if (!result) {
      dismissSkinQuizForDays(dismissWindowInDays);
      trackEvent("skin_quiz_dismissed", {
        reason,
        reopen_after_days: dismissWindowInDays,
        source,
      });
    }

    close();
  }, [close, result, source]);

  useEffect(() => {
    if (pathname !== "/") {
      autoPromptedRef.current = false;
      return;
    }

    if (autoPromptedRef.current || !shouldAutoOpenSkinQuiz()) {
      return;
    }

    autoPromptedRef.current = true;
    open("auto_home");
  }, [open, pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const storedResult = readStoredSkinQuizResult();
    const savedLead = readStoredSkinQuizLead();
    setAnswers(storedResult?.answers ?? {});
    setPendingResult(null);
    setResult(storedResult);
    setStoredLead(savedLead);
    setStepIndex(0);
    setRoutineAdded(false);

    trackEvent("skin_quiz_opened", {
      has_saved_result: Boolean(storedResult),
      source,
    });

    if (!storedResult) {
      trackEvent("skin_quiz_started", { source });
    }
  }, [isOpen, sessionId, source]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleDismiss("close");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDismiss, isOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleRestartQuiz() {
    clearSkinQuizDismissal();
    setAnswers({});
    setPendingResult(null);
    setResult(null);
    setStepIndex(0);
    setRoutineAdded(false);
    setStoredLead(readStoredSkinQuizLead());
    trackEvent("skin_quiz_started", { source });
  }

  const syncLeadToBackend = useCallback(async (lead: SkinQuizLead) => {
    trackEvent("skin_quiz_lead_sync_started", {
      goal: lead.quizResult.answers.goal,
      source,
    });

    const syncResult = await syncSkinQuizLeadToApi(lead, source);
    if (syncResult.ok) {
      saveSkinQuizLeadSyncStatus(true);
      trackEvent("skin_quiz_lead_sync_success", {
        goal: lead.quizResult.answers.goal,
        lead_id: syncResult.data.id,
        source,
      });
      return;
    }

    saveSkinQuizLeadSyncStatus(false);
    trackEvent("skin_quiz_lead_sync_failed", {
      goal: lead.quizResult.answers.goal,
      reason: syncResult.detail ?? syncResult.reason,
      source,
    });
  }, [source]);

  function showResult(nextResult: SkinQuizResultValue) {
    saveSkinQuizResult(nextResult);
    setPendingResult(null);
    setResult(nextResult);
    setRoutineAdded(false);
    trackEvent("skin_quiz_completed", {
      goal: nextResult.answers.goal,
      recommended_product_ids: nextResult.recommendedProductIds,
      skin_type: nextResult.answers.skinType,
    });
  }

  function handleAnswer(questionId: SkinQuizQuestionId, value: SkinQuizAnswers[SkinQuizQuestionId]) {
    const nextAnswers = {
      ...answers,
      [questionId]: value,
    } as Partial<SkinQuizAnswers>;

    trackEvent("skin_quiz_step_answered", {
      answer: String(value),
      step_id: questionId,
      step_number: stepIndex + 1,
    });

    setAnswers(nextAnswers);

    if (stepIndex === skinQuizQuestions.length - 1) {
      const completedAnswers = nextAnswers as SkinQuizAnswers;
      const nextResult = calculateSkinQuizResult(completedAnswers, products);
      const savedLead = readStoredSkinQuizLead();
      setPendingResult(nextResult);
      setStoredLead(savedLead);
      setRoutineAdded(false);
      trackEvent("skin_quiz_lead_step_viewed", {
        goal: completedAnswers.goal,
        has_saved_lead: Boolean(savedLead),
        source,
      });
      return;
    }

    setStepIndex((currentStep) => currentStep + 1);
  }

  function handleLeadCaptured(values: SkinQuizLeadValues) {
    if (!pendingResult) {
      return;
    }

    const leadInput: SkinQuizLeadInput = {
      acceptedMarketing: values.acceptedMarketing,
      email: values.email,
      name: values.name,
      whatsapp: values.whatsapp,
    };

    const lead: SkinQuizLead = {
      ...leadInput,
      createdAt: new Date().toISOString(),
      quizResult: pendingResult,
    };

    saveSkinQuizLead(lead);
    saveSkinQuizLeadSyncStatus(false);
    setStoredLead(lead);
    trackEvent("skin_quiz_lead_captured", {
      accepted_marketing: lead.acceptedMarketing,
      goal: pendingResult.answers.goal,
      has_email: lead.email.trim().length > 0,
      source,
    });
    showResult(pendingResult);
    void syncLeadToBackend(lead);
  }

  function handleLeadSkipped() {
    if (!pendingResult) {
      return;
    }

    trackEvent("skin_quiz_lead_skipped", {
      goal: pendingResult.answers.goal,
      source,
    });
    showResult(pendingResult);
  }

  function handleAddRoutineToCart() {
    if (!result) {
      return;
    }

    result.recommendedProducts.forEach((product) => {
      addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
      });
    });

    const cartTotal = result.recommendedProducts.reduce((sum, product) => sum + product.price, 0);
    trackEvent("skin_quiz_add_routine_to_cart", {
      cart_total: cartTotal,
      item_count: result.recommendedProducts.length,
      product_ids: result.recommendedProductIds,
    });

    setRoutineAdded(true);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setRoutineAdded(false);
    }, 1800);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/50 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-8"
      onClick={() => {
        handleDismiss(result ? "close" : "now_later");
      }}
      role="dialog"
    >
      <div
        className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_40px_120px_rgba(28,20,16,0.24)] lg:grid-cols-[0.9fr_1.1fr]"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <aside className="relative overflow-hidden bg-gradient-to-br from-[#fcf4ee] via-white to-[#f3e3d8] p-6 sm:p-8">
          <div className="absolute inset-x-8 top-6 h-28 rounded-full bg-[#f2cfc0] opacity-45 blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">Skin Hearten advisor</p>
                <h2 className="mt-3 font-serif text-3xl leading-tight text-stone-950 sm:text-4xl">
                  Recomendamos una rutina segun lo que tu piel necesita resolver.
                </h2>
              </div>
              <button
                className="rounded-full border border-stone-300 bg-white/80 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                onClick={() => {
                  handleDismiss(result ? "close" : "now_later");
                }}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-8 space-y-4 rounded-[1.6rem] border border-white/80 bg-white/70 p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                {result ? "Rutina lista" : isLeadStepActive ? "Ultimo paso" : `Paso ${stepIndex + 1} de ${skinQuizQuestions.length}`}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-stone-950 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm leading-7 text-stone-600">
                {result
                  ? "Tu recomendacion usa productos reales del catalogo actual y se adapta a tiempo, sensibilidad y objetivo principal."
                  : isLeadStepActive
                    ? "Comparte a donde enviarte la rutina o continua sin dejar tus datos. El flujo sigue siendo 100% frontend."
                    : "Una pregunta por pantalla, sin saturacion. Buscamos una rutina facil de seguir y alineada con tu objetivo."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Productos existentes del catalogo",
                "Rutina AM y PM segun tu tiempo",
                "Selecciones suaves si tu piel es sensible",
                "CTA para agregar toda la rutina al carrito",
              ].map((item) => (
                <div className="rounded-[1.4rem] bg-white/70 px-4 py-4 text-sm text-stone-700 shadow-soft" key={item}>
                  {item}
                </div>
              ))}
            </div>

            {!result && !isLeadStepActive ? (
              <div className="mt-auto pt-6">
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-[#d9c4b2] bg-white px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                  onClick={() => {
                    handleDismiss("now_later");
                  }}
                  type="button"
                >
                  Ahora no
                  <ArrowUpRightIcon />
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="bg-white p-5 sm:p-7 lg:p-8">
          {result ? (
            <SkinQuizResult
              addButtonLabel={routineAdded ? "Rutina agregada" : "Agregar rutina al carrito"}
              onAddRoutineToCart={handleAddRoutineToCart}
              onClose={close}
              onRestart={handleRestartQuiz}
              result={result}
              whatsappHref={getSkinQuizWhatsAppHref()}
            />
          ) : isLeadStepActive && pendingResult ? (
            <SkinQuizLeadStep
              defaultValues={storedLead ?? undefined}
              onSkip={handleLeadSkipped}
              onSubmit={handleLeadCaptured}
            />
          ) : currentQuestion ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                  Cuestionario guiado
                </p>
                <h3 className="font-serif text-3xl leading-tight text-stone-950 sm:text-4xl">
                  {currentQuestion.title}
                </h3>
                <p className="text-sm leading-7 text-stone-600 sm:text-base">
                  Elige la opcion que mejor describa tu piel hoy. Ajustaremos activos, texturas y cantidad de productos.
                </p>
              </div>

              <div className="grid gap-3">
                {currentQuestion.options.map((option) => (
                  <button
                    className={cn(
                      "rounded-[1.6rem] border border-stone-200 bg-[#fffaf7] px-5 py-5 text-left transition duration-200 hover:border-stone-400 hover:bg-white",
                      answers[currentQuestion.id] === option.value && "border-stone-950 bg-white shadow-soft",
                    )}
                    key={`${currentQuestion.id}-${option.value}`}
                    onClick={() => {
                      handleAnswer(currentQuestion.id, option.value);
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-stone-950">{option.label}</p>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{option.description}</p>
                      </div>
                      <span className="mt-1 rounded-full border border-stone-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                        Elegir
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-stone-500">
                  {stepIndex > 0 ? "Puedes volver y ajustar la respuesta anterior." : "Tus respuestas viven solo en el frontend por ahora."}
                </div>
                <div className="flex gap-3">
                  {stepIndex > 0 ? (
                    <button
                      className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                      onClick={() => {
                        setStepIndex((currentStep) => Math.max(0, currentStep - 1));
                      }}
                      type="button"
                    >
                      Atras
                    </button>
                  ) : null}
                  <button
                    className="rounded-full border border-[#d9c4b2] bg-[#fff8f3] px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:border-stone-500"
                    onClick={() => {
                      handleDismiss("now_later");
                    }}
                    type="button"
                  >
                    Ahora no
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
