import { useEffect, useRef } from 'react'
import './App.css'
import { useGameStore } from './app/store/useGameStore'
import { TIME_MAX, TIME_WARNING_THRESHOLD } from './engine'
import { AchievementsScreen } from './app/screens/AchievementsScreen'
import { AlchemyScreen } from './app/screens/AlchemyScreen'
import { AlchemyCodexScreen } from './app/screens/AlchemyCodexScreen'
import { BreakthroughScreen } from './app/screens/BreakthroughScreen'
import { CultivateScreen } from './app/screens/CultivateScreen'
import { DeathScreen } from './app/screens/DeathScreen'
import { ExploreScreen } from './app/screens/ExploreScreen'
import { HomeScreen } from './app/screens/HomeScreen'
import { RelicsScreen } from './app/screens/RelicsScreen'
import { SettingsScreen } from './app/screens/SettingsScreen'
import { StartScreen } from './app/screens/StartScreen'
import { SummaryScreen } from './app/screens/SummaryScreen'
import { LegacyScreen } from './app/screens/LegacyScreen'
import { FinalTrialScreen } from './app/screens/FinalTrialScreen'
import { FinalResultScreen } from './app/screens/FinalResultScreen'

function App() {
  const { state, dispatch, newGame, clearSave } = useGameStore()
  const logListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logListRef.current && state.log.length > 0) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight
    }
  }, [state.log.length])

  const screen = (() => {
    switch (state.screen) {
      case 'start':
        return (
          <StartScreen state={state} dispatch={dispatch} newGame={newGame} />
        )
      case 'home':
        return <HomeScreen state={state} dispatch={dispatch} />
      case 'cultivate':
        return <CultivateScreen state={state} dispatch={dispatch} />
      case 'explore':
        return <ExploreScreen state={state} dispatch={dispatch} />
      case 'alchemy':
        return <AlchemyScreen state={state} dispatch={dispatch} />
      case 'alchemy_codex':
        return <AlchemyCodexScreen state={state} dispatch={dispatch} />
      case 'breakthrough':
        return <BreakthroughScreen state={state} dispatch={dispatch} />
      case 'death':
        return (
          <DeathScreen state={state} dispatch={dispatch} newGame={newGame} />
        )
      case 'summary':
        return <SummaryScreen state={state} dispatch={dispatch} />
      case 'settings':
        return (
          <SettingsScreen
            state={state}
            dispatch={dispatch}
            clearSave={clearSave}
          />
        )
      case 'relics':
        return <RelicsScreen state={state} dispatch={dispatch} />
      case 'achievements':
        return <AchievementsScreen state={state} dispatch={dispatch} />
      case 'legacy':
        return <LegacyScreen state={state} dispatch={dispatch} />
      case 'ending':
        return <SummaryScreen state={state} dispatch={dispatch} />
      case 'final_trial':
        return <FinalTrialScreen state={state} dispatch={dispatch} />
      case 'final_result':
        return (
          <FinalResultScreen state={state} dispatch={dispatch} newGame={newGame} />
        )
      default:
        return <HomeScreen state={state} dispatch={dispatch} />
    }
  })()

  const isBreakthrough = state.screen === 'breakthrough'
  const isAlchemy = state.screen === 'alchemy'
  const showTimer = ['home', 'cultivate', 'explore', 'alchemy', 'breakthrough', 'alchemy_codex', 'relics', 'legacy', 'settings', 'achievements'].includes(state.screen)
  const timeLeft = state.run.timeLeft ?? TIME_MAX
  const timeMax = state.run.timeMax ?? TIME_MAX
  const timeWarning = timeLeft <= TIME_WARNING_THRESHOLD
  return (
    <div className={`app-root ${isBreakthrough ? 'app-root--breakthrough' : ''} ${isAlchemy ? 'app-root--alchemy' : ''}`}>
      <header className="app-header">
        <h1>修仙游戏</h1>
        {showTimer && (
          <div className={`app-timer-bar ${timeWarning ? 'app-timer-bar--warning' : ''}`}>
            <span className="app-timer-label">时辰 {`${timeLeft}/${timeMax}`}</span>
            {timeWarning && (
              <span className="app-timer-warning">天劫将至！再贪就来不及了。</span>
            )}
          </div>
        )}
      </header>
      <main className={`app-main ${isBreakthrough ? 'app-main--breakthrough' : ''} ${isAlchemy ? 'app-main--alchemy' : ''}`}>{screen}</main>
      <section className="app-log">
        <div className="app-log-head">
          <span className="app-log-title">日志</span>
          {state.log.length > 0 && (
            <button
              type="button"
              className="app-log-clear"
              onClick={() => dispatch({ type: 'CLEAR_LOG' })}
            >
              清空
            </button>
          )}
        </div>
        <div className="app-log-list" ref={logListRef}>
          {state.log.length === 0 ? (
            <div className="app-log-empty">暂无日志</div>
          ) : (
            state.log.map((item, index) => (
              <div key={`${item}-${index}`} className="app-log-item">
                {item}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default App
