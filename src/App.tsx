import './App.css'
import { useGameStore } from './app/store/useGameStore'
import { AlchemyScreen } from './app/screens/AlchemyScreen'
import { BreakthroughScreen } from './app/screens/BreakthroughScreen'
import { CultivateScreen } from './app/screens/CultivateScreen'
import { DeathScreen } from './app/screens/DeathScreen'
import { ExploreScreen } from './app/screens/ExploreScreen'
import { HomeScreen } from './app/screens/HomeScreen'
import { SettingsScreen } from './app/screens/SettingsScreen'
import { StartScreen } from './app/screens/StartScreen'
import { SummaryScreen } from './app/screens/SummaryScreen'

function App() {
  const { state, dispatch, newGame, clearSave } = useGameStore()

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
      default:
        return <HomeScreen state={state} dispatch={dispatch} />
    }
  })()

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>修仙游戏</h1>
      </header>
      <main className="app-main">{screen}</main>
      <section className="app-log">
        <h2>日志</h2>
        <div className="app-log-list">
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
        {state.log.length > 0 ? (
          <button
            className="app-clear-log"
            onClick={() => dispatch({ type: 'CLEAR_LOG' })}
          >
            清空日志
          </button>
        ) : null}
      </section>
    </div>
  )
}

export default App
