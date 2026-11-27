import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { cloudMode } from './cloud/config.ts'
import { DemoApp } from './cloud/DemoApp.tsx'
import { KidsApp } from './cloud/KidsApp.tsx'
import { makeApi } from './cloud/makeApi.ts'

// Off (today's live site): the original app. `http`: the kids' app against the real server.
// `mock`: the preview that shows both apps on one in-page backend. The parents' app is its own
// page — see parents/index.html.
const root =
  cloudMode === 'off' ? <App /> : cloudMode === 'mock' ? <DemoApp /> : <KidsApp api={makeApi()} />

createRoot(document.getElementById('root')!).render(<StrictMode>{root}</StrictMode>)
