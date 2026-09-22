"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { trainerSchema, type TrainerInput } from "@/lib/validations/master-data"
import { TRAINER_TYPE_LABELS } from "@/lib/validations/labels"
import { createTrainer, updateTrainer } from "@/actions/master-data-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export type TrainerRow = {
  id: string
  full_name: string
  trainer_type: "INTERNAL" | "ASSOCIATE" | "FREELANCE"
  city_id: string | null
  phone: string | null
  email: string | null
  rate_card: number | null
  certification_name: string | null
  certification_expires_at: string | null
}

const EMPTY: TrainerInput = {
  full_name: "",
  trainer_type: "INTERNAL",
  city_id: undefined,
  phone: "",
  email: "",
  rate_card: undefined,
  certification_name: "",
  certification_expires_at: "",
}

export function TrainerDialog({
  cities,
  trainer,
}: {
  cities: { id: string; name: string }[]
  trainer?: TrainerRow | null
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isEdit = !!trainer
  const form = useForm<TrainerInput>({
    resolver: zodResolver(trainerSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        trainer
          ? {
              full_name: trainer.full_name,
              trainer_type: trainer.trainer_type,
              city_id: trainer.city_id ?? undefined,
              phone: trainer.phone ?? "",
              email: trainer.email ?? "",
              rate_card: trainer.rate_card ?? undefined,
              certification_name: trainer.certification_name ?? "",
              certification_expires_at: trainer.certification_expires_at ?? "",
            }
          : EMPTY
      )
    }
  }, [open, trainer, form])

  async function onSubmit(values: TrainerInput) {
    const result = isEdit ? await updateTrainer(trainer!.id, values) : await createTrainer(values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan trainer")
      return
    }
    toast.success(isEdit ? "Trainer diperbarui" : "Trainer baru tersimpan")
    form.reset(EMPTY)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button size="sm" variant="ghost">
              Ubah
            </Button>
          ) : (
            <Button size="sm">+ Trainer baru</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Trainer" : "Trainer Baru"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Trainer</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trainer_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    items={(["INTERNAL", "ASSOCIATE", "FREELANCE"] as const).map((v) => ({
                      value: v,
                      label: TRAINER_TYPE_LABELS[v],
                    }))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["INTERNAL", "ASSOCIATE", "FREELANCE"] as const).map((v) => (
                        <SelectItem key={v} value={v}>
                          {TRAINER_TYPE_LABELS[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kota Domisili</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    items={cities.map((c) => ({ value: c.id, label: c.name }))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih kota" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telepon</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rate_card"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Card (IDR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="certification_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sertifikasi (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="certification_expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Berlaku s/d</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}