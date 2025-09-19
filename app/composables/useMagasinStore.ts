import { defineStore } from "pinia";

export const useMagasinStore = defineStore("magasin", {
  state: () => ({
    magasinId: "" as string,
    magasins: [] as Array<{ id: string; nom: string; company_id: string }>,
  }),
  actions: {
    setMagasinId(id: string) {
      this.magasinId = id;
    },
    setMagasins(list: Array<{ id: string; nom: string; company_id: string }>) {
      this.magasins = list;
    },
  },
});
export type Magasin = {
  id: string;
  nom: string;
  company_id: string;
};
