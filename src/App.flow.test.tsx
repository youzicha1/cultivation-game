import { describe, it, beforeEach, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App flow: 清档与传承续局', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('从开局点击「传承续局」会进入主界面', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 初始在开局界面
    expect(screen.getByText('修仙之路')).toBeInTheDocument()
    expect(screen.getByText('传承续局')).toBeInTheDocument()

    await user.click(screen.getByText('传承续局'))

    // 传承续局后应进入主界面（保留传承等，仅重置本局）
    await waitFor(() => {
      expect(screen.getByText('主界面')).toBeInTheDocument()
    })
  })

  it('设置中清档后回到开局，再点传承续局也能正常进入主界面', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 初始在开局界面，先传承续局进入主界面（确保有存档数据）
    await user.click(screen.getByText('传承续局'))
    await waitFor(() => {
      expect(screen.getByText('主界面')).toBeInTheDocument()
    })

    // 进入设置
    await user.click(screen.getByText('设置'))
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeInTheDocument()
    })

    // 清档应返回开局（重置一切）
    await user.click(screen.getByRole('button', { name: /清档/ }))
    await waitFor(() => {
      expect(screen.getByText('修仙之路')).toBeInTheDocument()
    })

    // 再次传承续局应进入主界面
    await user.click(screen.getByText('传承续局'))
    await waitFor(() => {
      expect(screen.getByText('主界面')).toBeInTheDocument()
    })
  })
})

