"use server";

import { redirect } from "next/navigation";
import { PondStatus } from "@/src/generated/prisma/client";
import { createPond, updatePond } from "@/src/application/management/manage-production";

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalNumber(formData: FormData, name: string): number | undefined {
  const raw = text(formData, name);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function savePond(formData: FormData) {
  const pondId = text(formData, "pondId");
  try {
    if (pondId) {
      await updatePond({
        pondId,
        name: text(formData, "name") || undefined,
        pondType: text(formData, "pondType") || undefined,
        lengthM: optionalNumber(formData, "lengthM"),
        widthM: optionalNumber(formData, "widthM"),
        depthM: optionalNumber(formData, "depthM"),
        status: text(formData, "status") as PondStatus,
        notes: text(formData, "notes") || undefined,
      });
    } else {
      await createPond({
        code: text(formData, "code"),
        name: text(formData, "name") || undefined,
        pondType: text(formData, "pondType") || undefined,
        lengthM: optionalNumber(formData, "lengthM"),
        widthM: optionalNumber(formData, "widthM"),
        depthM: optionalNumber(formData, "depthM"),
        notes: text(formData, "notes") || undefined,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan kolam";
    redirect(`/ponds?error=${encodeURIComponent(message)}${pondId ? `&edit=${encodeURIComponent(pondId)}` : ""}`);
  }
  redirect("/ponds?saved=1");
}
