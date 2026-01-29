import { describe, it, beforeEach, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App flow: 清档与新开局', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('从开局点击「新开局」会进入主界面', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 初始在开局界面
    expect(screen.getByText('修仙之路')).toBeInTheDocument()
    expect(screen.getByText('新开局')).toBeInTheDocument()

    await user.click(screen.getByText('新开局'))

    // 新开局后应进入主界面（等待状态更新）
    await waitFor(() => {
      expect(screen.getByText('主界面')).toBeInTheDocument()
    })
  })

  it('设置中清档后回到开局，再点新开局也能正常进入主界面', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 初始在开局界面，先新开局进入主界面（确保有存档数据）
    await user.click(screen.getByText('新开局'))
    await waitFor(() => {
      expect(screen.getByText('主界面')).toBeInTheDocument()
    })

    // 进入设置
    await user.click(screen.getByText('设置'))
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeInTheDocument()
    })

    // 清档应返回开局
    await user.click(screen.getByText('清档'))
    await waitFor(() => {
      expect(screen.getByText('修仙之路')).toBeInTheDocument()
    })

    // 再次新开局应进入主界面
    await user.click(screen.getByText('新开局'))
    await waitFor(() => {
      expect(screen.getByText('主界面')).toBeInTheDocument()
    })
  })
})

