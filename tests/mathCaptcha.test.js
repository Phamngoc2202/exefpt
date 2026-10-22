import assert from 'node:assert/strict'
import test from 'node:test'
import { isCorrectMathCaptcha, mathCaptchaQuestions, pickMathCaptcha } from '../src/lib/mathCaptcha.js'

test('bộ câu hỏi có 200 phép toán không trùng và đáp án nguyên', () => {
  assert.equal(mathCaptchaQuestions.length, 200)
  assert.equal(new Set(mathCaptchaQuestions.map((item) => item.question)).size, 200)
  assert.equal(mathCaptchaQuestions.filter((item) => item.question.includes(' + ')).length, 125)
  for (const operator of ['−', '×', '÷']) {
    assert.equal(mathCaptchaQuestions.filter((item) => item.question.includes(` ${operator} `)).length, 25)
  }
  for (const item of mathCaptchaQuestions.slice(100)) {
    const [, left, right] = item.question.match(/^(\d{2}) \+ (\d) = \?$/) || []
    assert.ok(left && right, item.question)
    assert.ok(Number(right) >= 1 && Number(right) <= 9, item.question)
  }
  for (const item of mathCaptchaQuestions) {
    const [, left, operator, right] = item.question.match(/^(\d+) ([+−×÷]) (\d+) = \?$/)
    const a = Number(left)
    const b = Number(right)
    const expected = operator === '+' ? a + b : operator === '−' ? a - b : operator === '×' ? a * b : a / b
    assert.equal(item.answer, expected, item.question)
    assert.equal(Number.isInteger(item.answer), true, item.question)
    assert.equal(item.answer >= 0, true, item.question)
  }
})

test('đáp án phải khớp câu hỏi và đổi câu không lặp lại câu trước', () => {
  const first = pickMathCaptcha(null, () => 0)
  assert.equal(isCorrectMathCaptcha(first, String(first.answer)), true)
  assert.equal(isCorrectMathCaptcha(first, ` ${first.answer} `), true)
  assert.equal(isCorrectMathCaptcha(first, String(first.answer + 1)), false)
  assert.equal(isCorrectMathCaptcha(first, ''), false)
  assert.equal(isCorrectMathCaptcha(first, `${first.answer}abc`), false)
  assert.notEqual(pickMathCaptcha(first.id, () => 0).id, first.id)
  assert.equal(pickMathCaptcha(null, () => 0.9999).id, 200)
})
