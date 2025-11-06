import React, { useEffect, useState, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { createRoot } from 'react-dom/client'
import { io } from 'socket.io-client'

function useSocketLogs() {
  const [parser, setParser] = useState('')
  const [errors, setErrors] = useState('')
  useEffect(() => {
    const s = io('http://localhost:5174')
    s.on('log:parser', (data) => setParser(data))
    s.on('log:errors', (data) => setErrors(data))
    s.on('build:complete', ({ name, code }) => {
      // naive refresh logs
      fetch(`/api/logs/parser`).then(r=>r.text()).then(setParser)
      fetch(`/api/themes`).then(r=>r.json()).then(()=>{})
      alert(`Build completed for ${name} (code ${code})`)
    })
    return () => s.close()
  }, [])
  return { parser, errors }
}

function UploadBox({ onUploaded }){
  const [name, setName] = useState('')
  const fileRef = useRef()
  const [busy, setBusy] = useState(false)
  const upload = async () => {
    if (!fileRef.current?.files?.[0]) return alert('Pick a ZIP file')
    const fd = new FormData()
    fd.append('file', fileRef.current.files[0])
    if (name) fd.append('name', name)
    setBusy(true)
    const res = await fetch('http://localhost:5174/api/upload', { method: 'POST', body: fd })
    setBusy(false)
    if (!res.ok) return alert('Upload failed')
    onUploaded && onUploaded()
  }
  return (
    <div className="p-3 bg-white border rounded flex gap-2 items-center">
      <input type="text" placeholder="folder name (optional)" value={name} onChange={e=>setName(e.target.value)} className="border rounded px-2 py-1" />
      <input ref={fileRef} type="file" accept=".zip" className="" />
      <button disabled={busy} onClick={upload} className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50">Upload ZIP</button>
    </div>
  )
}

function ThemeList({ onSelect }) {
  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(false)
  const refresh = () => fetch('/api/themes').then(r=>r.json()).then(d=> setThemes(d.themes || []))
  useEffect(() => { refresh() }, [])
  const build = async (name) => {
    setLoading(true)
    await fetch(`/api/build/${encodeURIComponent(name)}`, { method: 'POST' })
    setLoading(false)
  }
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">Themes</h2>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-1 bg-slate-200 rounded">Refresh</button>
        </div>
      </div>
      <UploadBox onUploaded={refresh} />
      <div className="h-3" />
      {themes.length === 0 ? <div className="text-slate-500">No folders under /input</div> : (
        <ul className="space-y-2">
          {themes.map(t => (
            <li key={t} className="bg-white border rounded p-3 flex items-center justify-between">
              <button className="font-mono text-left" onClick={()=> onSelect && onSelect(t)} title="Open details">{t}</button>
              <button disabled={loading} onClick={() => build(t)} className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50">Build</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LogConsole() {
  const { parser, errors } = useSocketLogs()
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div className="bg-black text-green-200 p-3 rounded h-80 overflow-auto">
        <div className="text-sm whitespace-pre-wrap">{parser}</div>
      </div>
      <div className="bg-black text-red-300 p-3 rounded h-80 overflow-auto">
        <div className="text-sm whitespace-pre-wrap">{errors}</div>
      </div>
    </div>
  )
}

function MetricsPanel(){
  const [metrics, setMetrics] = useState({ builds:{ total:0, success:0, failed:0 }, last: [] })
  useEffect(() => {
    fetch('/api/metrics').then(r=>r.json()).then(setMetrics)
    const s = io('http://localhost:5174')
    s.on('metrics:update', (m) => setMetrics(m))
    return () => s.close()
  }, [])
  const summary = [
    { name: 'Success', value: metrics.builds?.success || 0, fill: '#10b981' },
    { name: 'Failed', value: metrics.builds?.failed || 0, fill: '#ef4444' }
  ]
  const recent = (metrics.last || []).slice(0, 10).reverse().map((r, idx)=> ({ idx, duration: Math.round((r.durationMs||0)/1000), ok: r.code===0 ? 1 : 0 }))
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Build Summary</h3>
          <div className="text-sm text-slate-500">Total: {metrics.builds?.total||0}</div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Recent Build Durations (s)</h3>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="idx" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="duration" stroke="#0ea5e9" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
function QAView({ name }){
  const [qa, setQa] = useState(null)
  useEffect(() => { fetch(`/api/qa/${encodeURIComponent(name)}`).then(r=>r.ok?r.json():null).then(setQa) }, [name])
  if (!qa) return <div className="text-slate-500">No QA report yet</div>
  const badge = qa.status === 'passed' ? 'bg-emerald-600' : qa.status === 'failed' ? 'bg-rose-600' : 'bg-slate-500'
  return (
    <div>
      <div className={`inline-block text-white text-xs px-2 py-1 rounded ${badge}`}>QA {qa.status}</div>
      <pre className="text-xs overflow-auto h-64 mt-2">{JSON.stringify(qa, null, 2)}</pre>
    </div>
  )
}
function QASummary({ name }){
  const [qa, setQa] = useState(null)
  useEffect(() => { fetch(`/api/qa/${encodeURIComponent(name)}`).then(r=>r.ok?r.json():null).then(setQa) }, [name])
  if (!qa) return <div className="text-slate-500">No QA data</div>
  const status = qa.status
  const badge = status === 'passed' ? 'bg-emerald-600' : status === 'failed' ? 'bg-rose-600' : 'bg-slate-500'
  const diffUrl = `/qa/screenshots/${encodeURIComponent(name)}/diff.png`
  const htmlUrl = `/qa/reports/${encodeURIComponent(name)}-QA.html`
  return (
    <div className="bg-white border rounded p-3 md:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className={`inline-block text-white text-xs px-2 py-1 rounded ${badge}`}>QA {status}</span>
        </div>
        <a href={htmlUrl} target="_blank" className="underline text-indigo-600">Open HTML report</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <pre className="border rounded p-2 h-64 overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(qa.stages && (qa.stages.summary || qa.stages), null, 2)}</pre>
        <div className="border rounded p-2 h-64 overflow-auto flex items-center justify-center">
          <img src={diffUrl} alt="diff" className="max-h-60" onError={(e)=> e.currentTarget.style.display='none'} />
        </div>
      </div>
    </div>
  )
}
function App(){
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  useEffect(() => {
    if (!selected) { setDetails(null); return }
    fetch(`/api/theme/${encodeURIComponent(selected)}`).then(r=>r.json()).then(setDetails)
  }, [selected])
  return (
    <div>
      <header className="bg-white border-b p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Beto Factory Dashboard</h1>
        <div className="text-sm text-slate-500">localhost:5174</div>
      </header>
      <main className="max-w-6xl mx-auto">
        {!selected && <ThemeList onSelect={setSelected} />}
        {selected && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Theme: <span className="font-mono">{selected}</span></h2>
              <button onClick={()=> setSelected(null)} className="px-3 py-1 bg-slate-200 rounded">Back</button>
            </div>
            {!details ? <div className="text-slate-500">Loading…</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border rounded p-3">
                  <h3 className="font-semibold mb-2">Canonical theme.json</h3>
                  <pre className="text-xs overflow-auto h-64">{JSON.stringify(details.themeJson, null, 2)}</pre>
                </div>
                <div className="bg-white border rounded p-3">
                  <h3 className="font-semibold mb-2">QA / Meta</h3>
                  <pre className="text-xs overflow-auto h-64">{JSON.stringify({ qa: details.qa, meta: details.meta }, null, 2)}</pre>
                </div>
                <div className="bg-white border rounded p-3 md:col-span-2">
                  <h3 className="font-semibold mb-2">Build outputs</h3>
                  <BuildFiles details={details} selected={selected} />
                </div>
              </div>
            )}
          </div>
        )}
        <div className="bg-white border rounded p-3 md:col-span-2">
  <h3 className="font-semibold mb-2">QA Report</h3>
  {!details?.name ? null : (
    <QAView name={selected} />
  )}
</div>\n<QASummary name={selected} />
<LogConsole />
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)






