import { findDestination } from '../data/northernDestinations.js'
import { findDeparturePoint } from '../data/departurePoints.js'

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
    interests: ['Ẩm thực', 'Thiên nhiên', 'Chụp ảnh'], style: 'Cân bằng', specialRequest: '',
  }
}

export function validateTripForm(form) {
  const destination = findDestination(form.destination)
  if (!destination) return 'Hãy chọn một trong 5 điểm đến miền Bắc đang được hỗ trợ.'
  if (!findDeparturePoint(form.origin)) return 'Hãy chọn một điểm xuất phát đang được TripGenie hỗ trợ.'
  if (!form.startDate || !form.endDate) return 'Vui lòng chọn ngày bắt đầu và ngày kết thúc.'
  const days = countTripDays(form.startDate, form.endDate)
  if (days < 1) return 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'
  if (days < destination.minDays) return `${destination.city} cần ít nhất ${destination.minDays} ngày trong bản kế hoạch này.`
  if (days > MAX_TRIP_DAYS) return `Hiện TripGenie hỗ trợ tối đa ${MAX_TRIP_DAYS} ngày cho mỗi chuyến đi.`
  if (!Number.isInteger(Number(form.travelers)) || Number(form.travelers) < 1 || Number(form.travelers) > 10) {
    return 'Số người đi phải từ 1 đến 10.'
  }
  if (!Number.isFinite(Number(form.budget)) || Number(form.budget) <= 0) return 'Ngân sách phải lớn hơn 0.'
  if (String(form.specialRequest || '').length > 500) return 'Yêu cầu riêng không được vượt quá 500 ký tự.'
  return ''
}

function createActivity(id, time, title, category, cost, note = '', type = 'place', metadata = {}) {
  return { id, time, title, category, cost: Math.max(0, Math.round(cost)), note, type, ...metadata }
}

function distanceInKm(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180
  const earthRadius = 6371
  const latitudeDelta = radians(to.lat - from.lat)
  const longitudeDelta = radians(to.lng - from.lng)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function estimateTransferPerPerson(originName, destination) {
  if (!destination || originName === destination.city) return 0
  const origin = findDeparturePoint(originName)
  const hanoi = findDeparturePoint('Hà Nội')
  if (!origin || !destination.coordinates) return destination?.transportPerPerson || 0

  const distance = distanceInKm(origin.coordinates, destination.coordinates)
  const hanoiDistance = distanceInKm(hanoi.coordinates, destination.coordinates)
  const calibratedRate = destination.transportPerPerson > 0 && hanoiDistance > 20
    ? destination.transportPerPerson / hanoiDistance
    : 3000
  return Math.max(100000, Math.round(distance * calibratedRate / 50000) * 50000)
}

function pickAttraction(destination, interests, day, usedTitles, remainingBudget, travelers, preferredTitles = [], excludedTitles = new Set()) {
  const candidates = destination.activities.filter((activity) => !usedTitles.has(activity.title) && !usedTitles.has(activity.exclusiveWith) && !excludedTitles.has(activity.title))
  const score = (activity) => {
    const preferredIndex = preferredTitles.indexOf(activity.title)
    const preferredScore = preferredIndex < 0 ? 0 : 1000 - preferredIndex * 10
    return preferredScore + activity.tags.filter((tag) => interests.includes(tag)).length * 10 - Math.abs(activity.suggestedDay - day) * 4
  }
  candidates.sort((a, b) => score(b) - score(a) || a.costPerPerson - b.costPerPerson)
  const affordable = candidates.find((activity) => activity.costPerPerson * travelers <= remainingBudget)
  const chosen = affordable || [...candidates].sort((a, b) => a.costPerPerson - b.costPerPerson)[0]
  if (chosen) usedTitles.add(chosen.title)
  return chosen
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function findRequestedActivityTitles(specialRequest, destination) {
  const normalizedRequest = normalizeSearchText(specialRequest)
  if (!normalizedRequest || !destination?.activities) return []

  return destination.activities
    .map((activity) => {
      const positions = [activity.title, ...(activity.aliases || [])]
        .map((name) => normalizedRequest.indexOf(normalizeSearchText(name)))
        .filter((position) => position >= 0)
      return positions.length ? { title: activity.title, position: Math.min(...positions) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.position - b.position)
    .map(({ title }) => title)
}

export function inferRequestedActivitiesByDay(specialRequest, destination, dayCount) {
  const normalizedRequest = normalizeSearchText(specialRequest)
  if (!normalizedRequest || !destination?.activities) return {}
  const matches = destination.activities
    .map((activity) => {
      const positions = [activity.title, ...(activity.aliases || [])]
        .map((name) => normalizedRequest.indexOf(normalizeSearchText(name)))
        .filter((position) => position >= 0)
      return positions.length ? { title: activity.title, position: Math.min(...positions) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.position - b.position)
  const result = {}
  matches.forEach((match, index) => {
    const segment = normalizedRequest.slice(match.position, matches[index + 1]?.position ?? normalizedRequest.length)
    const requestedDay = Number(segment.match(/\bngay(?: thu)?\s*(\d+)\b/)?.[1])
    if (!Number.isInteger(requestedDay) || requestedDay < 1 || requestedDay > dayCount) return
    result[requestedDay] ||= []
    result[requestedDay].push(match.title)
  })
  return result
}

export function generatePlan(form, options = {}) {
  const error = validateTripForm(form)
  if (error) throw new Error(error)

  const baseDestination = findDestination(form.destination)
  const additionalActivities = Array.isArray(options.additionalActivities) ? options.additionalActivities : []
  const destination = { ...baseDestination, activities: [...additionalActivities, ...baseDestination.activities] }
  const dayCount = countTripDays(form.startDate, form.endDate)
  const travelers = Number(form.travelers)
  const rooms = Math.ceil(travelers / 2)
  const style = styleEstimates[form.style] || styleEstimates['Cân bằng']
  const transferCost = estimateTransferPerPerson(form.origin, destination) * travelers
  const localCost = destination.localPerPersonPerDay * travelers
  const lodgingCost = form.destination === form.origin ? 0 : style.roomPerNight * rooms
  const lunchCost = style.lunchPerPerson * travelers
  const dinnerCost = style.dinnerPerPerson * travelers
  const fixedCost = transferCost + localCost * dayCount + lodgingCost * (dayCount - 1)
    + lunchCost * dayCount + dinnerCost * (dayCount - 1)
  let attractionBudget = Math.max(0, Number(form.budget) - fixedCost - Math.round(Number(form.budget) * 0.1))
  const usedTitles = new Set()
  const requestedTitles = findRequestedActivityTitles(form.specialRequest, destination)
  for (const activity of additionalActivities) {
    if (!requestedTitles.includes(activity.title)) requestedTitles.push(activity.title)
  }
  const inferredRequestedActivitiesByDay = inferRequestedActivitiesByDay(form.specialRequest, destination, dayCount)
  const requestedActivitiesByDay = { ...inferredRequestedActivitiesByDay }
  for (const [day, titles] of Object.entries(options.requestedActivitiesByDay || {})) {
    requestedActivitiesByDay[day] = [...new Set([...(requestedActivitiesByDay[day] || []), ...titles])]
  }
  const datedRequestedTitles = new Set(Object.values(requestedActivitiesByDay).flat())
  const undatedRequestedTitles = requestedTitles.filter((title) => !datedRequestedTitles.has(title))

  const days = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1
    const requestedToday = requestedActivitiesByDay[day] || []
    const preferredTitles = [...requestedToday, ...undatedRequestedTitles, ...(options.preferredActivitiesByDay?.[day] || [])]
    const reservedForOtherDays = new Set([...datedRequestedTitles].filter((title) => !requestedToday.includes(title)))
    const isFirst = index === 0
    const isLast = index === dayCount - 1
    const date = addDays(form.startDate, index)
    const activities = []

    if (isFirst && transferCost > 0) {
      activities.push(createActivity(`${date}-outbound`, '07:00', `Đi từ ${form.origin} đến ${destination.city}`, 'Di chuyển', Math.round(transferCost / 2), 'Ước tính một chiều cho cả nhóm theo khoảng cách.', 'transport'))
    }
    activities.push(createActivity(`${date}-local`, isFirst ? destination.arrivalTime : '08:00', 'Di chuyển trong ngày', 'Di chuyển', localCost, 'Ước tính phương tiện tại điểm đến cho cả nhóm.', 'transport'))

    const morningAvailable = !isFirst || destination.arrivalTime < '12:00'
    if (morningAvailable) {
      const morning = pickAttraction(destination, form.interests, day, usedTitles, attractionBudget, travelers, preferredTitles, reservedForOtherDays)
      if (morning) {
        const cost = morning.costPerPerson * travelers
        attractionBudget -= cost
        activities.push(createActivity(`${date}-morning`, isFirst ? '10:30' : '09:00', morning.title, 'Hoạt động', cost, morning.note || 'Chi phí tham quan ước tính cho cả nhóm.', morning.type, { searchName: morning.searchName || morning.aliases?.[0] || morning.title, location: morning.location, coordinates: morning.coordinates, source: morning.source, sourceUrl: morning.sourceUrl, external: morning.external, requestedDay: requestedToday.includes(morning.title) ? day : undefined }))
      }
    }

    activities.push(createActivity(`${date}-lunch`, isFirst && !morningAvailable ? '14:15' : '12:00', 'Ăn trưa địa phương', 'Ăn uống', lunchCost, `Ước tính ${travelers} người.`, 'food'))
    const afternoon = pickAttraction(destination, form.interests, day, usedTitles, attractionBudget, travelers, preferredTitles, reservedForOtherDays)
    if (afternoon) {
      const cost = afternoon.costPerPerson * travelers
      attractionBudget -= cost
      activities.push(createActivity(`${date}-afternoon`, isFirst && !morningAvailable ? '15:30' : '14:00', afternoon.title, 'Hoạt động', cost, afternoon.note || 'Chi phí tham quan ước tính cho cả nhóm.', afternoon.type, { searchName: afternoon.searchName || afternoon.aliases?.[0] || afternoon.title, location: afternoon.location, coordinates: afternoon.coordinates, source: afternoon.source, sourceUrl: afternoon.sourceUrl, external: afternoon.external, requestedDay: requestedToday.includes(afternoon.title) ? day : undefined }))
    }

    if (!isLast) {
      activities.push(createActivity(`${date}-dinner`, '18:00', 'Ăn tối địa phương', 'Ăn uống', dinnerCost, `Ước tính ${travelers} người.`, 'food'))
      if (lodgingCost > 0) {
        activities.push(createActivity(`${date}-hotel`, '20:00', 'Lưu trú qua đêm', 'Lưu trú', lodgingCost, `Ước tính ${rooms} phòng (2 người/phòng).`, 'hotel'))
      }
    } else if (transferCost > 0) {
      activities.push(createActivity(`${date}-return`, '18:30', `Trở về ${form.origin}`, 'Di chuyển', transferCost - Math.round(transferCost / 2), 'Ước tính một chiều cho cả nhóm theo khoảng cách.', 'transport'))
    }

    activities.sort((a, b) => a.time.localeCompare(b.time))
    return { day, date, label: options.labelsByDay?.[day] || (isFirst ? 'Khởi hành và khám phá' : isLast ? 'Khám phá và trở về' : 'Khám phá theo sở thích'), activities }
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
    specialRequest: isV2 ? stored.specialRequest || '' : '',
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
    interests: form.interests, itinerary: { version: 2, origin: form.origin, travelers: form.travelers, specialRequest: form.specialRequest || '', days: plan.days },
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
