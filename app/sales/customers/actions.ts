"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CustomerType } from "@/src/generated/prisma/client";
import { recordCustomer } from "@/src/application/sales/record-customer";

function customerType(value: string): CustomerType {
  const allowed = new Set(Object.values(CustomerType));
  return allowed.has(value as CustomerType)
    ? (value as CustomerType)
    : CustomerType.OTHER;
}

export async function submitCustomer(formData: FormData): Promise<void> {
  try {
    await recordCustomer({
      name: String(formData.get("name") ?? ""),
      customerType: customerType(String(formData.get("customerType") ?? "OTHER")),
      contactPerson: String(formData.get("contactPerson") ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      addressText: String(formData.get("addressText") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });

    revalidatePath("/sales");
    revalidatePath("/sales/customers");
    revalidatePath("/sales/orders");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan customer";
    redirect(`/sales/customers?error=${encodeURIComponent(message)}`);
  }

  redirect("/sales/customers?saved=1");
}
