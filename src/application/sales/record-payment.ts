import { InvoiceStatus, PaymentMethod } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface RecordPaymentCommand {
  invoiceId: string;
  paidAt: Date;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export async function recordPayment(command: RecordPaymentCommand) {
  if (Number.isNaN(command.paidAt.getTime())) throw new Error("Tanggal pembayaran tidak valid");
  if (!Number.isFinite(command.amount) || command.amount <= 0) {
    throw new Error("Nominal pembayaran harus lebih besar dari 0");
  }

  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: command.invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new Error("Invoice tidak ditemukan");
    if (invoice.status === InvoiceStatus.DRAFT) throw new Error("Invoice DRAFT belum dapat menerima pembayaran");
    if (invoice.status === InvoiceStatus.VOID) throw new Error("Invoice VOID tidak dapat menerima pembayaran");
    if (invoice.status === InvoiceStatus.PAID) throw new Error("Invoice sudah lunas");

    const paidBefore = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalAmount = Number(invoice.totalAmount);
    const outstanding = Math.max(totalAmount - paidBefore, 0);
    if (command.amount > outstanding + 0.01) {
      throw new Error(`Pembayaran melebihi sisa piutang (${outstanding.toFixed(0)})`);
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        paidAt: command.paidAt,
        amount: command.amount,
        method: command.method,
        reference: command.reference?.trim() || undefined,
        notes: command.notes?.trim() || undefined,
      },
    });

    const paidAfter = paidBefore + command.amount;
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status:
          paidAfter + 0.01 >= totalAmount
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIALLY_PAID,
      },
    });

    return payment;
  });
}
