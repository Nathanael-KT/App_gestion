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
import { computed, onMounted, reactive, ref } from "vue";
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const supabase = useSupabaseClient();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

const loading = ref(false);
const hasRecoverySignal = ref(false);

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

onMounted(() => {
  const hash = import.meta.client ? window.location.hash : "";
  const hashParams = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash,
  );
  const hashType = hashParams.get("type");

  if (hashType === "recovery" || route.query.type === "recovery") {
    hasRecoverySignal.value = true;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      hasRecoverySignal.value = true;
    }
  });

  onUnmounted(() => {
    subscription.unsubscribe();
  });
});

async function sendResetLink(event: FormSubmitEvent<EmailSchema>) {
  event.preventDefault();
  const parsed = emailSchema.safeParse(emailForm);
  if (!parsed.success) return;

  loading.value = true;
  try {
    const siteUrl =
      config.public.siteUrl ||
      (import.meta.client ? window.location.origin : "");
    const redirectTo = `${siteUrl.replace(/\/$/, "")}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      emailForm.email,
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
      title: "Email envoye",
      description:
        "Consultez votre boite mail pour reinitialiser le mot de passe.",
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
