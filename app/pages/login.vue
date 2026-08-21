<template>
  <div class="min-h-screen p-2 flex items-center justify-center bg-gray-100">
    <UCard class="w-full max-w-md">
      <h2 class="text-2xl font-semibold pt-8 text-center">Connexion</h2>

      <UForm
        v-slot="slotProps"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSubmit"
      >
        <!-- Email Field -->
        <UFormField
          name="email"
          label="Email"
          class="w-full"
          :error="getError(slotProps?.errors, 'email')"
        >
          <UInput
            v-model="form.email"
            class="w-full"
            type="email"
            placeholder="votre@email.com"
          />
        </UFormField>
        <!-- Password Field -->
        <UFormField
          name="password"
          label="Mot de passe"
          class="w-full"
          :error="getError(slotProps?.errors, 'password')"
        >
          <UInput
            v-model="form.password"
            class="w-full"
            type="password"
            placeholder=""
          />
        </UFormField>

        <!-- Submit Button -->
        <div class="mt-4">
          <UButton
            type="submit"
            :loading="submitting"
            :disabled="!!lockedUntil && lockRemainingSeconds > 0"
            class="w-full justify-center text-white"
            size="lg"
          >
            {{
              lockedUntil && lockRemainingSeconds > 0
                ? `Réessayez dans ${lockRemainingSeconds}s`
                : "SE CONNECTER"
            }}
          </UButton>
        </div>
       

        <!-- Forgot Password Link -->
        <div class="text-center mt-2">
          <ULink
            to="/auth/reset-password"
            class="text-sm hover:underline"
            style="color: var(--ui-secondary)"
          >
            Mot de passe oublié ?
          </ULink>
        </div>

        <!-- Privacy Policy / Terms -->
        <p class="mt-6 text-xs text-gray-500 text-center">
          En vous connectant, vous acceptez nos
          <ULink
            to="/assets/conditions_utilisation.pdf"
            target="_blank"
            class="underline"
          >
            Conditions d'utilisation
          </ULink>
          et notre
          <ULink
            to="/assets/politique_confidentialite.pdf"
            target="_blank"
            class="underline"
          >
            Politique de confidentialité </ULink
          >.
        </p>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { z } from "zod";
import { useSupabaseClient } from "#imports";
import type { FormError, FormSubmitEvent } from "@nuxt/ui";

const supabase = useSupabaseClient();
const toast = useToast();
const router = useRouter();
const submitting = ref(false);

// 1) Zod schema for validation
const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});
type Schema = z.infer<typeof schema>;

// 2) Reactive form state
const form = reactive<Schema>({
  email: "",
  password: "",
});

// Helper to extract field errors from UForm
function getError(errors: FormError<string>[] | undefined, field: string) {
  if (!errors) return undefined;
  const errObj = errors.find((e) => e.name === field);
  return errObj?.message;
}

// Protection anti-brute-force côté client : verrouillage temporaire et
// progressif après plusieurs échecs de connexion consécutifs. Vient en
// complément du rate-limiting Supabase Auth côté serveur (voir ticket
// sécurité dédié).
const MAX_ATTEMPTS_BEFORE_LOCK = 5;
const failedAttempts = ref(0);
const lockedUntil = ref<number | null>(null);
const lockRemainingSeconds = ref(0);
let lockTimer: ReturnType<typeof setInterval> | null = null;

function lockoutDurationSeconds(attemptNumber: number) {
  // Délai progressif : 30s, 60s, 120s, 240s... (plafonné à 5 min)
  const base = 30 * Math.pow(2, attemptNumber - MAX_ATTEMPTS_BEFORE_LOCK);
  return Math.min(base, 300);
}

function startLockCountdown(seconds: number) {
  lockedUntil.value = Date.now() + seconds * 1000;
  lockRemainingSeconds.value = seconds;
  if (lockTimer) clearInterval(lockTimer);
  lockTimer = setInterval(() => {
    const remaining = Math.ceil(
      ((lockedUntil.value ?? 0) - Date.now()) / 1000
    );
    if (remaining <= 0) {
      lockRemainingSeconds.value = 0;
      lockedUntil.value = null;
      if (lockTimer) clearInterval(lockTimer);
    } else {
      lockRemainingSeconds.value = remaining;
    }
  }, 1000);
}

async function handleSubmit(event: FormSubmitEvent<Schema>) {
  event.preventDefault();

  if (lockedUntil.value && Date.now() < lockedUntil.value) {
    toast.add({
      icon: "i-lucide-lock",
      title: `Trop de tentatives. Réessayez dans ${lockRemainingSeconds.value}s`,
      color: "error",
    });
    return;
  }

  const parsed = schema.safeParse(form);
  if (!parsed.success) {
    // UForm automatically shows the errors
    return;
  }

  submitting.value = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      failedAttempts.value += 1;

      if (failedAttempts.value >= MAX_ATTEMPTS_BEFORE_LOCK) {
        const seconds = lockoutDurationSeconds(failedAttempts.value);
        startLockCountdown(seconds);
        toast.add({
          icon: "i-lucide-lock",
          title: `Trop de tentatives échouées. Compte verrouillé ${seconds}s`,
          color: "error",
        });
        return;
      }

      if (error.status === 400) {
        const remaining = MAX_ATTEMPTS_BEFORE_LOCK - failedAttempts.value;
        toast.add({
          icon: "i-lucide-exclamation-triangle",
          title: "Email ou mot de passe incorrect",
          description:
            remaining <= 2
              ? `${remaining} tentative(s) restante(s) avant verrouillage temporaire`
              : undefined,
          color: "error",
        });
      } else {
        toast.add({
          icon: "i-lucide-exclamation-triangle",
          title: "Une erreur est survenue lors de la connexion",
          color: "error",
        });
      }
      return;
    }

    // Connexion réussie : réinitialiser le compteur de tentatives.
    failedAttempts.value = 0;
    // On success, redirect to stock listing (ou une autre page)
    toast.add({
      icon: "i-lucide-check-circle",
      title: "Connecté avec succès !",
      color: "success",
    });
    await router.push("/");
  } catch (err: unknown) {
    console.error("[login]", err);
    toast.add({
      icon: "i-lucide-exclamation-triangle",
      title: "Impossible de se connecter, réessayez plus tard",
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}

definePageMeta({
  layout: false,
});
</script>
