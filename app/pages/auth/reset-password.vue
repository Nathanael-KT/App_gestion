<template>
  <div class="min-h-screen p-2 flex items-center justify-center bg-gray-100">
    <UCard class="w-full max-w-md">
      <h2 class="text-2xl font-semibold pt-8 text-center">
        {{ isRecoveryMode ? "Nouveau mot de passe" : "Mot de passe oublie" }}
      </h2>

      <p class="text-sm text-gray-500 text-center mt-2 mb-6">
        <template v-if="isRecoveryMode">
          Saisissez votre nouveau mot de passe pour finaliser la recuperation.
        </template>
        <template v-else>
          Entrez votre email. Nous vous enverrons un lien de reinitialisation.
        </template>
      </p>

      <UForm
        v-if="!isRecoveryMode"
        :schema="emailSchema"
        :state="emailForm"
        class="space-y-4"
        @submit="sendResetLink"
      >
        <UFormField name="email" label="Email" class="w-full">
          <UInput
            v-model="emailForm.email"
            class="w-full"
            type="email"
            placeholder="votre@email.com"
          />
        </UFormField>

        <UButton
          type="submit"
          :loading="loading"
          class="w-full justify-center text-white"
          size="lg"
        >
          ENVOYER LE LIEN
        </UButton>
      </UForm>

      <UForm
        v-else
        :schema="passwordSchema"
        :state="passwordForm"
        class="space-y-4"
        @submit="updatePassword"
      >
        <UFormField name="password" label="Nouveau mot de passe" class="w-full">
          <UInput
            v-model="passwordForm.password"
            class="w-full"
            type="password"
            placeholder="Minimum 8 caracteres"
          />
        </UFormField>

        <UFormField
          name="confirmPassword"
          label="Confirmer le mot de passe"
          class="w-full"
        >
          <UInput
            v-model="passwordForm.confirmPassword"
            class="w-full"
            type="password"
            placeholder="Retapez votre mot de passe"
          />
        </UFormField>

        <UButton
          type="submit"
          :loading="loading"
          class="w-full justify-center text-white"
          size="lg"
        >
          METTRE A JOUR LE MOT DE PASSE
        </UButton>
      </UForm>

      <div class="text-center mt-4">
        <ULink
          to="/login"
          class="text-sm hover:underline"
          style="color: var(--ui-secondary)"
        >
          Retour a la connexion
        </ULink>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const supabase = useSupabaseClient();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

const loading = ref(false);
const hasRecoverySignal = ref(false);
let authSubscription: { unsubscribe: () => void } | null = null;

const emailSchema = z.object({
  email: z.string().email("Email invalide"),
});

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirmation invalide"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type EmailSchema = z.infer<typeof emailSchema>;
type PasswordSchema = z.infer<typeof passwordSchema>;

const emailForm = reactive<EmailSchema>({
  email: "",
});

const passwordForm = reactive<PasswordSchema>({
  password: "",
  confirmPassword: "",
});

const isRecoveryMode = computed(() => hasRecoverySignal.value);

function normalizeUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

function isLocalhostUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

function getResetRedirectBaseUrl() {
  const configuredSiteUrl = normalizeUrl(config.public.siteUrl || "");
  const browserOrigin = import.meta.client
    ? normalizeUrl(window.location.origin)
    : "";

  if (configuredSiteUrl && !isLocalhostUrl(configuredSiteUrl)) {
    return configuredSiteUrl;
  }

  if (browserOrigin) {
    return browserOrigin;
  }

  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  throw new Error(
    "URL publique introuvable. Configurez NUXT_PUBLIC_SITE_URL en production.",
  );
}

onMounted(async () => {
  const hash = import.meta.client ? window.location.hash : "";
  const hashParams = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash,
  );
  const hashType = hashParams.get("type");
  const authCode = typeof route.query.code === "string" ? route.query.code : "";

  if (hashType === "recovery" || route.query.type === "recovery") {
    hasRecoverySignal.value = true;
  }

  if (authCode) {
    loading.value = true;
    try {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(authCode);

      if (exchangeError) {
        toast.add({
          icon: "i-lucide-exclamation-triangle",
          title: "Lien de reinitialisation invalide",
          description: exchangeError.message,
          color: "error",
        });
      } else {
        hasRecoverySignal.value = true;
      }
    } catch (err: unknown) {
      console.error("[reset-password:exchange]", err);
      toast.add({
        icon: "i-lucide-exclamation-triangle",
        title: "Lien de reinitialisation invalide",
        description: "Impossible de verifier le lien de reinitialisation.",
        color: "error",
      });
    } finally {
      const nextQuery = { ...route.query };
      delete nextQuery.code;

      await router.replace({
        path: route.path,
        query: nextQuery,
      });
      loading.value = false;
    }
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      hasRecoverySignal.value = true;
    }
  });

  authSubscription = subscription;
});

onUnmounted(() => {
  authSubscription?.unsubscribe();
});

async function sendResetLink(event: FormSubmitEvent<EmailSchema>) {
  event.preventDefault();
  const parsed = emailSchema.safeParse(emailForm);
  if (!parsed.success) return;

  loading.value = true;
  try {
    if (!config.public.supabaseUrl || !config.public.supabaseKey) {
      toast.add({
        icon: "i-lucide-exclamation-triangle",
        title: "Configuration Supabase invalide",
        description:
          "Variables SUPABASE manquantes sur cet environnement (preview/production).",
        color: "error",
      });
      return;
    }

    const redirectBaseUrl = getResetRedirectBaseUrl();
    const redirectTo = `${redirectBaseUrl}/auth/reset-password`;
    const normalizedEmail = emailForm.email.trim().toLowerCase();

    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo,
      },
    );

    if (error) {
      toast.add({
        icon: "i-lucide-exclamation-triangle",
        title: "Envoi impossible",
        description: error.message,
        color: "error",
      });
      return;
    }

    toast.add({
      icon: "i-lucide-mail-check",
      title: "Demande envoyee",
      description:
        "Si un compte existe pour cet email, vous recevrez un lien de reinitialisation.",
      color: "success",
    });
  } catch (err: unknown) {
    console.error("[reset-password:send]", err);
    toast.add({
      icon: "i-lucide-exclamation-triangle",
      title: "Une erreur est survenue",
      description: "Impossible d'envoyer le lien de reinitialisation.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function updatePassword(event: FormSubmitEvent<PasswordSchema>) {
  event.preventDefault();
  const parsed = passwordSchema.safeParse(passwordForm);
  if (!parsed.success) return;

  loading.value = true;
  try {
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.password,
    });

    if (error) {
      toast.add({
        icon: "i-lucide-exclamation-triangle",
        title: "Mise a jour impossible",
        description: error.message,
        color: "error",
      });
      return;
    }

    toast.add({
      icon: "i-lucide-check-circle",
      title: "Mot de passe mis a jour",
      description: "Vous pouvez maintenant vous connecter.",
      color: "success",
    });

    await router.push("/login");
  } catch (err: unknown) {
    console.error("[reset-password:update]", err);
    toast.add({
      icon: "i-lucide-exclamation-triangle",
      title: "Une erreur est survenue",
      description: "Impossible de mettre a jour le mot de passe.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

definePageMeta({
  layout: false,
});
</script>
