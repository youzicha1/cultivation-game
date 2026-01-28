import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1>修仙游戏</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            计数 {count}
          </button>
        </div>
      </div>
    </>
  )
}

export default App
