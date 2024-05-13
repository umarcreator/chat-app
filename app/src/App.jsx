import { Route, Routes } from 'react-router-dom'
import './App.css'
import Chat from './Chat'
import Home from './Home'

function App() {
  return (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:id" element={<Chat />} />
    </Routes>
  )
}

export default App