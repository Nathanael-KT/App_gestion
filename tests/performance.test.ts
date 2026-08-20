import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  debounce,
  throttle,
  Cache,
  batchProcess,
  retryWithBackoff,
} from "../app/utils/performance";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("n'appelle la fonction qu'une seule fois après plusieurs appels rapprochés", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("réinitialise le délai à chaque nouvel appel", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(200);
    debounced(); // relance le délai avant l'expiration
    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("transmet les arguments du dernier appel", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("premier");
    debounced("dernier");
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith("dernier");
  });
});

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exécute immédiatement le premier appel", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("ignore les appels pendant la période de limitation", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("autorise un nouvel appel après expiration du délai", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    throttled();
    vi.advanceTimersByTime(300);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("Cache (TTL)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retourne la valeur mise en cache tant qu'elle n'est pas expirée", () => {
    const cache = new Cache<string>();
    cache.set("key1", "value1", 1000);

    expect(cache.get("key1")).toBe("value1");
    expect(cache.has("key1")).toBe(true);
  });

  it("retourne null pour une clé absente", () => {
    const cache = new Cache<string>();
    expect(cache.get("inconnue")).toBeNull();
  });

  it("expire la valeur après le TTL", () => {
    const cache = new Cache<string>();
    cache.set("key1", "value1", 1000);

    vi.advanceTimersByTime(1001);

    expect(cache.get("key1")).toBeNull();
    expect(cache.has("key1")).toBe(false);
  });

  it("supprime une entrée expirée du cache après lecture", () => {
    const cache = new Cache<string>();
    cache.set("key1", "value1", 1000);
    vi.advanceTimersByTime(1001);
    cache.get("key1"); // déclenche le nettoyage
    expect(cache.size()).toBe(0);
  });

  it("clear() supprime une entrée spécifique", () => {
    const cache = new Cache<string>();
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear("a");

    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBe("2");
  });

  it("clearAll() vide tout le cache", () => {
    const cache = new Cache<string>();
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clearAll();

    expect(cache.size()).toBe(0);
  });
});

describe("batchProcess", () => {
  it("découpe les éléments en lots de la taille demandée", async () => {
    const items = [1, 2, 3, 4, 5];
    const batches: number[][] = [];

    await batchProcess(items, 2, async (batch) => {
      batches.push(batch);
      return batch.length;
    });

    expect(batches).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("retourne le résultat de chaque lot traité", async () => {
    const items = [1, 2, 3, 4];
    const results = await batchProcess(items, 2, async (batch) =>
      batch.reduce((a, b) => a + b, 0)
    );

    expect(results).toEqual([3, 7]); // (1+2), (3+4)
  });

  it("gère un tableau vide sans erreur", async () => {
    const results = await batchProcess([], 3, async (batch) => batch.length);
    expect(results).toEqual([]);
  });
});

describe("retryWithBackoff", () => {
  it("retourne le résultat dès le premier succès", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, 3, 1);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("réessaie après un échec puis réussit", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("ok");

    const result = await retryWithBackoff(fn, 3, 1);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("lève la dernière erreur après épuisement des tentatives", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("échec persistant"));

    await expect(retryWithBackoff(fn, 2, 1)).rejects.toThrow(
      "échec persistant"
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
