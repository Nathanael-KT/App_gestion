import { createError, defineEventHandler, getQuery } from "h3";
import { requireAdmin } from "../../../utils/requireAdmin";
import { listUnpaidInvoices } from "../../../utils/qrPayment";

/**
 * Liste les factures/commandes impayées de la compagnie, sélectionnables pour
 * un encaissement par QR code. Priorise le magasin sélectionné par le caissier
 * (comme la page Factures), sinon tous les magasins de la compagnie.
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

  const query = getQuery(event);
  const magasinId = query.magasinId ? String(query.magasinId) : null;

  try {
    const invoices = await listUnpaidInvoices(adminClient, companyId, magasinId);
    return { ok: true, invoices };
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: (err as Error).message,
    });
  }
});
