import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'

const App = () => {
  const [cases, setCases] = useState(() => {
    const saved = localStorage.getItem('dfm_ninja_cases')
    return saved ? JSON.parse(saved) : []
  })
  const [activeCaseId, setActiveCaseId] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // connected, disconnected

  useEffect(() => {
    localStorage.setItem('dfm_ninja_cases', JSON.stringify(cases))
  }, [cases])

  const activeCase = cases.find(c => c.id === activeCaseId)

  const handleNewCase = () => {
    const id = prompt('Please enter Case ID')
    if (!id) return
    const newCase = {
      id,
      title: 'New Case',
      stages: []
    }
    setCases([...cases, newCase])
    setActiveCaseId(id)
  }

  const handleUpdateCase = (updatedCase) => {
    setCases(cases.map(c => c.id === updatedCase.id ? updatedCase : c))
  }

  // Cross-origin communication handler
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'EXTRACTED_DATA') {
        const { id, title } = event.data.data
        setCases(prev => {
          if (prev.find(c => c.id === id)) return prev
          return [...prev, { id, title, stages: [] }]
        })
        setActiveCaseId(id)
        setConnectionStatus('connected')
      }

      if (event.data.type === 'PONG') {
        setConnectionStatus('connected')
      }
    }
    window.addEventListener('message', handleMessage)

    // Initial Ping
    if (window.opener) {
      window.opener.postMessage({ type: 'PING' }, '*')
    }

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleReconnect = () => {
    if (window.opener) {
      setConnectionStatus('checking...')
      window.opener.postMessage({ type: 'PING' }, '*')
      setTimeout(() => {
        if (connectionStatus !== 'connected') setConnectionStatus('disconnected')
      }, 1000)
    } else {
      alert('Parent window not found. Please run the bookmarklet on the DfM page.')
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar
        cases={cases}
        activeCaseId={activeCaseId}
        onSelectCase={setActiveCaseId}
        onNewCase={handleNewCase}
        connectionStatus={connectionStatus}
        onReconnect={handleReconnect}
      />
      <MainContent
        activeCase={activeCase}
        onUpdateCase={handleUpdateCase}
      />
    </div>
  )
}

export default App
