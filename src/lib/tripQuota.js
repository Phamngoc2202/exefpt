export function summarizeTripQuota(account) {
  if (!account) return null
  const used = Math.max(0, Number(account.generations_used) || 0)
  const bonus = Math.max(0, Number(account.bonus_generations) || 0)
  return { used, bonus, remaining: Math.max(0, 1 - used) + bonus }
}
