import { createError, defineEventHandler } from "h3";
import { requireAdmin } from "../../../utils/requireAdmin";
import { listUnpaidInvoices } from "../../../utils/qrPayment";

/**
 * Liste les factures/commandes impayées de la compagnie, sélectionnables pour
 * un encaissement par QR code.
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId } = await requireAdmin(event, [
    "admin",
    "employe",
    "super_admin",
  ]);
  if (!companyId) {
    throw createError({ statusCode: 400, statusMessage: "Aucune compagnie associée" });
  }
  const invoices = await listUnpaidInvoices(adminClient, companyId);
  return { ok: true, invoices };
});
