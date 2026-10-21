export const paymentPlans = Object.freeze({
  single_trip: Object.freeze({ name: 'Single Trip', amountVnd: 20_000, credits: 1 }),
  plus: Object.freeze({ name: 'TripGenie Plus', amountVnd: 99_000, credits: 20 }),
  team: Object.freeze({ name: 'Team', amountVnd: 349_000, credits: 50 }),
})

export function paymentPlan(planKey) {
  return Object.hasOwn(paymentPlans, planKey) ? paymentPlans[planKey] : null
}
