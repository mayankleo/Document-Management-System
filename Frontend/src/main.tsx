import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import './index.css'
import App from './App.tsx'
import { setAuthToken } from './api/http';

// Rehydrate axios auth header from persisted redux state (localStorage)
const persisted = (() => {
  try { return JSON.parse(localStorage.getItem('dms_auth') || 'null'); } catch { return null; }
})();
if (persisted?.token) {
  setAuthToken(persisted.token);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
