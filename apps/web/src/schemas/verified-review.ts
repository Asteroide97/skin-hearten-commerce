import { z } from "zod";

export const verifiedReviewSchema = z
  .object({
    orderNumber: z.string().trim().min(2, "Ingresa tu numero de pedido."),
    email: z
      .string()
      .trim()
      .max(255, "El email es demasiado largo.")
      .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
        message: "Ingresa un email valido.",
      }),
    phone: z.string().trim().max(40, "El WhatsApp es demasiado largo."),
    productId: z.coerce.number().int().min(1, "Selecciona un producto."),
    rating: z.number().int().min(1, "Selecciona una calificacion.").max(5),
    title: z.string().trim().max(255, "El titulo es demasiado largo."),
    body: z.string().trim().min(10, "Comparte una experiencia un poco mas completa."),
    customerName: z.string().trim().min(2, "Tu nombre visible es requerido."),
  })
  .superRefine((values, context) => {
    if (values.email.length === 0 && values.phone.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa email o WhatsApp para validar tu compra.",
        path: ["email"],
      });
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa email o WhatsApp para validar tu compra.",
        path: ["phone"],
      });
    }
  });

export type VerifiedReviewFormValues = z.infer<typeof verifiedReviewSchema>;
