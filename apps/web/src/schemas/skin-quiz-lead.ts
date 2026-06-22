import { z } from "zod";

export const skinQuizLeadSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre"),
  whatsapp: z
    .string()
    .trim()
    .min(8, "Ingresa un WhatsApp valido")
    .regex(/^[0-9+\s()-]+$/, "Usa solo numeros y simbolos validos"),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
      message: "Ingresa un email valido",
    }),
  acceptedMarketing: z.boolean().refine((value) => value, {
    message: "Necesitas aceptar para guardar tu contacto",
  }),
});

export type SkinQuizLeadValues = z.infer<typeof skinQuizLeadSchema>;
