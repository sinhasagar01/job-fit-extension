const STORAGE_KEY = 'usageCounter';
const MAX_CHECKS = 5;

interface UsageRecord {
  count: number;
  date: string;
}

function todayKey(): string {
  return new Date().toLocaleDateString();
}

export async function getRemainingChecks(): Promise<number> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const record = result[STORAGE_KEY] as UsageRecord | undefined;
  if (!record || record.date !== todayKey()) {
    await browser.storage.local.set({ [STORAGE_KEY]: { count: MAX_CHECKS, date: todayKey() } });
    return MAX_CHECKS;
  }
  return record.count;
}

export async function decrementCheck(): Promise<number> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const record = result[STORAGE_KEY] as UsageRecord | undefined;
  const base = !record || record.date !== todayKey() ? MAX_CHECKS : record.count;
  const newCount = Math.max(0, base - 1);
  await browser.storage.local.set({ [STORAGE_KEY]: { count: newCount, date: todayKey() } });
  return newCount;
}

export async function exhaustChecks(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: { count: 0, date: todayKey() } });
}

export async function resetChecks(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
}
