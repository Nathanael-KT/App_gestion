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
            class="w-full justify-center text-white"
            size="lg"
          >
            SE CONNECTER
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

async function handleSubmit(event: FormSubmitEvent<Schema>) {
  event.preventDefault();
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
      if (error.status === 400) {
        toast.add({
          icon: "i-lucide-exclamation-triangle",
          title: "Email ou mot de passe incorrect",
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
