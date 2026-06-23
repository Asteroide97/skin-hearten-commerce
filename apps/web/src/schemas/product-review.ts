import { z } from "zod";

export const productReviewSchema = z.object({
  body: z
    .string()
    .trim()
    .min(10, "Comparte al menos una breve experiencia con el producto."),
  customerEmail: z
    .string()
    .trim()
    .max(255, "El email es demasiado largo.")
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
      message: "Ingresa un email valido.",
    }),
  customerName: z.string().trim().min(2, "Tu nombre es requerido."),
  rating: z.number().int().min(1, "Selecciona una calificacion.").max(5),
  title: z.string().trim().max(255, "El titulo es demasiado largo."),
});

export type ProductReviewFormValues = z.infer<typeof productReviewSchema>;
