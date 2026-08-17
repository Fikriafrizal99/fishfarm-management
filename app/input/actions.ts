"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ExpenseCategory } from "@/src/generated/prisma/client";
import { recordDailyInput } from "@/src/application/daily-input/record-daily-input";

function parseNumber(formData: FormData, key: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${key} tidak valid`);
  return value;
}

function parseExpenseCategory(value: string): ExpenseCategory {
  const allowed = new Set<ExpenseCategory>([
    ExpenseCategory.MEDICINE,
    ExpenseCategory.PROBIOTIC,
    ExpenseCategory.ELECTRICITY,
    ExpenseCategory.WATER,
    ExpenseCategory.LABOR,
    ExpenseCategory.MAINTENANCE,
    ExpenseCategory.TRANSPORT,
    ExpenseCategory.OTHER,
  ]);

  const category = value as ExpenseCategory;
  return allowed.has(category) ? category : ExpenseCategory.OTHER;
}

export async function submitDailyInput(formData: FormData): Promise<void> {
  try {
    const cycleId = String(formData.get("cycleId") ?? "").trim();
    const eventDate = String(formData.get("eventDate") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!cycleId) throw new Error("Kolam / siklus wajib dipilih");
    if (!eventDate) throw new Error("Tanggal wajib diisi");

    const eventAt = new Date(`${eventDate}T12:00:00+07:00`);

    await recordDailyInput({
      cycleId,
      eventAt,
      feedKg: parseNumber(formData, "feedKg"),
      mortalityQty: parseNumber(formData, "mortalityQty"),
      additionalExpenseAmount: parseNumber(formData, "additionalExpenseAmount"),
      additionalExpenseCategory: parseExpenseCategory(
        String(formData.get("additionalExpenseCategory") ?? "OTHER"),
      ),
      notes,
    });

    revalidatePath("/");
    revalidatePath("/input");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan input harian";
    redirect(`/input?error=${encodeURIComponent(message)}`);
  }

  redirect("/input?saved=1");
}
