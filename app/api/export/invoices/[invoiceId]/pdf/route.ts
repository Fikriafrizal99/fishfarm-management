import { db } from "@/src/lib/db";
import { createSimplePdf, pdfDownload } from "@/src/application/exporting/pdf-document";
import { safeFilename } from "@/src/application/exporting/csv";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
): Promise<Response> {
  const { invoiceId } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      farm: true,
      salesOrder: {
        include: {
          customer: true,
          items: { include: { species: true } },
        },
      },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });
  if (!invoice) return new Response("Invoice tidak ditemukan", { status: 404 });

  const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = Math.max(Number(invoice.totalAmount) - paid, 0);
  const orderValue = invoice.salesOrder.items.reduce(
    (sum, item) => sum + Number(item.quantityKg) * Number(item.unitPricePerKg),
    0,
  );
  const itemRows = invoice.salesOrder.items.map((item) => ({
    label: item.species.commonName,
    value: `${number1.format(Number(item.quantityKg))} kg x ${currency.format(Number(item.unitPricePerKg))}/kg = ${currency.format(Number(item.quantityKg) * Number(item.unitPricePerKg))}`,
  }));

  const paymentRows = invoice.payments.length > 0
    ? invoice.payments.map((payment) => ({
        label: date.format(payment.paidAt),
        value: `${currency.format(Number(payment.amount))} - ${payment.method}${payment.reference ? ` - ${payment.reference}` : ""}`,
      }))
    : [{ label: "Pembayaran", value: "Belum ada pembayaran" }];

  const bytes = await createSimplePdf({
    title: `Invoice ${invoice.invoiceNumber}`,
    subtitle: `${invoice.salesOrder.customer.name} - ${invoice.salesOrder.orderNumber}`,
    meta: [
      `Tanggal invoice: ${date.format(invoice.issueDate)}`,
      `Jatuh tempo: ${invoice.dueDate ? date.format(invoice.dueDate) : "-"}`,
      `Status: ${invoice.status}`,
    ],
    sections: [
      {
        title: "Customer",
        rows: [
          { label: "Nama", value: invoice.salesOrder.customer.name, emphasis: true },
          { label: "Contact person", value: invoice.salesOrder.customer.contactPerson ?? "-" },
          { label: "WhatsApp", value: invoice.salesOrder.customer.whatsapp ?? invoice.salesOrder.customer.phone ?? "-" },
          { label: "Alamat", value: invoice.salesOrder.customer.addressText ?? "-" },
        ],
      },
      {
        title: "Referensi Sales Order",
        rows: [
          ...itemRows,
          { label: "Nilai Sales Order", value: currency.format(orderValue) },
          { label: "Catatan billing", value: "Daftar item di atas adalah referensi Sales Order. Subtotal invoice dapat berupa penagihan parsial." },
        ],
      },
      {
        title: "Nilai Tagihan",
        rows: [
          { label: "Subtotal invoice", value: currency.format(Number(invoice.subtotalAmount)) },
          { label: "Adjustment", value: currency.format(Number(invoice.adjustmentAmount)) },
          { label: "Total invoice", value: currency.format(Number(invoice.totalAmount)), emphasis: true },
          { label: "Sudah dibayar", value: currency.format(paid) },
          { label: "Piutang", value: currency.format(outstanding), emphasis: true },
        ],
      },
      { title: "Riwayat Pembayaran", rows: paymentRows },
      {
        title: "Catatan",
        rows: [{ label: "Invoice", value: invoice.notes ?? invoice.salesOrder.paymentTerms ?? "-" }],
      },
    ],
    footer: "Dokumen invoice dihasilkan dari billing snapshot FishFarm Management.",
  });

  return pdfDownload(bytes, `${safeFilename(invoice.invoiceNumber)}.pdf`);
}
