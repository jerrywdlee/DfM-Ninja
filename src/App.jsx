import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import SettingsModal from './components/SettingsModal'
import NewCaseModal from './components/NewCaseModal'
import DfmCase from './models/DfmCase'
import { useDfmBridge } from './hooks/useDfmBridge'
import * as dfmScripts from './utils/dfmScripts'

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false)
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
  const [sysTemplates, setSysTemplates] = useState(() => {
    const saved = localStorage.getItem('dfm_ninja_sys_templates')
    return saved ? JSON.parse(saved) : []
  })

  // 1.5. DfM Bridge
  const { connectionStatus, execDfM, reconnect } = useDfmBridge()

  // 2. Persistence
  useEffect(() => {
    localStorage.setItem('dfm_ninja_case_index', JSON.stringify(cases))
  }, [cases])

  // Expose bridge and scripts to global window for templates
  useEffect(() => {
    window.execDfM = execDfM;
    window.dfmScripts = dfmScripts;
  }, [execDfM]);

  useEffect(() => {
    if (activeCaseId) {
      const saved = localStorage.getItem(`dfm_ninja_case_${activeCaseId}`)
      if (saved) {
        setActiveCaseData(new DfmCase(JSON.parse(saved), settings))
      }
    } else {
      setActiveCaseData(null)
    }
  }, [activeCaseId, settings])

  useEffect(() => {
    localStorage.setItem('dfm_ninja_settings', JSON.stringify(settings))
    localStorage.setItem('dfm_ninja_raw_yaml', rawYaml)
    localStorage.setItem('dfm_ninja_templates', JSON.stringify(templates))
    localStorage.setItem('dfm_ninja_sys_templates', JSON.stringify(sysTemplates))
  }, [settings, rawYaml, templates, sysTemplates])

  const handleCreateOrUpdateCase = (jsonData) => {
    const id = jsonData.caseNum || jsonData.id;
    const title = jsonData.caseTitle || jsonData.title || 'New Case';

    const existingRaw = localStorage.getItem(`dfm_ninja_case_${id}`);
    const existingData = existingRaw ? JSON.parse(existingRaw) : { stages: [] };

    // Update with new data
    const mergedData = {
      ...existingData,
      ...jsonData,
      id,
      title
    };

    const newCase = new DfmCase(mergedData, settings);

    // Save full data
    localStorage.setItem(`dfm_ninja_case_${newCase.id}`, JSON.stringify(newCase));

    // Update Index
    setCases(prev => {
        const idx = prev.findIndex(c => c.id === id);
        if (idx >= 0) {
            const newIndex = [...prev];
            newIndex[idx] = { id, title };
            return newIndex;
        } else {
            return [...prev, { id, title }];
        }
    });

    setActiveCaseId(id);
  }

  const handleUploadTemplate = (newTemp) => {
    const existingIndex = templates.findIndex(t => t.id === newTemp.id)
    if (existingIndex !== -1) {
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
    setActiveCaseData(updatedCase instanceof DfmCase ? updatedCase : new DfmCase(updatedCase, settings))

    // Update index if title changed
    const currentCaseInIndex = cases.find(c => c.id === rawData.id)
    if (currentCaseInIndex && currentCaseInIndex.title !== rawData.title) {
      setCases(cases.map(c => c.id === rawData.id ? { id: c.id, title: rawData.title } : c))
    }
  }

  // 3. Initial Extraction & Global State Sync
  useEffect(() => {
    if (connectionStatus === 'connected') {
      // Data extraction via RPC
      execDfM(dfmScripts.extractCaseData).then(data => {
        const { id, title } = data

        // Merge with existing data if available
        const existingRaw = localStorage.getItem(`dfm_ninja_case_${id}`)
        const existingData = existingRaw ? JSON.parse(existingRaw) : { stages: [] }

        const mergedCase = new DfmCase({
          ...existingData,
          ...data
        }, settings);

        setCases(prev => {
          if (prev.find(c => c.id === id)) return prev
          return [...prev, { id, title }]
        })
        localStorage.setItem(`dfm_ninja_case_${id}`, JSON.stringify(mergedCase))
        setActiveCaseId(id)
      }).catch(err => console.error('Initial RPC extraction failed', err))
    }
  }, [connectionStatus])

  // Synchronize current case globally for templates
  window.currentCase = activeCaseData;
  window.sysTemplates = sysTemplates;

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
        onNewCase={() => setIsNewCaseModalOpen(true)}
        onDeleteCase={handleDeleteCase}
        connectionStatus={connectionStatus}
        onReconnect={reconnect}
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
      <NewCaseModal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        onSave={handleCreateOrUpdateCase}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rawYaml={rawYaml}
        onSave={(yamlText, jsonConfig) => {
          setRawYaml(yamlText)
          setSettings(jsonConfig)
        }}
        sysTemplates={sysTemplates}
        setSysTemplates={setSysTemplates}
      />
    </div>
  )
}

export default App
