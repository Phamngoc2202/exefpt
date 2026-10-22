const makeQuestion = (left, operator, right, answer) => ({
  question: `${left} ${operator} ${right} = ?`,
  answer,
})

// 25 questions per operation. The answers are calculated once when the app loads.
export const mathCaptchaQuestions = [
  ...Array.from({ length: 25 }, (_, i) => {
    const left = 3 + i
    const right = 2 + (i * 11) % 19
    return makeQuestion(left, '+', right, left + right)
  }),
  ...Array.from({ length: 25 }, (_, i) => {
    const left = 15 + i
    const right = 1 + (i * 3) % 10
    return makeQuestion(left, '−', right, left - right)
  }),
  ...Array.from({ length: 25 }, (_, i) => {
    const left = 2 + i % 5
    const right = 7 + Math.floor(i / 5)
    return makeQuestion(left, '×', right, left * right)
  }),
  ...Array.from({ length: 25 }, (_, i) => {
    const right = 2 + i % 5
    const answer = 7 + Math.floor(i / 5)
    return makeQuestion(right * answer, '÷', right, answer)
  }),
].map((item, index) => ({ id: index + 1, ...item }))

export function pickMathCaptcha(previousId = null, random = Math.random) {
  const index = Math.min(mathCaptchaQuestions.length - 1, Math.floor(random() * mathCaptchaQuestions.length))
  const nextIndex = mathCaptchaQuestions[index].id === previousId ? (index + 1) % mathCaptchaQuestions.length : index
  return mathCaptchaQuestions[nextIndex]
}

export function isCorrectMathCaptcha(question, input) {
  const answer = String(input ?? '').trim()
  return Boolean(question && /^\d+$/.test(answer) && Number(answer) === question.answer)
}
