import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initTelemetry } from './utils/telemetry.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Ad blockers often block the SDK. The site works the same without it.
initTelemetry().catch(() => {})
