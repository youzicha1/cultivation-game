/**
 * TICKET-31: IconButtonCard 护栏测试 — 渲染 title + icon，disabled 时不可点
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButtonCard } from './IconButtonCard'

describe('IconButtonCard', () => {
  it('渲染 title 与 icon 容器', () => {
    render(
      <IconButtonCard
        title="修炼"
        subtitle="吐纳周天"
        iconName="cultivate"
        onClick={() => {}}
      />,
    )
    expect(screen.getByText('修炼')).toBeInTheDocument()
    expect(screen.getByText('吐纳周天')).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: /修炼：吐纳周天/ })
    expect(btn).toBeInTheDocument()
    expect(btn.querySelector('.atm-iconFrame')).toBeTruthy()
  })

  it('disabled 时含 disabled class 且不可点击', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <IconButtonCard
        title="突破"
        iconName="breakthrough"
        onClick={onClick}
        disabled
      />,
    )
    const btn = screen.getByRole('button', { name: /突破/ })
    expect(btn).toHaveClass('atm-btn-card--disabled')
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('可点击时触发 onClick', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <IconButtonCard title="探索" iconName="explore" onClick={onClick} />,
    )
    await user.click(screen.getByRole('button', { name: /探索/ }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
