import { StrictMode } from 'react'
import { Toaster } from "react-hot-toast";
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
  position="top-right"
  toastOptions={{
    duration: 2500,
    style: {
      background: "#111827",
      color: "#fff",
      border: "1px solid #374151",
    },
  }}
/>
  </StrictMode>,
)
