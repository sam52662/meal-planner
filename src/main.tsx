import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/meal-planner/sw.js').then(reg => {
      reg.update()

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(newWorker)
          }
        })
      })
    })
  })
}

function showUpdateBanner(worker: ServiceWorker) {
  const banner = document.createElement('div')
  banner.id = 'update-banner'
  banner.textContent = '🔄 Update verfügbar — tippen zum Laden'
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #5b6af0;
    color: white;
    text-align: center;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    font-family: -apple-system, sans-serif;
    z-index: 9999;
    cursor: pointer;
    letter-spacing: -0.1px;
  `
  banner.addEventListener('click', () => {
    worker.postMessage('SKIP_WAITING')
    window.location.reload()
  })
  document.body.appendChild(banner)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

