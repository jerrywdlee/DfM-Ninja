import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import SettingsModal from './components/SettingsModal'
import DfmCase from './models/DfmCase'

const App = () => {
  // 1. Initial State & Migration
  const [cases, setCases] = useState(() => {
    // Migration: Split dfm_ninja_cases if it exists
    const legacy = localStorage.getItem('dfm_ninja_cases')
    if (legacy) {
      try {
        const legacyData = JSON.parse(legacy)
        const index = legacyData.map(c => ({ id: c.id, title: c.title }))
        localStorage.setItem('dfm_ninja_case_index', JSON.stringify(index))
        legacyData.forEach(c => {
          localStorage.setItem(`dfm_ninja_case_${c.id}`, JSON.stringify(c))
        })
        localStorage.removeItem('dfm_ninja_cases')
        return index
      } catch (e) { console.error('Migration failed', e) }
    }
    const saved = localStorage.getItem('dfm_ninja_case_index')
    return saved ? JSON.parse(saved) : []
  })

  const [activeCaseId, setActiveCaseId] = useState(null)
  const [activeCaseData, setActiveCaseData] = useState(null)

  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('dfm_ninja_settings')
    return saved ? JSON.parse(saved) : { prompt_template: 'Default prompt...' }
  })
  const [rawYaml, setRawYaml] = useState(() => {
    return localStorage.getItem('dfm_ninja_raw_yaml') || ''
  })
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('dfm_ninja_templates')
    return saved ? JSON.parse(saved) : []
  })

  // 2. Persistence
  useEffect(() => {
    localStorage.setItem('dfm_ninja_case_index', JSON.stringify(cases))
  }, [cases])

  useEffect(() => {
    if (activeCaseId) {
      const saved = localStorage.getItem(`dfm_ninja_case_${activeCaseId}`)
      if (saved) {
        setActiveCaseData(new DfmCase(JSON.parse(saved)))
      }
    } else {
      setActiveCaseData(null)
    }
  }, [activeCaseId])

  useEffect(() => {
    localStorage.setItem('dfm_ninja_settings', JSON.stringify(settings))
    localStorage.setItem('dfm_ninja_raw_yaml', rawYaml)
    localStorage.setItem('dfm_ninja_templates', JSON.stringify(templates))
  }, [settings, rawYaml, templates])

  const handleNewCase = () => {
    const id = prompt('Please enter Case ID')
    if (!id) return
    const newCase = new DfmCase({
      id,
      title: 'New Case',
      stages: []
    })
    // Update Index
    setCases([...cases, { id: newCase.id, title: newCase.title }])
    // Save full data
    localStorage.setItem(`dfm_ninja_case_${newCase.id}`, JSON.stringify(newCase))
    setActiveCaseId(id)
  }

  const handleUploadTemplate = (newTemp) => {
    const existingIndex = templates.findIndex(t => t.id === newTemp.id)
    if (existingIndex !== -1) {
      if (!confirm(`テンプレートID "${newTemp.id}" は既に存在します。上書きしますか？`)) {
        return
      }
      setTemplates(prev => {
        const updated = [...prev]
        updated[existingIndex] = newTemp
        return updated
      })
    } else {
      setTemplates(prev => [...prev, newTemp])
    }
  }

  const handleUpdateCase = (updatedCase) => {
    // Ensure we are dealing with the plain JSON for storage
    const rawData = updatedCase instanceof DfmCase ? updatedCase.toJSON() : updatedCase
    localStorage.setItem(`dfm_ninja_case_${rawData.id}`, JSON.stringify(rawData))

    // Update state with instance to keep methods
    setActiveCaseData(updatedCase instanceof DfmCase ? updatedCase : new DfmCase(updatedCase))

    // Update index if title changed
    const currentCaseInIndex = cases.find(c => c.id === rawData.id)
    if (currentCaseInIndex && currentCaseInIndex.title !== rawData.title) {
      setCases(cases.map(c => c.id === rawData.id ? { id: c.id, title: rawData.title } : c))
    }
  }

  // Cross-origin communication handler
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'EXTRACTED_DATA') {
        const { id, title } = event.data.data
        const newCase = new DfmCase({ id, title, stages: [] })
        setCases(prev => {
          if (prev.find(c => c.id === id)) return prev
          return [...prev, { id, title }]
        })
        localStorage.setItem(`dfm_ninja_case_${id}`, JSON.stringify(newCase))
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

  // Synchronize current case globally for templates
  window.currentCase = activeCaseData;

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

  const handleDeleteCase = (id) => {
    if (window.confirm(`Case ${id} を削除しますか？`)) {
      setCases(prev => prev.filter(c => c.id !== id))
      localStorage.removeItem(`dfm_ninja_case_${id}`)
      if (activeCaseId === id) {
        setActiveCaseId(null)
      }
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar
        cases={cases}
        activeCaseId={activeCaseId}
        onSelectCase={setActiveCaseId}
        onNewCase={handleNewCase}
        onDeleteCase={handleDeleteCase}
        connectionStatus={connectionStatus}
        onReconnect={handleReconnect}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <MainContent
        activeCase={activeCaseData}
        onUpdateCase={handleUpdateCase}
        settings={settings}
        templates={templates}
        onUploadTemplate={handleUploadTemplate}
        onDeleteTemplate={(id) => {
          setTemplates(prev => prev.filter(t => t.id !== id))
        }}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rawYaml={rawYaml}
        onSave={(yamlText, jsonConfig) => {
          setRawYaml(yamlText)
          setSettings(jsonConfig)
        }}
      />
    </div>
  )
}

export default App
