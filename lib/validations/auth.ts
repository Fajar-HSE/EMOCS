import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
})
export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// PRD §12.2.1: "Password policy: Min 10 karakter"
export const resetPasswordSchema = z
  .object({
    password: z.string().min(10, "Password minimal 10 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
