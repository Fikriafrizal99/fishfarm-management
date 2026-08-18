"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ExpenseCategory } from "@/src/generated/prisma/client";
import { recordDailyInput } from "@/src/application/daily-input/record-daily-input";
import { evaluateCycleAlerts } from "@/src/application/decision/evaluate-cycle-alerts";

function parseCategory(value: string): ExpenseCategory {
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

export async function submitExpense(formData: FormData): Promise<void> {
  let cycleId = "";

  try {
    cycleId = String(formData.get("cycleId") ?? "").trim();
    const eventDate = String(formData.get("eventDate") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const rawAmount = String(formData.get("amount") ?? "").trim();
    const amount = Number(rawAmount);

    if (!cycleId) throw new Error("Kolam / siklus wajib dipilih");
    if (!eventDate) throw new Error("Tanggal biaya wajib diisi");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nominal biaya harus lebih dari 0");

    await recordDailyInput({
      cycleId,
      eventAt: new Date(`${eventDate}T12:00:00+07:00`),
      feedKg: 0,
      mortalityQty: 0,
      additionalExpenseAmount: amount,
      additionalExpenseCategory: parseCategory(String(formData.get("category") ?? "OTHER")),
      notes,
    });

    try {
      await evaluateCycleAlerts(cycleId);
    } catch (decisionError) {
      console.error("Decision Engine evaluation failed after expense input", decisionError);
    }

    revalidatePath("/");
    revalidatePath("/budidaya");
    revalidatePath("/expenses");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan biaya";
    const cycleQuery = cycleId ? `&cycleId=${encodeURIComponent(cycleId)}` : "";
    redirect(`/expenses?error=${encodeURIComponent(message)}${cycleQuery}`);
  }

  redirect(`/expenses?saved=1${cycleId ? `&cycleId=${encodeURIComponent(cycleId)}` : ""}`);
}
