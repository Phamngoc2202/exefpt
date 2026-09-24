import { findDestination } from '../data/northernDestinations.js'

export const MAX_TRIP_DAYS = 5
export const COST_CATEGORIES = ['Di chuyển', 'Lưu trú', 'Ăn uống', 'Hoạt động']

export function activityTypeForCategory(category, preferredType = 'place') {
  if (category === 'Di chuyển') return 'transport'
  if (category === 'Lưu trú') return 'hotel'
  if (category === 'Ăn uống') return 'food'
  return preferredType === 'nature' ? 'nature' : 'place'
}

const styleEstimates = {
  'Tiết kiệm': { roomPerNight: 350000, lunchPerPerson: 70000, dinnerPerPerson: 90000 },
  'Cân bằng': { roomPerNight: 600000, lunchPerPerson: 100000, dinnerPerPerson: 130000 },
  'Cao cấp': { roomPerNight: 1200000, lunchPerPerson: 180000, dinnerPerPerson: 250000 },
}

const pad = (number) => String(number).padStart(2, '0')

export function addDays(dateString, offset) {
  const date = new Date(`${dateString}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export function countTripDays(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.floor((end - start) / 86400000) + 1
}

export function formatTripDate(dateString, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return new Intl.DateTimeFormat('vi-VN', { ...options, timeZone: 'UTC' }).format(new Date(`${dateString}T00:00:00Z`))
}

export function createDefaultForm() {
  const start = new Date()
  start.setDate(start.getDate() + 14)
  const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
  return {
    destination: 'Ninh Bình', startDate, endDate: addDays(startDate, 2), budget: 5000000,
    origin: 'Hà Nội', travelers: 2, travelWith: 'Cặp đôi',
    interests: ['Ẩm thực', 'Thiên nhiên', 'Chụp ảnh'], style: 'Cân bằng',
  }
}

export function validateTripForm(form) {
  const destination = findDestination(form.destination)
  if (!destination) return 'Hãy chọn một trong 5 điểm đến miền Bắc đang được hỗ trợ.'
  if (!form.startDate || !form.endDate) return 'Vui lòng chọn ngày bắt đầu và ngày kết thúc.'
  const days = countTripDays(form.startDate, form.endDate)
  if (days < 1) return 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'
  if (days < destination.minDays) return `${destination.city} cần ít nhất ${destination.minDays} ngày trong bản kế hoạch này.`
  if (days > MAX_TRIP_DAYS) return `Hiện TripGenie hỗ trợ tối đa ${MAX_TRIP_DAYS} ngày cho mỗi chuyến đi.`
  if (!Number.isInteger(Number(form.travelers)) || Number(form.travelers) < 1 || Number(form.travelers) > 10) {
    return 'Số người đi phải từ 1 đến 10.'
  }
  if (!Number.isFinite(Number(form.budget)) || Number(form.budget) <= 0) return 'Ngân sách phải lớn hơn 0.'
  return ''
}

function createActivity(id, time, title, category, cost, note = '', type = 'place') {
  return { id, time, title, category, cost: Math.max(0, Math.round(cost)), note, type }
}

function pickAttraction(destination, interests, day, usedTitles, remainingBudget, travelers) {
  const candidates = destination.activities.filter((activity) => !usedTitles.has(activity.title) && !usedTitles.has(activity.exclusiveWith))
  const score = (activity) =>
    activity.tags.filter((tag) => interests.includes(tag)).length * 10 - Math.abs(activity.suggestedDay - day) * 4
  candidates.sort((a, b) => score(b) - score(a) || a.costPerPerson - b.costPerPerson)
  const affordable = candidates.find((activity) => activity.costPerPerson * travelers <= remainingBudget)
  const chosen = affordable || [...candidates].sort((a, b) => a.costPerPerson - b.costPerPerson)[0]
  if (chosen) usedTitles.add(chosen.title)
  return chosen
}

export function generatePlan(form) {
  const error = validateTripForm(form)
  if (error) throw new Error(error)

  const destination = findDestination(form.destination)
  const dayCount = countTripDays(form.startDate, form.endDate)
  const travelers = Number(form.travelers)
  const rooms = Math.ceil(travelers / 2)
  const style = styleEstimates[form.style] || styleEstimates['Cân bằng']
  const transferCost = destination.transportPerPerson * travelers
  const localCost = destination.localPerPersonPerDay * travelers
  const lodgingCost = form.destination === form.origin ? 0 : style.roomPerNight * rooms
  const lunchCost = style.lunchPerPerson * travelers
  const dinnerCost = style.dinnerPerPerson * travelers
  const fixedCost = transferCost + localCost * dayCount + lodgingCost * (dayCount - 1)
    + lunchCost * dayCount + dinnerCost * (dayCount - 1)
  let attractionBudget = Math.max(0, Number(form.budget) - fixedCost - Math.round(Number(form.budget) * 0.1))
  const usedTitles = new Set()

  const days = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1
    const isFirst = index === 0
    const isLast = index === dayCount - 1
    const date = addDays(form.startDate, index)
    const activities = []

    if (isFirst && transferCost > 0) {
      activities.push(createActivity(`${date}-outbound`, '07:00', `Đi từ Hà Nội đến ${destination.city}`, 'Di chuyển', Math.round(transferCost / 2), 'Ước tính một chiều cho cả nhóm.', 'transport'))
    }
    activities.push(createActivity(`${date}-local`, isFirst ? destination.arrivalTime : '08:00', 'Di chuyển trong ngày', 'Di chuyển', localCost, 'Ước tính phương tiện tại điểm đến cho cả nhóm.', 'transport'))

    const morningAvailable = !isFirst || destination.arrivalTime < '12:00'
    if (morningAvailable) {
      const morning = pickAttraction(destination, form.interests, day, usedTitles, attractionBudget, travelers)
      if (morning) {
        const cost = morning.costPerPerson * travelers
        attractionBudget -= cost
        activities.push(createActivity(`${date}-morning`, isFirst ? '10:30' : '09:00', morning.title, 'Hoạt động', cost, morning.note || 'Chi phí tham quan ước tính cho cả nhóm.', morning.type))
      }
    }

    activities.push(createActivity(`${date}-lunch`, isFirst && !morningAvailable ? '14:15' : '12:00', 'Ăn trưa địa phương', 'Ăn uống', lunchCost, `Ước tính ${travelers} người.`, 'food'))
    const afternoon = pickAttraction(destination, form.interests, day, usedTitles, attractionBudget, travelers)
    if (afternoon) {
      const cost = afternoon.costPerPerson * travelers
      attractionBudget -= cost
      activities.push(createActivity(`${date}-afternoon`, isFirst && !morningAvailable ? '15:30' : '14:00', afternoon.title, 'Hoạt động', cost, afternoon.note || 'Chi phí tham quan ước tính cho cả nhóm.', afternoon.type))
    }

    if (!isLast) {
      activities.push(createActivity(`${date}-dinner`, '18:00', 'Ăn tối địa phương', 'Ăn uống', dinnerCost, `Ước tính ${travelers} người.`, 'food'))
      if (lodgingCost > 0) {
        activities.push(createActivity(`${date}-hotel`, '20:00', 'Lưu trú qua đêm', 'Lưu trú', lodgingCost, `Ước tính ${rooms} phòng (2 người/phòng).`, 'hotel'))
      }
    } else if (transferCost > 0) {
      activities.push(createActivity(`${date}-return`, '18:30', 'Trở về Hà Nội', 'Di chuyển', transferCost - Math.round(transferCost / 2), 'Ước tính một chiều cho cả nhóm.', 'transport'))
    }

    activities.sort((a, b) => a.time.localeCompare(b.time))
    return { day, date, label: isFirst ? 'Khởi hành và khám phá' : isLast ? 'Khám phá và trở về' : 'Khám phá theo sở thích', activities }
  })

  return { id: null, form: { ...form, travelers }, days }
}

export function summarizePlan(plan) {
  const categories = Object.fromEntries(COST_CATEGORIES.map((category) => [category, 0]))
  for (const day of plan.days) {
    for (const activity of day.activities) {
      const category = COST_CATEGORIES.includes(activity.category) ? activity.category : 'Hoạt động'
      categories[category] += Math.max(0, Number(activity.cost) || 0)
    }
  }
  const planned = Object.values(categories).reduce((sum, value) => sum + value, 0)
  const budget = Number(plan.form.budget) || 0
  const reserve = Math.round(budget * 0.1)
  const total = planned + reserve
  return { categories, planned, reserve, total, remaining: budget - total, overBudget: total > budget }
}

function legacyCost(value) {
  if (typeof value === 'number') return value
  const digits = String(value || '').replace(/[^0-9]/g, '')
  return digits ? Number(digits) : 0
}

export function planFromRow(row) {
  const stored = row.itinerary
  const isV2 = stored && !Array.isArray(stored) && stored.version === 2
  const rawDays = isV2 ? stored.days : Array.isArray(stored) ? stored : []
  const travelers = isV2 ? Number(stored.travelers) || 1 : row.travel_with === 'Một mình' ? 1 : 2
  const form = {
    destination: row.destination, startDate: row.start_date, endDate: row.end_date,
    budget: Number(row.budget), origin: isV2 ? stored.origin || 'Hà Nội' : 'Hà Nội', travelers,
    travelWith: row.travel_with || 'Cặp đôi', style: row.travel_style || 'Cân bằng', interests: row.interests || [],
  }
  const days = rawDays.map((day, index) => ({
    ...day,
    day: index + 1, date: day.date || addDays(row.start_date, index), label: day.label || 'Hành trình đã lưu',
    activities: (day.activities || []).map((activity, activityIndex) => {
      const category = activity.category || ({ food: 'Ăn uống', transport: 'Di chuyển', hotel: 'Lưu trú' }[activity.type] || 'Hoạt động')
      return {
        ...activity,
        id: activity.id || `${row.id}-${index}-${activityIndex}`,
        time: activity.time || '09:00', title: activity.title || 'Hoạt động', note: activity.note || '',
        cost: legacyCost(activity.cost), category,
        type: activityTypeForCategory(category, activity.type),
      }
    }),
  }))
  return { id: row.id, generationEventId: row.generation_event_id || null, form, days }
}

export function toTripPayload(plan, userId) {
  const { form } = plan
  return {
    user_id: userId, generation_event_id: plan.generationEventId || null,
    destination: form.destination, start_date: form.startDate, end_date: form.endDate,
    budget: form.budget, travel_with: form.travelWith, travel_style: form.style,
    interests: form.interests, itinerary: { version: 2, origin: form.origin, travelers: form.travelers, days: plan.days },
    budget_plan: summarizePlan(plan),
  }
}

export function toCreateSavedTripArgs(plan) {
  const payload = toTripPayload(plan, null)
  return {
    p_destination: payload.destination,
    p_start_date: payload.start_date,
    p_end_date: payload.end_date,
    p_budget: payload.budget,
    p_travel_with: payload.travel_with,
    p_travel_style: payload.travel_style,
    p_interests: payload.interests,
    p_itinerary: payload.itinerary,
    p_budget_plan: payload.budget_plan,
  }
}
