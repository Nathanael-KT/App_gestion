<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
  import { setupRouteGuard } from "@/guards/routeGuard";

setupRouteGuard(router);

</template>
