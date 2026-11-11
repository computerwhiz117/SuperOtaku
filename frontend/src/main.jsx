import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ItemDetail from './pages/ItemDetail.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/items/:id" element={<ItemDetail />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
