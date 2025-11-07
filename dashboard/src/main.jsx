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
      // refresh logs; toasts handled in App
      fetch(`/api/logs/parser`).then(r=>r.text()).then(setParser)
      fetch(`/api/themes`).then(r=>r.json()).then(()=>{})
    })
    return () => s.close()
  }, [])
  return { parser, errors }
}

function UploadBox({ onUploaded }){
  const [platform, setPlatform] = useState('salla')
  const [toInput, setToInput] = useState(false)
  const [themeName, setThemeName] = useState('')
  const fileRef = useRef()
  const [busy, setBusy] = useState(false)
  const upload = async () => {
    if (!fileRef.current?.files?.[0]) return alert('Pick a ZIP file')
    if (!themeName) return alert('Enter a theme name')
    const fd = new FormData()
    fd.append('theme', fileRef.current.files[0])
    fd.append('platform', platform)
    fd.append('themeName', themeName)
    setBusy(true)
    const url = toInput ? '/api/upload-input' : '/api/upload'
      const res = await fetch(url, { method: 'POST', body: fd, headers: authHeaders() })
    setBusy(false)
    if (!res.ok) return alert('Upload failed')
    onUploaded && onUploaded()
  }
  return (
    <div className="p-3 bg-white border rounded flex gap-2 items-center">
      <select value={platform} onChange={e=>setPlatform(e.target.value)} className="border rounded px-2 py-1">
        <option value="salla">Salla</option>
        <option value="shopify">Shopify</option>
        <option value="zid">Zid</option>
      </select>
      <input type="text" placeholder="Theme name" value={themeName} onChange={e=>setThemeName(e.target.value)} className="border rounded px-2 py-1" />
      <label className="text-sm text-slate-600 flex items-center gap-2"><input type="checkbox" checked={toInput} onChange={e=>setToInput(e.target.checked)} /> Upload to Input (smart-input/input)</label>
      <input ref={fileRef} type="file" accept=".zip" className="" />
      <button disabled={busy} onClick={upload} className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50">Upload ZIP</button>
    </div>
  )
}

function QACanonicalSummary({ qa }){
  if (!qa) return <div className="text-slate-500">No QA summary found</div>
  const rows = [
    { k: 'filesProcessed', v: qa.filesProcessed },
    { k: 'sectionsDetected', v: qa.sectionsDetected },
    { k: 'componentsExtracted', v: qa.componentsExtracted },
    { k: 'imagesCount', v: qa.imagesCount },
    { k: 'stylesCount', v: qa.stylesCount },
    { k: 'scriptsCount', v: qa.scriptsCount },
    { k: 'assetsFound', v: qa.assetsFound },
    { k: 'invalidRefs', v: (qa.invalidRefs && qa.invalidRefs.length) || 0 }
  ]
  return (
    <div className="border rounded p-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {rows.map(r => (
          <div key={r.k} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded">
            <span className="text-slate-600">{r.k}</span>
            <span className="font-mono">{String(r.v ?? '—')}</span>
          </div>
        ))}
      </div>
      {qa.invalidRefs && qa.invalidRefs.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-slate-600">Show invalid refs</summary>
          <ul className="list-disc ml-5 text-xs mt-1">
            {qa.invalidRefs.slice(0, 50).map((u, i) => (<li key={i} className="truncate"><a className="underline" href={u} target="_blank" rel="noreferrer">{u}</a></li>))}
          </ul>
        </details>
      )}
    </div>
  )
}

function BuildFiles({ details, selected }){
  const builds = details?.builds || {}
  const platforms = Object.keys(builds)
  if (!platforms.length) return <div className="text-slate-500">No build outputs yet</div>
  return (
    <div className="space-y-3">
      {platforms.map(pf => {
        const b = builds[pf]
        if (!b?.exists) return null
        const zipHref = `/api/file?file=${encodeURIComponent(pf)}/${encodeURIComponent(selected)}.zip`
        const manifestHref = `/api/file?file=${encodeURIComponent(pf)}/${encodeURIComponent(selected)}/manifest.json`
        const list = (b.files || []).slice(0, 10)
        return (
          <div key={pf} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{pf}</div>
              <div className="flex gap-2">
                <a className="px-2 py-1 bg-indigo-600 text-white rounded text-sm" href={zipHref} target="_blank" rel="noreferrer">Download ZIP</a>
                <a className="px-2 py-1 bg-slate-200 rounded text-sm" href={manifestHref} target="_blank" rel="noreferrer">manifest.json</a>
              </div>
            </div>
            <ul className="mt-2 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-1">
              {list.map(f => (<li key={f} className="truncate">{f}</li>))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
function ProgressBar({ pct = 0, text = '' }){
  const width = Math.min(100, Math.max(0, Math.floor(pct)))
  return (
    <div className="mx-4 mt-3">
      <div className="h-2 bg-slate-200 rounded">
        <div className="h-2 bg-indigo-600 rounded" style={{ width: `${width}%`, transition: 'width 200ms linear' }} />
      </div>
      <div className="text-xs text-slate-600 mt-1">{text} ({width}%)</div>
    </div>
  )
}

function ThemeList({ onSelect, selectedPlatforms = ['salla'], busyTheme }) {
  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(false)
  const refresh = () => fetch('/api/themes').then(r=>r.json()).then(d=> setThemes(d.themes || []))
  useEffect(() => { refresh() }, [])
  const build = async (name) => {
    setLoading(true)
    await fetch(`/api/build/${encodeURIComponent(name)}`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ platforms: Array.isArray(selectedPlatforms) ? selectedPlatforms.join(',') : String(selectedPlatforms||'salla') }) })
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
              <button disabled={loading || busyTheme===t} onClick={() => build(t)} className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50">{busyTheme===t? 'Building…' : 'Build'}</button>
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
  const visual = qa?.stages?.visual
  const results = visual?.results || {}
  const lintJs = qa?.stages?.lintJs || {}
  const budgets = qa?.stages?.budgets || {}
  const diffs = [
    { label: 'mobile', url: `/qa/screenshots/${encodeURIComponent(name)}/diff-mobile.png` },
    { label: 'tablet', url: `/qa/screenshots/${encodeURIComponent(name)}/diff-tablet.png` },
    { label: 'desktop', url: `/qa/screenshots/${encodeURIComponent(name)}/diff-desktop.png` }
  ]
  const htmlUrl = `/qa/reports/${encodeURIComponent(name)}-QA.html`
  return (
    <div className="bg-white border rounded p-3 md:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className={`inline-block text-white text-xs px-2 py-1 rounded ${badge}`}>QA {status}</span>
        </div>
        <a href={htmlUrl} target="_blank" className="underline text-indigo-600">Open HTML report</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="border rounded p-2 text-sm">
          <div className="font-semibold mb-1">JS Lint</div>
          <div>Errors: <span className="font-mono">{lintJs.errorCount ?? '—'}</span></div>
          <div>Warnings: <span className="font-mono">{lintJs.warningCount ?? '—'}</span></div>
        </div>
        <div className="border rounded p-2 text-sm">
          <div className="font-semibold mb-1">Budgets</div>
          <div>Total: <span className="font-mono">{budgets.total ?? '—'}</span></div>
          <div>Max: <span className="font-mono">{budgets.max ?? '—'}</span></div>
          <div>Status: <span className="font-mono">{budgets.ok===false ? 'Exceeded' : 'OK'}</span></div>`r`n          <div className="h-14 mt-1">`r`n            <ResponsiveContainer width="100%" height="100%">`r`n              <LineChart data={trend}>`r`n                <XAxis dataKey="idx" hide />`r`n                <YAxis hide domain={[ "auto", "auto" ]} />`r`n                <Line type="monotone" dataKey="total" stroke="#0ea5e9" dot={false} strokeWidth={2} />`r`n              </LineChart>`r`n            </ResponsiveContainer>`r`n          </div>
        </div>
        <div className="border rounded p-2 text-sm">
          <div className="font-semibold mb-1">Summary</div>
          <div className="text-xs text-slate-600">See full report for details.</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <pre className="border rounded p-2 h-64 overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(qa.stages && (qa.stages.summary || qa.stages), null, 2)}</pre>
        <div className="border rounded p-2 h-64 overflow-auto">
          <div className="text-sm text-slate-600 mb-1">Visual diffs (mobile/tablet/desktop)</div>
          <div className="flex gap-2">
            {diffs.map(d => (
              <div key={d.label} className="flex-1 flex flex-col items-center">
                <div className="text-xs text-slate-500 mb-1">{d.label}</div>
                <img src={d.url} alt={d.label} className="max-h-52" onError={(e)=> e.currentTarget.style.display='none'} />
                <div className="text-xs text-slate-500 mt-1">{results?.[d.label]?.mismatch ?? '—'}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
function QACanonicalSummary({ qa, onRebuild, rebuilding, onPromote }){
  if (!qa) return <div className="text-slate-500">No QA summary found</div>
  const rows = [
    { k: 'filesProcessed', v: qa.filesProcessed },
    { k: 'sectionsDetected', v: qa.sectionsDetected },
    { k: 'componentsExtracted', v: qa.componentsExtracted },
    { k: 'imagesCount', v: qa.imagesCount },
    { k: 'stylesCount', v: qa.stylesCount },
    { k: 'scriptsCount', v: qa.scriptsCount },
    { k: 'assetsFound', v: qa.assetsFound },
    { k: 'invalidRefs', v: (qa.invalidRefs && qa.invalidRefs.length) || 0 }
  ]
  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">QA Summary</div>
        <div className="flex items-center gap-2">
          {onPromote && (
            <button onClick={onPromote} className="px-2 py-1 bg-slate-200 rounded text-xs">Promote baseline</button>
          )}
          {onRebuild && (
            <button onClick={onRebuild} disabled={rebuilding} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs disabled:opacity-50">
              {rebuilding ? 'Rebuilding…' : 'Rebuild'}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {rows.map(r => (
          <div key={r.k} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded">
            <span className="text-slate-600">{r.k}</span>
            <span className="font-mono">{String(r.v ?? '—')}</span>
          </div>
        ))}
      </div>
      {qa.invalidRefs && qa.invalidRefs.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-slate-600">Show invalid refs</summary>
          <ul className="list-disc ml-5 text-xs mt-1">
            {qa.invalidRefs.slice(0, 50).map((u, i) => (<li key={i} className="truncate"><a className="underline" href={u} target="_blank" rel="noreferrer">{u}</a></li>))}
          </ul>
        </details>
      )}
    </div>
  )
}
function App(){
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const [logs, setLogs] = useState([])
  const [rebuilding, setRebuilding] = useState(false)
  const [platforms, setPlatforms] = useState(['salla'])
  const [busyTheme, setBusyTheme] = useState(null)
  const [toast, setToast] = useState(null)
  const [progress, setProgress] = useState({ pct: 0, text: '' })
  useEffect(() => {
    const s = io('http://localhost:5174')
    s.on('build:start', ({ name }) => { setBusyTheme(name); setToast({ type:'info', text:`Building ${name}…` }); setProgress({ pct: 5, text: `Starting ${name}` }) })
    s.on('build:log', ({ name, data }) => {
      const line = String(data || '')
      let pct = 10; let text = 'Working…'
      if (/Processed:/i.test(line)) { pct = 25; text = 'Parsing HTML' }
      if (/Wrote consolidated canonical/i.test(line)) { pct = 35; text = 'Canonical written' }
      if (/Smart Input Validation/i.test(line)) { pct = 45; text = 'Validating canonical' }
      if (/adapter output/i.test(line)) { pct = 60; text = 'Adapter: assets/locales/export' }
      if (/Exported build/i.test(line)) { pct = 70; text = 'Exported core ZIP' }
      if (/Generated:\s+build/i.test(line)) { pct = 80; text = 'Build generated' }
      if (/theme generated/i.test(line)) { pct = 88; text = 'Adapter output ready' }
      if (/QA Summary/i.test(line)) { pct = 95; text = 'Finalizing QA' }
      setProgress(prev => ({ pct: Math.max(prev.pct, pct), text }))
    })
    s.on('build:complete', ({ name, code }) => { setBusyTheme(null); setToast({ type: code===0 ? 'success' : 'error', text:`Build ${code===0?'succeeded':'failed'} for ${name}` }); setProgress({ pct: 100, text: `Done (${code===0?'success':'failed'})` }); setTimeout(()=> setToast(null), 3000) })
    return () => s.close()
  }, [])
  useEffect(() => {
    if (!selected) { setDetails(null); return }
    fetch(`/api/theme/${encodeURIComponent(selected)}`).then(r=>r.json()).then(setDetails)
  }, [selected])
  const downloadCanonical = () => {
    try {
      const blob = new Blob([JSON.stringify((details && details.themeJson) || {}, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selected}-theme.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {}
  }
  const rebuild = async () => {
    if (!selected) return
    try {
      setRebuilding(true)
      await fetch(`/api/build/${encodeURIComponent(selected)}`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ platforms: platforms.join(',') }) })
      const d = await fetch(`/api/theme/${encodeURIComponent(selected)}`).then(r=>r.json())
      setDetails(d)
    } finally {
      setRebuilding(false)
    }
  }
  return (
    <div>
      <header className="bg-white border-b p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Beto Factory Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">localhost:5174</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Platforms:</span>
            {['salla','zid','shopify'].map(p => (
              <label key={p} className="flex items-center gap-1"><input type="checkbox" checked={platforms.includes(p)} onChange={(e)=> setPlatforms(prev => e.target.checked ? Array.from(new Set([...prev, p])) : prev.filter(x=>x!==p))} /> {p}</label>
            ))}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto">
        {toast && (
          <div className={`mx-4 mt-3 px-3 py-2 rounded text-white ${toast.type==='success'?'bg-emerald-600': toast.type==='error'?'bg-rose-600':'bg-slate-700'}`}>{toast.text}</div>
        )}
        {busyTheme && <ProgressBar pct={progress.pct} text={progress.text} />}
        {!selected && <ThemeList onSelect={setSelected} selectedPlatforms={platforms} busyTheme={busyTheme} />}
        {selected && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Theme: <span className="font-mono">{selected}</span></h2>
              <button onClick={()=> setSelected(null)} className="px-3 py-1 bg-slate-200 rounded">Back</button>
            </div>
            {!details ? <div className="text-slate-500">Loading…</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Canonical theme.json</h3>
                    <button onClick={downloadCanonical} className="px-2 py-1 bg-slate-200 rounded text-xs">Download canonical</button>
                  </div>
                  <pre className="text-xs overflow-auto h-64">{JSON.stringify(details.themeJson, null, 2)}</pre>
                </div>
                <div className="bg-white border rounded p-3">
                  <QACanonicalSummary qa={details.qa} onRebuild={rebuild} rebuilding={rebuilding} onPromote={async ()=>{
                    try {
                      await fetch(`/api/qa/promote/${encodeURIComponent(selected)}`, { method: 'POST' })
                      alert('Baselines promoted')
                    } catch {}
                  }} />
                  <div className="h-3" />
                  <h3 className="font-semibold mb-1">Meta</h3>
                  <pre className="text-xs overflow-auto h-40">{JSON.stringify(details.meta || {}, null, 2)}</pre>
                </div>
                <div className="bg-white border rounded p-3 md:col-span-2">
                  <h3 className="font-semibold mb-2">Build outputs</h3>
                  <BuildFiles details={details} selected={selected} busyTheme={busyTheme} platformStatus={platformStatus} />
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


















