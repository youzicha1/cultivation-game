import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlchemyFurnaceGauge } from './AlchemyFurnaceGauge'

describe('AlchemyFurnaceGauge', () => {
  it('renders success and boom percentages', () => {
    render(<AlchemyFurnaceGauge successRate={0.612} boomRate={0.083} />)
    expect(screen.getByText('成功率')).toBeTruthy()
    expect(screen.getByText('61%')).toBeTruthy()
    expect(screen.getByText('爆丹')).toBeTruthy()
    expect(screen.getByText('8%')).toBeTruthy()
  })

  it('sets progressbar aria-valuenow', () => {
    render(<AlchemyFurnaceGauge successRate={0.4} boomRate={0.01} />)
    const bar = screen.getByRole('progressbar', { name: '成功率' })
    expect(bar.getAttribute('aria-valuenow')).toBe('40')
  })

  it('clamps values out of range', () => {
    render(<AlchemyFurnaceGauge successRate={2} boomRate={-1} />)
    expect(screen.getByText('100%')).toBeTruthy()
    expect(screen.getByText('0%')).toBeTruthy()
  })
})
