import assert from 'node:assert/strict'
import test from 'node:test'
import { isCorrectMathCaptcha, mathCaptchaQuestions, pickMathCaptcha } from '../src/lib/mathCaptcha.js'

test('bộ câu hỏi có đúng 100 phép toán đơn giản và đáp án nguyên', () => {
  assert.equal(mathCaptchaQuestions.length, 100)
  assert.equal(new Set(mathCaptchaQuestions.map((item) => item.question)).size, 100)
  for (const operator of ['+', '−', '×', '÷']) {
    assert.equal(mathCaptchaQuestions.filter((item) => item.question.includes(` ${operator} `)).length, 25)
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
})
