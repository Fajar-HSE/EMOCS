"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { startMfaEnrollment, cancelMfaEnrollment, verifyMfaCode, unenrollMfaFactor } from "@/actions/mfa-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Factor = { id: string; factor_type: string; status: string; friendly_name?: string }

export function MfaManager({
  mfaRequired,
  currentAal,
  factors,
}: {
  mfaRequired: boolean
  currentAal: string
  factors: Factor[]
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null)
  const [code, setCode] = useState("")

  const verifiedFactor = factors.find((f) => f.status === "verified" && f.factor_type === "totp")
  const unverifiedFactor = factors.find((f) => f.status === "unverified" && f.factor_type === "totp")
  const isElevated = currentAal === "aal2"

  function handleStartEnroll() {
    startTransition(async () => {
      const result = await startMfaEnrollment()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setEnrollment({ factorId: result.factorId, qrCode: result.qrCode, secret: result.secret })
    })
  }

  function handleCancelEnroll(factorId: string) {
    startTransition(async () => {
      const result = await cancelMfaEnrollment(factorId)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal membatalkan")
        return
      }
      setEnrollment(null)
      setCode("")
      router.refresh()
    })
  }

  function handleVerify(factorId: string) {
    if (code.length !== 6) {
      toast.error("Kode harus 6 digit")
      return
    }
    startTransition(async () => {
      const result = await verifyMfaCode({ factorId, code })
      if (!result.ok) {
        toast.error(result.message ?? "Verifikasi gagal")
        return
      }
      toast.success("MFA berhasil diverifikasi")
      setEnrollment(null)
      setCode("")
      router.refresh()
    })
  }

  function handleUnenroll(factorId: string) {
    startTransition(async () => {
      const result = await unenrollMfaFactor(factorId)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menonaktifkan")
        return
      }
      toast.success("MFA dinonaktifkan")
      router.refresh()
    })
  }

  // Verified factor exists but this session hasn't completed the challenge
  // yet (aal1) -- the exact state requireAAL2() redirects here for.
  if (verifiedFactor && !isElevated) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertDescription>Verifikasi kode dari aplikasi authenticator Anda untuk melanjutkan.</AlertDescription>
        </Alert>
        <div className="grid gap-2">
          <Label htmlFor="mfa-code">Kode 6 digit</Label>
          <Input
            id="mfa-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            autoFocus
          />
        </div>
        <Button disabled={pending} onClick={() => handleVerify(verifiedFactor.id)}>
          Verifikasi
        </Button>
      </div>
    )
  }

  // Verified and this session is already aal2 -- show status + let them
  // swap devices (unenroll then re-enroll fresh).
  if (verifiedFactor && isElevated) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertDescription>MFA aktif untuk akun ini.</AlertDescription>
        </Alert>
        <Button variant="outline" disabled={pending} onClick={() => handleUnenroll(verifiedFactor.id)} className="w-fit">
          Nonaktifkan / Ganti Perangkat
        </Button>
        {mfaRequired && (
          <p className="text-muted-foreground text-xs">
            Role Anda mewajibkan MFA — setelah dinonaktifkan Anda akan diminta mengaktifkan lagi
            sebelum bisa mengakses fitur finansial.
          </p>
        )}
      </div>
    )
  }

  // Mid-enrollment: QR just generated, waiting for the first verify.
  if (enrollment) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">Pindai kode QR ini dengan aplikasi authenticator (Google Authenticator, Authy, dll):</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic data: URI from Supabase, not a static asset next/image can optimize */}
        <img src={enrollment.qrCode} alt="QR kode MFA" className="h-48 w-48 self-center" />
        <p className="text-muted-foreground text-xs">
          Atau masukkan manual: <code className="break-all">{enrollment.secret}</code>
        </p>
        <div className="grid gap-2">
          <Label htmlFor="mfa-code">Kode 6 digit dari aplikasi</Label>
          <Input
            id="mfa-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button disabled={pending} onClick={() => handleVerify(enrollment.factorId)}>
            Verifikasi & Aktifkan
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => handleCancelEnroll(enrollment.factorId)}>
            Batal
          </Button>
        </div>
      </div>
    )
  }

  // A previous enrollment attempt was left unverified — the QR/secret from
  // that attempt is gone (Supabase only returns it once, at enroll() time),
  // so the only sane option is to discard it and start fresh.
  if (unverifiedFactor) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant={mfaRequired ? "destructive" : "default"}>
          <AlertDescription>
            {mfaRequired
              ? "MFA wajib untuk role Anda dan belum selesai diaktifkan."
              : "Ada aktivasi MFA yang belum selesai."}
          </AlertDescription>
        </Alert>
        <Button variant="outline" disabled={pending} onClick={() => handleCancelEnroll(unverifiedFactor.id)} className="w-fit">
          Batalkan & Mulai Ulang
        </Button>
      </div>
    )
  }

  // Nothing enrolled at all yet.
  return (
    <div className="flex flex-col gap-4">
      <Alert variant={mfaRequired ? "destructive" : "default"}>
        <AlertDescription>
          {mfaRequired
            ? "MFA wajib untuk role Anda (Finance/Admin) sebelum mengakses fitur finansial."
            : "MFA belum aktif untuk akun ini (opsional untuk role Anda)."}
        </AlertDescription>
      </Alert>
      <Button disabled={pending} onClick={handleStartEnroll} className="w-fit">
        Aktifkan MFA
      </Button>
    </div>
  )
}
