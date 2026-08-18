import { InvoiceStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface RecordInvoiceCommand {
  salesOrderId: string;
  issueDate: Date;
  dueDate?: Date;
  subtotalAmount?: number;
  adjustmentAmount?: number;
  notes?: string;
}

function dateCode(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function recordInvoice(command: RecordInvoiceCommand) {
  if (Number.isNaN(command.issueDate.getTime())) throw new Error("Tanggal invoice tidak valid");
  if (command.dueDate && Number.isNaN(command.dueDate.getTime())) throw new Error("Jatuh tempo tidak valid");
  if (command.subtotalAmount !== undefined && (!Number.isFinite(command.subtotalAmount) || command.subtotalAmount <= 0)) {
    throw new Error("Subtotal invoice harus lebih besar dari 0");
  }
  if (command.adjustmentAmount !== undefined && !Number.isFinite(command.adjustmentAmount)) {
    throw new Error("Adjustment invoice tidak valid");
  }

  return db.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: command.salesOrderId },
      include: { items: true, invoices: true },
    });
    if (!order) throw new Error("Sales order tidak ditemukan");
    if (order.status === "CANCELLED") throw new Error("Order yang dibatalkan tidak dapat ditagihkan");

    const orderValue = order.items.reduce(
      (sum, item) => sum + Number(item.quantityKg) * Number(item.unitPricePerKg),
      0,
    );
    const alreadyInvoiced = order.invoices
      .filter((invoice) => invoice.status !== InvoiceStatus.VOID)
      .reduce((sum, invoice) => sum + Number(invoice.subtotalAmount), 0);
    const remainingInvoiceable = Math.max(orderValue - alreadyInvoiced, 0);
    if (remainingInvoiceable <= 0) throw new Error("Nilai order sudah seluruhnya ditagihkan");

    const subtotalAmount = command.subtotalAmount ?? remainingInvoiceable;
    if (subtotalAmount > remainingInvoiceable + 0.01) {
      throw new Error(`Subtotal melebihi sisa nilai order (${remainingInvoiceable.toFixed(0)})`);
    }
    const adjustmentAmount = command.adjustmentAmount ?? 0;
    const totalAmount = subtotalAmount + adjustmentAmount;
    if (totalAmount < 0) throw new Error("Total invoice tidak boleh negatif");

    const dailyCount = await tx.invoice.count({
      where: {
        farmId: order.farmId,
        invoiceNumber: { startsWith: `INV-${dateCode(command.issueDate)}-` },
      },
    });
    const invoiceNumber = `INV-${dateCode(command.issueDate)}-${String(dailyCount + 1).padStart(3, "0")}`;

    return tx.invoice.create({
      data: {
        farmId: order.farmId,
        salesOrderId: order.id,
        invoiceNumber,
        status: InvoiceStatus.ISSUED,
        issueDate: command.issueDate,
        dueDate: command.dueDate,
        subtotalAmount,
        adjustmentAmount,
        totalAmount,
        notes: command.notes?.trim() || undefined,
      },
      include: { salesOrder: true },
    });
  });
}

export async function voidInvoice(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) throw new Error("Invoice tidak ditemukan");
  const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  if (paid > 0) throw new Error("Invoice yang sudah memiliki pembayaran tidak dapat di-VOID");

  return db.invoice.update({
    where: { id: invoice.id },
    data: { status: InvoiceStatus.VOID },
  });
}
