import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './plants/plants.jsx'
import './components/ambient.jsx'
import './components/pattern-lock.jsx'
import './screens/screens-auth.tsx'
import './screens/screens-session.jsx'
import './screens/screens-complete.jsx'
import './screens/screens-garden.jsx'
import './registerServiceWorker'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
