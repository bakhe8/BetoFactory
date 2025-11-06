import React, { useEffect, useState } from 'react'
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

function ThemeList() {
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
        <button onClick={refresh} className="px-3 py-1 bg-slate-200 rounded">Refresh</button>
      </div>
      {themes.length === 0 ? <div className="text-slate-500">No folders under /input</div> : (
        <ul className="space-y-2">
          {themes.map(t => (
            <li key={t} className="bg-white border rounded p-3 flex items-center justify-between">
              <span className="font-mono">{t}</span>
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

function App(){
  return (
    <div>
      <header className="bg-white border-b p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Beto Factory Dashboard</h1>
        <div className="text-sm text-slate-500">localhost:5174</div>
      </header>
      <main className="max-w-6xl mx-auto">
        <ThemeList />
        <LogConsole />
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)

