<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { TablesUpdate } from "~~/types/database.types";

type SubscriptionStatus = "actif" | "en_attente" | "bloque" | "inactif";
type SubscriptionPatch = TablesUpdate<"company_subscription">;

interface SubscriptionRow {
  id?: string;
  company_id?: string | null;
  is_paid?: boolean | null;
  status?: string | null;
  last_payment_date?: string | null;
  next_due_date?: string | null;
  plan_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface PlanRow {
  id: string;
  name?: string | null;
  slug?: string | null;
}

interface StripeSyncResultItem {
  companyId: string;
  stripeSubscriptionId: string | null;
  stripeStatus: string | null;
  action: string;
  detail?: string;
}

interface StripeSyncSummary {
  total: number;
  activated: number;
  pastDue: number;
  deactivated: number;
  withoutStripe: number;
  errors: number;
}

interface CompanyRow {
  id: string;
  company_name?: string | null;
  company_email?: string | null;
  blocked?: boolean | null;
  company_subscription?: SubscriptionRow[] | null;
}

interface CompanySubscriptionItem {
  id: string;
  companyName: string;
  companyEmail: string;
  companyBlocked: boolean;
  subscriptionId: string | null;
  isPaid: boolean;
  status: SubscriptionStatus;
  lastPaymentDate: string | null;
  nextDueDate: string | null;
  planName: string | null;
  stripeLinked: boolean;
  daysToDue: number | null;
  isOverdue: boolean;
}

type AlertSeverity = "info" | "warning" | "critical";

interface SubscriptionAlert {
  id: string;
  companyId: string;
  companyName: string;
  message: string;
  severity: AlertSeverity;
  createdAt: string;
}

interface ActionLog {
  id: string;
  companyId: string;
  companyName: string;
  action: string;
  details: string;
  actor: string;
  createdAt: string;
}

definePageMeta({
  middleware: "auth",
});

const supabase = useSupabaseClient();
const router = useRouter();
const toast = useToast();
const { userRoles, isLoadingUser, loadCurrentUser } = useCurrentUser();

const loading = ref(false);
const items = ref<CompanySubscriptionItem[]>([]);
const selectedCompanyId = ref<string | null>(null);
const selectedIds = ref<string[]>([]);
const actionLoadingId = ref<string | null>(null);

const search = ref("");
const statusFilter = ref<"all" | SubscriptionStatus>("all");
const dueOnly7Days = ref(false);
const sortBy = ref<"company" | "status" | "due" | "payment">("company");
const sortDirection = ref<"asc" | "desc">("asc");

const extensionAmount = ref(1);
const extensionUnit = ref<"semaines" | "mois">("mois");
const customDueDate = ref("");
const autoAlertEnabled = ref(true);
const runningAlertScan = ref(false);
const lastAlertScanAt = ref<string | null>(null);
const alerts = ref<SubscriptionAlert[]>([]);
const logs = ref<ActionLog[]>([]);
const plansById = ref<Map<string, PlanRow>>(new Map());
const stripeSyncing = ref(false);
const lastStripeSyncAt = ref<string | null>(null);
const stripeSyncSummary = ref<StripeSyncSummary | null>(null);
const stripeSyncResults = ref<StripeSyncResultItem[]>([]);

let alertInterval: ReturnType<typeof setInterval> | null = null;

const ALERT_STORAGE_KEY = "superadmin_subscription_alerts_v1";
const LOG_STORAGE_KEY = "superadmin_subscription_logs_v1";
const ALERT_TARGET_DAYS = [7, 3, 1, 0];

const statusMeta: Record<SubscriptionStatus, { label: string; badge: string }> =
  {
    actif: { label: "Actif", badge: "bg-emerald-100 text-emerald-700" },
    en_attente: { label: "En attente", badge: "bg-amber-100 text-amber-700" },
    bloque: { label: "Bloque", badge: "bg-red-100 text-red-700" },
    inactif: { label: "Inactif", badge: "bg-slate-100 text-slate-700" },
  };

const asDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toISODate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const diffInDays = (from: Date, to: Date): number => {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const normalizeStatus = (
  rawStatus: string | null | undefined,
  isPaid: boolean,
  dueDate: string | null,
): SubscriptionStatus => {
  if (
    rawStatus === "actif" ||
    rawStatus === "en_attente" ||
    rawStatus === "bloque" ||
    rawStatus === "inactif"
  ) {
    return rawStatus;
  }

  const due = asDate(dueDate);
  const now = new Date();

  if (isPaid && due && diffInDays(now, due) >= 0) return "actif";
  if (isPaid && due && diffInDays(now, due) < 0) return "en_attente";
  if (!isPaid && due) return "en_attente";
  return "inactif";
};

const computeDueDateForActivation = (months = 1): string => {
  const now = new Date();
  const baseMonth = now.getDate() >= 28 ? now.getMonth() + 1 : now.getMonth();
  const due = new Date(now.getFullYear(), baseMonth + (months - 1), 28);
  return toISODate(due);
};

const pickLatestSubscription = (
  subs?: SubscriptionRow[] | null,
): SubscriptionRow | null => {
  if (!Array.isArray(subs) || subs.length === 0) return null;
  const sorted = [...subs].sort((a, b) => {
    const ad = asDate(a.updated_at || a.created_at)?.getTime() ?? 0;
    const bd = asDate(b.updated_at || b.created_at)?.getTime() ?? 0;
    return bd - ad;
  });
  return sorted[0] || null;
};

const notify = (
  title: string,
  description: string,
  color: "success" | "error" | "warning" = "success",
) => {
  toast.add({ title, description, color });
};

const loadStoredState = () => {
  if (!import.meta.client) return;

  try {
    const rawAlerts = window.localStorage.getItem(ALERT_STORAGE_KEY);
    const rawLogs = window.localStorage.getItem(LOG_STORAGE_KEY);

    if (rawAlerts) {
      const parsedAlerts = JSON.parse(rawAlerts) as SubscriptionAlert[];
      alerts.value = Array.isArray(parsedAlerts)
        ? parsedAlerts.slice(0, 100)
        : [];
    }

    if (rawLogs) {
      const parsedLogs = JSON.parse(rawLogs) as ActionLog[];
      logs.value = Array.isArray(parsedLogs) ? parsedLogs.slice(0, 200) : [];
    }
  } catch {
    alerts.value = [];
    logs.value = [];
  }
};

const persistState = () => {
  if (!import.meta.client) return;
  window.localStorage.setItem(
    ALERT_STORAGE_KEY,
    JSON.stringify(alerts.value.slice(0, 100)),
  );
  window.localStorage.setItem(
    LOG_STORAGE_KEY,
    JSON.stringify(logs.value.slice(0, 200)),
  );
};

const recordAction = (companyId: string, action: string, details: string) => {
  const item = items.value.find((it) => it.id === companyId);
  const actor = userRoles.value.includes("super_admin")
    ? "super_admin"
    : "admin";

  const entry: ActionLog = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    companyId,
    companyName:
      companyId === "-"
        ? "Toutes les compagnies"
        : item?.companyName || "Compagnie inconnue",
    action,
    details,
    actor,
    createdAt: new Date().toISOString(),
  };

  logs.value = [entry, ...logs.value].slice(0, 200);
  persistState();
};

const computeAlerts = (): SubscriptionAlert[] => {
  const now = new Date();
  const generated: SubscriptionAlert[] = [];

  for (const item of items.value) {
    if (item.companyBlocked || item.status === "bloque") {
      generated.push({
        id: `blocked_${item.id}`,
        companyId: item.id,
        companyName: item.companyName,
        message: "Compagnie actuellement bloquee.",
        severity: "critical",
        createdAt: now.toISOString(),
      });
      continue;
    }

    if (typeof item.daysToDue !== "number") continue;

    if (item.daysToDue < 0) {
      generated.push({
        id: `late_${item.id}`,
        companyId: item.id,
        companyName: item.companyName,
        message: `Echeance depassee de ${Math.abs(item.daysToDue)} jour(s).`,
        severity: "critical",
        createdAt: now.toISOString(),
      });
      continue;
    }

    if (ALERT_TARGET_DAYS.includes(item.daysToDue)) {
      const severity: AlertSeverity =
        item.daysToDue <= 1 ? "critical" : "warning";
      generated.push({
        id: `due_${item.id}_${item.daysToDue}`,
        companyId: item.id,
        companyName: item.companyName,
        message: `Echeance dans ${item.daysToDue} jour(s).`,
        severity,
        createdAt: now.toISOString(),
      });
    }
  }

  return generated;
};

const runAlertScan = (silent = false) => {
  if (runningAlertScan.value) return;
  runningAlertScan.value = true;

  const generated = computeAlerts();
  const previousIds = new Set(alerts.value.map((a) => a.id));
  const nextIds = new Set(generated.map((a) => a.id));
  const newAlerts = generated.filter((a) => !previousIds.has(a.id));

  alerts.value = generated.slice(0, 100);
  lastAlertScanAt.value = new Date().toISOString();
  persistState();

  if (!silent && newAlerts.length > 0) {
    notify(
      "Alertes detectees",
      `${newAlerts.length} nouvelle(s) alerte(s) abonnement identifiee(s).`,
      "warning",
    );
  }

  if (!silent && alerts.value.length === 0 && nextIds.size === 0) {
    notify("Scan termine", "Aucune alerte active detectee.", "success");
  }

  runningAlertScan.value = false;
};

const clearAlerts = () => {
  alerts.value = [];
  persistState();
};

const severityBadge = (severity: AlertSeverity) => {
  if (severity === "critical") return "bg-red-100 text-red-700";
  if (severity === "warning") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
};

const toCsvCell = (
  value: string | number | boolean | null | undefined,
): string => {
  const raw = value === null || value === undefined ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
};

const exportCsv = () => {
  const rows = sortedFilteredItems.value;
  const header = [
    "company_id",
    "company_name",
    "company_email",
    "plan",
    "stripe_linked",
    "status",
    "is_paid",
    "company_blocked",
    "last_payment_date",
    "next_due_date",
    "days_to_due",
    "is_overdue",
  ];

  const lines = [header.map(toCsvCell).join(";")];

  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.companyName,
        row.companyEmail,
        row.planName,
        row.stripeLinked,
        row.status,
        row.isPaid,
        row.companyBlocked,
        row.lastPaymentDate,
        row.nextDueDate,
        row.daysToDue,
        row.isOverdue,
      ]
        .map(toCsvCell)
        .join(";"),
    );
  }

  const content = `\uFEFF${lines.join("\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `abonnements_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  notify(
    "Export termine",
    `${rows.length} ligne(s) exportee(s) en CSV.`,
    "success",
  );
};

const rebuildViewModel = (rows: CompanyRow[]) => {
  const now = new Date();

  items.value = rows.map((row) => {
    const latestSub = pickLatestSubscription(row.company_subscription);
    const isPaid = latestSub?.is_paid === true;
    const nextDueDate = latestSub?.next_due_date || null;
    const status = normalizeStatus(latestSub?.status, isPaid, nextDueDate);
    const due = asDate(nextDueDate);
    const daysToDue = due ? diffInDays(now, due) : null;

    const plan = latestSub?.plan_id
      ? plansById.value.get(latestSub.plan_id)
      : null;

    return {
      id: row.id,
      companyName: row.company_name || "Compagnie sans nom",
      companyEmail: row.company_email || "-",
      companyBlocked: row.blocked === true,
      subscriptionId: latestSub?.id || null,
      isPaid,
      status,
      lastPaymentDate: latestSub?.last_payment_date || null,
      nextDueDate,
      planName: plan?.name || null,
      stripeLinked: !!latestSub?.stripe_subscription_id,
      daysToDue,
      isOverdue: typeof daysToDue === "number" && daysToDue < 0,
    };
  });

  if (!selectedCompanyId.value && items.value.length > 0) {
    const first = items.value[0];
    if (first) selectedCompanyId.value = first.id;
  }
};

const fetchPlans = async () => {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, slug");

  if (error) return;

  const map = new Map<string, PlanRow>();
  for (const plan of (data as PlanRow[]) || []) {
    map.set(plan.id, plan);
  }
  plansById.value = map;
};

const fetchCompanies = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("company_settings")
    .select(
      "*, company_subscription(id, company_id, is_paid, status, last_payment_date, next_due_date, plan_id, stripe_customer_id, stripe_subscription_id, created_at, updated_at)",
    )
    .order("company_name", { ascending: true });

  loading.value = false;

  if (error) {
    notify(
      "Erreur",
      error.message || "Impossible de charger les abonnements",
      "error",
    );
    return;
  }

  rebuildViewModel(Array.isArray(data) ? (data as CompanyRow[]) : []);
};

// Synchronisation à la demande avec Stripe (issue #89) : vérifie que les
// paiements mensuels passent bien et réconcilie la base automatiquement.
const syncWithStripe = async () => {
  if (stripeSyncing.value) return;
  stripeSyncing.value = true;
  try {
    const { data: sessionResp } = await supabase.auth.getSession();
    const token = sessionResp.session?.access_token;

    const res = await $fetch<{
      success: boolean;
      summary: StripeSyncSummary;
      results: StripeSyncResultItem[];
    }>("/api/superadmin/sync-stripe-subscriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    stripeSyncSummary.value = res.summary;
    stripeSyncResults.value = res.results;
    lastStripeSyncAt.value = new Date().toISOString();

    recordAction(
      "-",
      "stripe_sync",
      `Sync Stripe: ${res.summary.activated} actif(s), ${res.summary.pastDue} en retard, ${res.summary.deactivated} résilié(s)`,
    );
    notify(
      "Synchronisation Stripe terminée",
      `${res.summary.activated} abonnement(s) confirmé(s) payé(s), ${res.summary.pastDue} en retard, ${res.summary.deactivated} résilié(s).`,
      res.summary.pastDue > 0 || res.summary.errors > 0 ? "warning" : "success",
    );
    await fetchCompanies();
  } catch (err) {
    notify(
      "Erreur de synchronisation",
      err instanceof Error ? err.message : "Impossible de contacter Stripe",
      "error",
    );
  } finally {
    stripeSyncing.value = false;
  }
};

const getSubscriptionByCompany = async (
  companyId: string,
): Promise<SubscriptionRow | null> => {
  const { data, error } = await supabase
    .from("company_subscription")
    .select(
      "id, company_id, is_paid, status, last_payment_date, next_due_date, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    notify(
      "Erreur",
      error.message || "Impossible de lire l'abonnement",
      "error",
    );
    return null;
  }

  const row = Array.isArray(data) ? data[0] : null;
  return row ? (row as SubscriptionRow) : null;
};

const upsertSubscription = async (
  companyId: string,
  patch: SubscriptionPatch,
): Promise<boolean> => {
  const existing = await getSubscriptionByCompany(companyId);

  if (existing?.id) {
    const { error } = await supabase
      .from("company_subscription")
      .update(patch)
      .eq("id", existing.id);

    if (error) {
      notify("Erreur", error.message || "Mise a jour impossible", "error");
      return false;
    }

    return true;
  }

  const { error } = await supabase.from("company_subscription").insert([
    {
      company_id: companyId,
      ...patch,
    },
  ]);

  if (error) {
    notify(
      "Erreur",
      error.message || "Creation abonnement impossible",
      "error",
    );
    return false;
  }

  return true;
};

const setCompanyBlocked = async (
  companyId: string,
  blocked: boolean,
  reason: "manual" | "subscription" | null = null,
): Promise<boolean> => {
  const { error } = await supabase
    .from("company_settings")
    .update({
      blocked,
      blocked_reason: blocked ? reason : null,
    })
    .eq("id", companyId);

  if (error) {
    notify(
      "Erreur",
      error.message || "Impossible de mettre a jour le blocage compagnie",
      "error",
    );
    return false;
  }

  return true;
};

const activateSubscription = async (companyId: string, months = 1) => {
  actionLoadingId.value = companyId;
  const now = toISODate(new Date());
  const success = await upsertSubscription(companyId, {
    is_paid: true,
    status: "actif",
    last_payment_date: now,
    next_due_date: computeDueDateForActivation(months),
  });

  if (success) {
    recordAction(
      companyId,
      "activate",
      `Activation abonnement (${months} mois)`,
    );
    await setCompanyBlocked(companyId, false);
    notify(
      "Abonnement active",
      "Le paiement a ete enregistre avec succes.",
      "success",
    );
    await fetchCompanies();
  }

  actionLoadingId.value = null;
};

const markPending = async (companyId: string) => {
  actionLoadingId.value = companyId;
  const success = await upsertSubscription(companyId, {
    is_paid: false,
    status: "en_attente",
  });

  if (success) {
    recordAction(companyId, "pending", "Passage en statut en attente");
    notify(
      "Abonnement en attente",
      "Le statut a ete passe en attente.",
      "warning",
    );
    await fetchCompanies();
  }

  actionLoadingId.value = null;
};

const blockForNonPayment = async (companyId: string) => {
  actionLoadingId.value = companyId;
  const successSub = await upsertSubscription(companyId, {
    is_paid: false,
    status: "bloque",
  });
  // Raison "subscription" : ce blocage est lié au paiement, il sera levé
  // automatiquement dès que l'entreprise régularisera (webhook/cron).
  const successCompany = await setCompanyBlocked(
    companyId,
    true,
    "subscription",
  );

  if (successSub && successCompany) {
    recordAction(companyId, "block", "Blocage pour impaye");
    notify("Compagnie bloquee", "Blocage applique pour impaye.", "warning");
    await fetchCompanies();
  }

  actionLoadingId.value = null;
};

const unblockCompany = async (companyId: string) => {
  actionLoadingId.value = companyId;
  const success = await setCompanyBlocked(companyId, false);
  if (success) {
    recordAction(companyId, "unblock", "Deblocage manuel compagnie");
    notify("Compagnie debloquee", "Le blocage global a ete retire.", "success");
    await fetchCompanies();
  }
  actionLoadingId.value = null;
};

// Octroi d'une période gratuite (semaines ou mois) — privilège réservé au
// super_admin (issue #89). Donne un accès complet jusqu'à la nouvelle
// échéance, sans paiement Stripe.
const grantFreePeriod = async (
  companyId: string,
  amount: number,
  unit: "semaines" | "mois",
) => {
  if (!Number.isFinite(amount) || amount < 1) {
    notify(
      "Valeur invalide",
      "La duree offerte doit etre superieure ou egale a 1.",
      "error",
    );
    return;
  }

  actionLoadingId.value = companyId;
  const existing = await getSubscriptionByCompany(companyId);
  const now = new Date();
  // Si une échéance future existe déjà, on prolonge à partir d'elle,
  // sinon à partir d'aujourd'hui.
  const existingDue = asDate(existing?.next_due_date);
  const base = existingDue && existingDue > now ? existingDue : now;
  const due = new Date(base.getTime());
  if (unit === "mois") {
    due.setMonth(due.getMonth() + amount);
  } else {
    due.setDate(due.getDate() + amount * 7);
  }

  const success = await upsertSubscription(companyId, {
    is_paid: true,
    status: "actif",
    next_due_date: toISODate(due),
  });

  if (success) {
    const unitLabel = unit === "mois" ? "mois" : "semaine(s)";
    recordAction(
      companyId,
      "free_grant",
      `${amount} ${unitLabel} offert(s) par le super_admin (jusqu'au ${toISODate(due)})`,
    );
    await setCompanyBlocked(companyId, false);
    notify(
      "Periode gratuite accordee",
      `Acces offert jusqu'au ${formatDate(toISODate(due))}.`,
      "success",
    );
    await fetchCompanies();
  }

  actionLoadingId.value = null;
};

const setCustomDueDate = async (companyId: string, date: string) => {
  if (!date) {
    notify("Date manquante", "Selectionnez une date d'echeance.", "error");
    return;
  }

  actionLoadingId.value = companyId;
  const success = await upsertSubscription(companyId, {
    status: "actif",
    is_paid: true,
    next_due_date: date,
    last_payment_date: toISODate(new Date()),
  });

  if (success) {
    recordAction(companyId, "custom_due_date", `Nouvelle echeance: ${date}`);
    await setCompanyBlocked(companyId, false);
    notify(
      "Echeance mise a jour",
      "La date d'echeance a ete enregistree.",
      "success",
    );
    await fetchCompanies();
  }

  actionLoadingId.value = null;
};

const toggleSelection = (companyId: string, checked: boolean) => {
  if (checked) {
    selectedIds.value = [...new Set([...selectedIds.value, companyId])];
  } else {
    selectedIds.value = selectedIds.value.filter((id) => id !== companyId);
  }
};

const clearSelection = () => {
  selectedIds.value = [];
};

const activateSelected = async () => {
  if (selectedIds.value.length === 0) return;
  for (const id of selectedIds.value) {
    await activateSubscription(id, 1);
  }
  clearSelection();
};

const blockSelected = async () => {
  if (selectedIds.value.length === 0) return;
  for (const id of selectedIds.value) {
    await blockForNonPayment(id);
  }
  clearSelection();
};

const selectedItem = computed(() => {
  if (!selectedCompanyId.value) return null;
  return (
    items.value.find((item) => item.id === selectedCompanyId.value) || null
  );
});

const sortedFilteredItems = computed(() => {
  const text = search.value.trim().toLowerCase();

  const filtered = items.value.filter((item) => {
    const matchesText =
      !text ||
      item.companyName.toLowerCase().includes(text) ||
      item.companyEmail.toLowerCase().includes(text);

    const matchesStatus =
      statusFilter.value === "all" || item.status === statusFilter.value;

    const matchesDue =
      !dueOnly7Days.value ||
      (typeof item.daysToDue === "number" &&
        item.daysToDue >= 0 &&
        item.daysToDue <= 7);

    return matchesText && matchesStatus && matchesDue;
  });

  const dir = sortDirection.value === "asc" ? 1 : -1;

  return filtered.sort((a, b) => {
    if (sortBy.value === "company") {
      return a.companyName.localeCompare(b.companyName) * dir;
    }
    if (sortBy.value === "status") {
      return a.status.localeCompare(b.status) * dir;
    }
    if (sortBy.value === "due") {
      const av = a.daysToDue ?? Number.POSITIVE_INFINITY;
      const bv = b.daysToDue ?? Number.POSITIVE_INFINITY;
      return (av - bv) * dir;
    }
    const ad = asDate(a.lastPaymentDate)?.getTime() ?? 0;
    const bd = asDate(b.lastPaymentDate)?.getTime() ?? 0;
    return (ad - bd) * dir;
  });
});

const dashboardStats = computed(() => {
  const total = items.value.length;
  const active = items.value.filter((i) => i.status === "actif").length;
  const pending = items.value.filter((i) => i.status === "en_attente").length;
  const blocked = items.value.filter(
    (i) => i.status === "bloque" || i.companyBlocked,
  ).length;
  const dueSoon = items.value.filter(
    (i) =>
      typeof i.daysToDue === "number" && i.daysToDue >= 0 && i.daysToDue <= 7,
  ).length;

  return { total, active, pending, blocked, dueSoon };
});

const formatDate = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("fr-FR");
};

const formatDueLabel = (item: CompanySubscriptionItem): string => {
  if (!item.nextDueDate) return "-";
  if (typeof item.daysToDue !== "number") return formatDate(item.nextDueDate);
  if (item.daysToDue < 0) return `Retard ${Math.abs(item.daysToDue)} j`;
  if (item.daysToDue === 0) return "Aujourd'hui";
  return `Dans ${item.daysToDue} j`;
};

onMounted(async () => {
  loadStoredState();

  if (isLoadingUser.value) {
    await loadCurrentUser();
  }

  if (!userRoles.value.includes("super_admin")) {
    notify(
      "Acces refuse",
      "Cette page est reservee aux super administrateurs.",
      "error",
    );
    await router.replace("/");
    return;
  }

  await fetchPlans();
  await fetchCompanies();
  runAlertScan(true);

  alertInterval = setInterval(() => {
    if (autoAlertEnabled.value) {
      runAlertScan(true);
    }
  }, 60_000);
});

onUnmounted(() => {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
});

watch(
  () => items.value,
  () => {
    if (autoAlertEnabled.value) {
      runAlertScan(true);
    }
  },
  { deep: true },
);
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div>
        <h1 class="text-3xl font-black text-slate-900">
          Pilotage des abonnements
        </h1>
        <p class="text-slate-600 mt-1">
          Espace superadmin pour suivre les paiements Stripe, filtrer,
          corriger et operer les abonnements des compagnies.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
          :disabled="loading || stripeSyncing"
          title="Verifie les paiements mensuels directement aupres de Stripe et met a jour les statuts"
          @click="syncWithStripe"
        >
          <svg
            v-if="stripeSyncing"
            class="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          {{ stripeSyncing ? "Sync en cours..." : "Synchroniser Stripe" }}
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
          :disabled="loading || sortedFilteredItems.length === 0"
          @click="exportCsv"
        >
          Export CSV
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
          :disabled="loading || runningAlertScan"
          @click="runAlertScan()"
        >
          Scanner alertes
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
          :disabled="loading"
          @click="fetchCompanies"
        >
          Actualiser
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-900">Alertes automatiques</h2>
          <div class="flex items-center gap-2">
            <label
              class="inline-flex items-center gap-2 text-sm text-slate-600"
            >
              <input
                v-model="autoAlertEnabled"
                type="checkbox"
                class="rounded border-slate-300"
              />
              Auto-scan
            </label>
            <button
              class="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
              @click="clearAlerts"
            >
              Vider
            </button>
          </div>
        </div>

        <p class="text-xs text-slate-500">
          Dernier scan:
          {{ lastAlertScanAt ? formatDate(lastAlertScanAt) : "Jamais" }}
        </p>

        <div v-if="alerts.length === 0" class="text-sm text-slate-500 py-2">
          Aucune alerte active.
        </div>

        <div v-else class="space-y-2 max-h-64 overflow-auto pr-1">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="rounded-lg border border-slate-200 p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="font-semibold text-slate-900 text-sm">
                {{ alert.companyName }}
              </p>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="severityBadge(alert.severity)"
              >
                {{ alert.severity }}
              </span>
            </div>
            <p class="text-sm text-slate-600 mt-1">{{ alert.message }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 class="text-lg font-bold text-slate-900">Journal des actions</h2>

        <div v-if="logs.length === 0" class="text-sm text-slate-500 py-2">
          Aucune action administrative recente.
        </div>

        <div v-else class="space-y-2 max-h-64 overflow-auto pr-1">
          <div
            v-for="entry in logs"
            :key="entry.id"
            class="rounded-lg border border-slate-200 p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="font-semibold text-slate-900 text-sm">
                {{ entry.companyName }}
              </p>
              <span class="text-xs text-slate-500">{{
                formatDate(entry.createdAt)
              }}</span>
            </div>
            <p class="text-sm text-slate-700 mt-1">
              {{ entry.action }} - {{ entry.details }}
            </p>
            <p class="text-xs text-slate-500 mt-1">Acteur: {{ entry.actor }}</p>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="stripeSyncSummary"
      class="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-bold text-indigo-900">
          Derniere synchronisation Stripe
        </h2>
        <div class="flex items-center gap-3">
          <p class="text-xs text-indigo-700">
            {{
              lastStripeSyncAt
                ? new Date(lastStripeSyncAt).toLocaleString("fr-FR")
                : ""
            }}
          </p>
          <button
            class="text-xs px-2 py-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800"
            @click="stripeSyncSummary = null"
          >
            Masquer
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 text-sm">
        <span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800">
          {{ stripeSyncSummary.activated }} paye(s) / actif(s)
        </span>
        <span class="px-2 py-1 rounded bg-amber-100 text-amber-800">
          {{ stripeSyncSummary.pastDue }} paiement(s) en retard
        </span>
        <span class="px-2 py-1 rounded bg-red-100 text-red-800">
          {{ stripeSyncSummary.deactivated }} resilie(s)
        </span>
        <span class="px-2 py-1 rounded bg-slate-100 text-slate-700">
          {{ stripeSyncSummary.withoutStripe }} sans lien Stripe
        </span>
        <span
          v-if="stripeSyncSummary.errors > 0"
          class="px-2 py-1 rounded bg-red-200 text-red-900"
        >
          {{ stripeSyncSummary.errors }} erreur(s)
        </span>
      </div>
      <div class="max-h-48 overflow-auto space-y-1 pr-1">
        <div
          v-for="result in stripeSyncResults"
          :key="result.companyId"
          class="text-xs bg-white/70 rounded px-3 py-2 flex justify-between gap-2"
        >
          <span class="font-medium text-slate-800 truncate">
            {{
              items.find((it) => it.id === result.companyId)?.companyName ||
              result.companyId
            }}
            <span
              v-if="result.stripeStatus"
              class="text-slate-500 font-normal"
            >
              — Stripe: {{ result.stripeStatus }}</span
            >
          </span>
          <span class="text-slate-500 shrink-0">{{ result.detail }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs uppercase tracking-wide text-slate-500">Compagnies</p>
        <p class="text-2xl font-bold text-slate-900">
          {{ dashboardStats.total }}
        </p>
      </div>
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p class="text-xs uppercase tracking-wide text-emerald-700">Actifs</p>
        <p class="text-2xl font-bold text-emerald-900">
          {{ dashboardStats.active }}
        </p>
      </div>
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p class="text-xs uppercase tracking-wide text-amber-700">En attente</p>
        <p class="text-2xl font-bold text-amber-900">
          {{ dashboardStats.pending }}
        </p>
      </div>
      <div class="rounded-xl border border-red-200 bg-red-50 p-4">
        <p class="text-xs uppercase tracking-wide text-red-700">Bloques</p>
        <p class="text-2xl font-bold text-red-900">
          {{ dashboardStats.blocked }}
        </p>
      </div>
      <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <p class="text-xs uppercase tracking-wide text-indigo-700">
          Echeance 7 jours
        </p>
        <p class="text-2xl font-bold text-indigo-900">
          {{ dashboardStats.dueSoon }}
        </p>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher compagnie ou email"
          class="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-300 outline-none"
        />
        <select
          v-model="statusFilter"
          class="px-3 py-2 rounded-lg border border-slate-300 bg-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="en_attente">En attente</option>
          <option value="bloque">Bloque</option>
          <option value="inactif">Inactif</option>
        </select>
        <select
          v-model="sortBy"
          class="px-3 py-2 rounded-lg border border-slate-300 bg-white"
        >
          <option value="company">Tri: Compagnie</option>
          <option value="status">Tri: Statut</option>
          <option value="due">Tri: Echeance</option>
          <option value="payment">Tri: Dernier paiement</option>
        </select>
        <select
          v-model="sortDirection"
          class="px-3 py-2 rounded-lg border border-slate-300 bg-white"
        >
          <option value="asc">Ordre croissant</option>
          <option value="desc">Ordre decroissant</option>
        </select>
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            v-model="dueOnly7Days"
            type="checkbox"
            class="rounded border-slate-300"
          />
          Echeance sous 7 jours
        </label>
      </div>

      <div
        v-if="selectedIds.length > 0"
        class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100"
      >
        <span class="text-sm text-slate-600"
          >{{ selectedIds.length }} selection(s)</span
        >
        <button
          class="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          @click="activateSelected"
        >
          Activer selection
        </button>
        <button
          class="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
          @click="blockSelected"
        >
          Bloquer selection
        </button>
        <button
          class="px-3 py-1.5 rounded-md bg-slate-200 text-slate-800 text-sm hover:bg-slate-300"
          @click="clearSelection"
        >
          Vider selection
        </button>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div
        v-if="loading"
        class="h-28 flex items-center justify-center text-slate-500"
      >
        Chargement...
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left">
                <input type="checkbox" disabled />
              </th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">
                Compagnie
              </th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">
                Offre
              </th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">
                Statut
              </th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">
                Blocage global
              </th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">
                Dernier paiement
              </th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">
                Prochaine echeance
              </th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in sortedFilteredItems"
              :key="item.id"
              class="border-b border-slate-100 hover:bg-slate-50"
              @click="selectedCompanyId = item.id"
            >
              <td class="px-4 py-3">
                <input
                  :checked="selectedIds.includes(item.id)"
                  type="checkbox"
                  @click.stop
                  @change="
                    toggleSelection(
                      item.id,
                      ($event.target as HTMLInputElement).checked,
                    )
                  "
                />
              </td>
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-900">
                  {{ item.companyName }}
                </p>
                <p class="text-xs text-slate-500">{{ item.companyEmail }}</p>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1">
                  <span class="text-sm font-medium text-slate-800">
                    {{ item.planName || "Aucune offre" }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-medium w-fit"
                    :class="
                      item.stripeLinked
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-600'
                    "
                  >
                    {{ item.stripeLinked ? "Stripe" : "Manuel" }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="statusMeta[item.status].badge"
                >
                  {{ statusMeta[item.status].label }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="
                    item.companyBlocked
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  "
                >
                  {{ item.companyBlocked ? "Bloquee" : "Active" }}
                </span>
              </td>
              <td class="px-4 py-3">{{ formatDate(item.lastPaymentDate) }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-col">
                  <span>{{ formatDate(item.nextDueDate) }}</span>
                  <span
                    class="text-xs"
                    :class="item.isOverdue ? 'text-red-600' : 'text-slate-500'"
                  >
                    {{ formatDueLabel(item) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2" @click.stop>
                  <button
                    class="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    :disabled="actionLoadingId === item.id"
                    @click="activateSubscription(item.id, 1)"
                  >
                    Activer
                  </button>
                  <button
                    class="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                    :disabled="actionLoadingId === item.id"
                    @click="markPending(item.id)"
                  >
                    Attente
                  </button>
                  <button
                    class="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    :disabled="actionLoadingId === item.id"
                    @click="blockForNonPayment(item.id)"
                  >
                    Bloquer
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="sortedFilteredItems.length === 0">
              <td colspan="8" class="px-4 py-8 text-center text-slate-500">
                Aucun abonnement ne correspond aux filtres.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="selectedItem"
      class="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div
        class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4"
      >
        <div>
          <h2 class="text-xl font-bold text-slate-900">Actions avancees</h2>
          <p class="text-slate-600 text-sm">
            {{ selectedItem.companyName }} - operations de maintenance de
            l'abonnement.
          </p>
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-2 rounded-md bg-slate-900 text-white text-sm hover:bg-slate-800"
            :disabled="actionLoadingId === selectedItem.id"
            @click="unblockCompany(selectedItem.id)"
          >
            Debloquer compagnie
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-lg border border-slate-200 p-4 space-y-3">
          <h3 class="font-semibold text-slate-900">Periode gratuite</h3>
          <p class="text-xs text-slate-500">
            Privilege super_admin : offre un acces complet (sans paiement
            Stripe) pour la duree choisie. L'echeance est prolongee d'autant.
          </p>
          <div class="flex items-center gap-2 flex-wrap">
            <input
              v-model.number="extensionAmount"
              type="number"
              min="1"
              class="w-24 px-3 py-2 rounded-md border border-slate-300"
            />
            <select
              v-model="extensionUnit"
              class="px-3 py-2 rounded-md border border-slate-300 bg-white"
            >
              <option value="semaines">semaine(s)</option>
              <option value="mois">mois</option>
            </select>
            <button
              class="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
              :disabled="actionLoadingId === selectedItem.id"
              @click="
                grantFreePeriod(
                  selectedItem.id,
                  extensionAmount,
                  extensionUnit,
                )
              "
            >
              Accorder gratuitement
            </button>
          </div>
        </div>

        <div class="rounded-lg border border-slate-200 p-4 space-y-3">
          <h3 class="font-semibold text-slate-900">Echeance personnalisee</h3>
          <div class="flex items-center gap-2">
            <input
              v-model="customDueDate"
              type="date"
              class="px-3 py-2 rounded-md border border-slate-300"
            />
            <button
              class="px-3 py-2 rounded-md bg-cyan-600 text-white text-sm hover:bg-cyan-700"
              :disabled="actionLoadingId === selectedItem.id"
              @click="setCustomDueDate(selectedItem.id, customDueDate)"
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
