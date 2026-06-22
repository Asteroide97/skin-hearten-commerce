"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { SkinQuizLeadInput } from "@/lib/skin-quiz";
import { skinQuizLeadSchema, type SkinQuizLeadValues } from "@/schemas/skin-quiz-lead";

type SkinQuizLeadStepProps = {
  defaultValues?: Partial<SkinQuizLeadInput>;
  onSkip: () => void;
  onSubmit: (values: SkinQuizLeadValues) => void;
};

export function SkinQuizLeadStep({ defaultValues, onSkip, onSubmit }: SkinQuizLeadStepProps) {
  const form = useForm<SkinQuizLeadValues>({
    resolver: zodResolver(skinQuizLeadSchema),
    defaultValues: {
      acceptedMarketing: false,
      email: defaultValues?.email ?? "",
      name: defaultValues?.name ?? "",
      whatsapp: defaultValues?.whatsapp ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      acceptedMarketing: defaultValues?.acceptedMarketing ?? false,
      email: defaultValues?.email ?? "",
      name: defaultValues?.name ?? "",
      whatsapp: defaultValues?.whatsapp ?? "",
    });
  }, [defaultValues, form]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
          Ultimo paso
        </p>
        <h3 className="font-serif text-3xl leading-tight text-stone-950 sm:text-4xl">
          A donde te enviamos tu rutina?
        </h3>
        <p className="max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
          Guarda tu recomendacion con un contacto para futuras recomendaciones de Skin Hearten. Si prefieres, puedes verla sin dejar datos.
        </p>
      </div>

      <form
        className="space-y-5 rounded-[1.8rem] border border-stone-200 bg-[#fffaf7] p-5 sm:p-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={form.formState.errors.name?.message}
            label="Nombre"
            name="name"
            placeholder="Tu nombre"
            register={form.register}
          />
          <Field
            error={form.formState.errors.whatsapp?.message}
            label="WhatsApp"
            name="whatsapp"
            placeholder="+52 55 0000 0000"
            register={form.register}
          />
          <div className="sm:col-span-2">
            <Field
              error={form.formState.errors.email?.message}
              label="Email opcional"
              name="email"
              placeholder="tu@email.com"
              register={form.register}
            />
          </div>
        </div>

        <label className="block rounded-[1.4rem] border border-stone-200 bg-white px-4 py-4">
          <div className="flex items-start gap-3">
            <input className="mt-1 h-4 w-4" type="checkbox" {...form.register("acceptedMarketing")} />
            <div>
              <p className="text-sm font-medium text-stone-900">
                Acepto recibir mi rutina y recomendaciones de Skin Hearten.
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-500">
                Guardaremos tu contacto solo en este navegador por ahora.
              </p>
            </div>
          </div>
          {form.formState.errors.acceptedMarketing?.message ? (
            <p className="mt-3 text-xs text-red-600">{form.formState.errors.acceptedMarketing.message}</p>
          ) : null}
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-stone-500">
            El email es opcional. Si quieres recibir la rutina, el WhatsApp es indispensable.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
              onClick={onSkip}
              type="button"
            >
              Saltar por ahora
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              type="submit"
            >
              Ver mi rutina
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

type FieldProps = {
  error?: string;
  label: string;
  name: keyof SkinQuizLeadValues;
  placeholder: string;
  register: ReturnType<typeof useForm<SkinQuizLeadValues>>["register"];
};

function Field({ error, label, name, placeholder, register }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-900">{label}</span>
      <input
        className="mt-3 w-full rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
        placeholder={placeholder}
        {...register(name)}
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
