import { useEffect, useRef } from 'react'

const formatMoney = (value) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))}đ`

export default function AnimatedMoney({ value }) {
  const elementRef = useRef(null)

  useEffect(() => {
    const element = elementRef.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.textContent = formatMoney(value)
      return undefined
    }

    const start = performance.now()
    let frame
    const animate = (now) => {
      const progress = Math.min(1, (now - start) / 650)
      const eased = 1 - (1 - progress) ** 3
      element.textContent = formatMoney(value * eased)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <strong className="budget-total-amount" ref={elementRef} aria-label={formatMoney(value)}>{formatMoney(value)}</strong>
}
