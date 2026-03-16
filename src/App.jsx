import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

import Roster from './pages/Roster'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Roster/>
    </>
  )
}

export default App
