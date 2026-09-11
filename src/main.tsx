import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/meal-planner/sw.js').then(reg => {
      // Sofort auf Update prüfen
      reg.update()

      // Wenn ein neuer SW wartet: aktivieren und Seite neu laden
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage('SKIP_WAITING')
          }
        })
      })
    })

    // Wenn SW gewechselt hat: Seite neu laden
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
