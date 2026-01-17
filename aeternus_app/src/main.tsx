import React from 'react'
import ReactDOM from 'react-dom/client'
import BrowserShell from './components/BrowserShell'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserShell />
  </React.StrictMode>,
)
