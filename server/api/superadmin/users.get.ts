import { createError, defineEventHandler, getQuery } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";

type Scope = "platform" | "company" | "all";

/**
 * Liste les utilisateurs visibles par le demandeur.
 * - super_admin : plateforme, compagnies, ou tous
 * - admin : uniquement sa compagnie
 */
export default defineEventHandler(async (event) => {
  const { adminClient, roles, companyId } = await requireAdmin(event, [
    "admin",
    "super_admin",
  ]);

  const isSuperAdmin = roles.includes("super_admin");
  const query = getQuery(event);
  const requestedScope = String(query.scope || "platform") as Scope;
  const scope: Scope = isSuperAdmin ? requestedScope : "company";

  let request = adminClient
    .from("users")
    .select(
      "id, auth_user_id, name, email, phone, roles, company_id, magasin_id, created_at",
    )
    .order("created_at", { ascending: false });

  if (scope === "platform") {
    request = request.contains("roles", ["super_admin"]).is("company_id", null);
  } else if (scope === "company") {
    const targetCompanyId = isSuperAdmin
      ? String(query.companyId || companyId || "")
      : companyId;

    if (!targetCompanyId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Aucune compagnie associée à cet utilisateur",
      });
    }

    request = request.eq("company_id", targetCompanyId);
  }

  const { data, error } = await request;

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message });
  }

  const users = data ?? [];
  const companyIds = [
    ...new Set(
      users
        .map((user) => user.company_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const companyNames = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies } = await adminClient
      .from("company_settings")
      .select("id, company_name")
      .in("id", companyIds);

    for (const company of companies ?? []) {
      companyNames.set(company.id, company.company_name || "Sans nom");
    }
  }

  return {
    ok: true,
    scope,
    users: users.map((user) => ({
      ...user,
      company_name: user.company_id
        ? companyNames.get(user.company_id) || null
        : null,
    })),
  };
});
