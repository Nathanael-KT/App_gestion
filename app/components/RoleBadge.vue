<template>
  <span
    class="inline-flex items-center rounded-full font-medium"
    :class="[sizeClasses, colorClasses]"
  >
    <UIcon
      v-if="showIcon"
      :name="roleIcon"
      :class="iconSizeClasses"
      class="mr-1"
    />
    {{ roleLabel }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  roleValue: string;
  size?: "xs" | "sm" | "md" | "lg";
  showIcon?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  showIcon: true,
});

const { getRoleLabel, getRoleIcon } = useRoles();

// Calcul des propriétés du rôle
const roleLabel = computed(() => getRoleLabel(props.roleValue));
const roleIcon = computed(() => getRoleIcon(props.roleValue));

// Classes de taille
const sizeClasses = computed(() => {
  const sizes = {
    xs: "px-2 py-1 text-xs",
    sm: "px-2.5 py-1 text-sm",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };
  return sizes[props.size];
});

// Classes de taille pour les icônes
const iconSizeClasses = computed(() => {
  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };
  return iconSizes[props.size];
});

// Classes de couleur selon le rôle
const colorClasses = computed(() => {
  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800 border border-red-200",
    magasinier: "bg-blue-100 text-blue-800 border border-blue-200",
    employe: "bg-green-100 text-green-800 border border-green-200",
  };

  return (
    roleColors[props.roleValue] ||
    "bg-gray-100 text-gray-800 border border-gray-200"
  );
});
</script>
