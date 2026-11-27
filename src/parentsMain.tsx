import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { cloudMode } from './cloud/config.ts'
import { makeApi } from './cloud/makeApi.ts'
import { ParentsApp } from './cloud/ParentsApp.tsx'

// The parents' app — a separate page from the kids' one, installed on its own.
function NotReady() {
  return (
    <div className="cloud" style={{ justifyContent: 'center' }}>
      <div className="cloud-card"><h1>אפליקציית ההורים</h1><p style={{ textAlign: 'center' }}>עוד לא פעילה.</p></div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{cloudMode === 'off' ? <NotReady /> : <ParentsApp api={makeApi()} />}</StrictMode>,
)
