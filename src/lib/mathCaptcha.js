const makeQuestion = (left, operator, right, answer) => ({
  question: `${left} ${operator} ${right} = ?`,
  answer,
})

// 25 questions per operation, plus 100 two-digit + one-digit questions.
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
  ...Array.from({ length: 100 }, (_, i) => {
    const pair = Math.floor(i / 2)
    const left = 30 + pair
    const right = 1 + ((pair * 7 + (i % 2) * 4) % 9)
    return makeQuestion(left, '+', right, left + right)
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
