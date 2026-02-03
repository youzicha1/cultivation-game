import { useEffect, useRef } from 'react'
import './App.css'
import { useGameStore } from './app/store/useGameStore'
import { TIME_MAX, TIME_WARNING_THRESHOLD, getDayPhase } from './engine'
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
import { VictoryScreen } from './app/screens/VictoryScreen'
import { AwakenSkillScreen } from './app/screens/AwakenSkillScreen'
import { ShopScreen } from './app/screens/ShopScreen'
import { DiagnosticsScreen } from './app/screens/DiagnosticsScreen'
import { APP_VERSION } from './app/version'

function App() {
  const { state, dispatch, newGame, clearSave } = useGameStore()
  const logListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logListRef.current && state.log.length > 0) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight
    }
  }, [state.log.length])

  const strangerToast = state.run.mysteriousTraderToast
  useEffect(() => {
    if (!strangerToast) return
    const t = setTimeout(() => {
      dispatch({ type: 'CLEAR_MYSTERIOUS_TRADER_TOAST' })
    }, 12000)
    return () => clearTimeout(t)
  }, [strangerToast, dispatch])

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
      case 'victory':
        return (
          <VictoryScreen state={state} dispatch={dispatch} newGame={newGame} />
        )
      case 'shop':
        return <ShopScreen state={state} dispatch={dispatch} />
      case 'diagnostics':
        return (
          <DiagnosticsScreen
            state={state}
            dispatch={dispatch}
            clearSave={clearSave}
          />
        )
      case 'awaken_skill':
        return <AwakenSkillScreen state={state} dispatch={dispatch} />
      default:
        return <HomeScreen state={state} dispatch={dispatch} />
    }
  })()

  const isBreakthrough = state.screen === 'breakthrough'
  const isAlchemy = state.screen === 'alchemy'
  const isShop = state.screen === 'shop'
  const showTimer = ['home', 'cultivate', 'explore', 'alchemy', 'breakthrough', 'alchemy_codex', 'relics', 'legacy', 'settings', 'achievements', 'shop'].includes(state.screen)
  const timeLeft = state.run.timeLeft ?? TIME_MAX
  const timeMax = state.run.timeMax ?? TIME_MAX
  const timeWarning = timeLeft <= TIME_WARNING_THRESHOLD
  return (
    <div className={`app-root ${isBreakthrough ? 'app-root--breakthrough' : ''} ${isAlchemy ? 'app-root--alchemy' : ''} ${isShop ? 'app-root--shop' : ''}`}>
      {strangerToast && (
        <div className="app-stranger-marquee" role="status" aria-live="polite">
          <span className="app-stranger-marquee-text">{strangerToast}</span>
        </div>
      )}
      <header className="app-header">
        <h1>仙途暴击</h1>
        {showTimer && (
          <div className={`app-timer-bar ${timeWarning ? 'app-timer-bar--warning' : ''}`}>
            <span className="app-timer-label">时辰 {`${timeLeft}/${timeMax}`} · {getDayPhase(timeLeft, timeMax)}</span>
            {timeWarning && (
              <span className="app-timer-warning">天劫将至！再贪就来不及了。</span>
            )}
          </div>
        )}
      </header>
      <main className={`app-main ${isBreakthrough ? 'app-main--breakthrough' : ''} ${isAlchemy ? 'app-main--alchemy' : ''} ${isShop ? 'app-main--shop' : ''}`}>{screen}</main>
      <footer className="app-version">v{APP_VERSION}</footer>
      {state.run.temp?.pillToast && (
        <div className="app-pill-toast" role="alert">
          <span className="app-pill-toast-title">【{state.run.temp.pillToast.pillName}】{state.run.temp.pillToast.quality}</span>
          <span className="app-pill-toast-msg">{state.run.temp.pillToast.message}</span>
          <button type="button" className="app-pill-toast-dismiss" onClick={() => dispatch({ type: 'CLEAR_PILL_TOAST' })}>知道了</button>
        </div>
      )}
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
