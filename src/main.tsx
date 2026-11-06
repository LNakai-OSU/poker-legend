import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installPixelFont } from './game/pixel/webFont'
import { installUpdateCheck } from './updateCheck'

// Before the first render, so no text is ever laid out in the fallback.
installPixelFont()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

installUpdateCheck()
