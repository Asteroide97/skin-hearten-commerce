import { z } from "zod";

export const checkoutSchema = z.object({
  firstName: z.string().min(2, "Ingresa tu nombre"),
  lastName: z.string().min(2, "Ingresa tus apellidos"),
  email: z.string().email("Ingresa un correo valido"),
  phone: z.string().min(8, "Ingresa un telefono valido"),
  addressLine1: z.string().min(5, "Ingresa tu direccion"),
  city: z.string().min(2, "Ingresa tu ciudad"),
  state: z.string().min(2, "Ingresa tu estado"),
  postalCode: z.string().min(5, "Ingresa tu codigo postal"),
  paymentMethod: z.enum(["mercadopago", "paypal", "stripe"]),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;

