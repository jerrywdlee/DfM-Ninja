import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import SettingsModal from './components/SettingsModal'
import TemplateModal from './components/TemplateModal'
import NewCaseModal from './components/NewCaseModal'
import DfmCase from './models/DfmCase'
import { useDfmBridge } from './hooks/useDfmBridge'
import * as dfmScripts from './utils/dfmScripts'
import pkg from '../package.json'

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
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false)
  const [isLogoHovered, setIsLogoHovered] = useState(false)
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

    const now = new Date().toISOString();
    const mergedData = {
      ...existingData,
      ...jsonData,
      id,
      title,
      createdAt: existingData.createdAt || now,
      updatedAt: now
    };

    const newCase = new DfmCase(mergedData, settings);

    // Save full data
    localStorage.setItem(`dfm_ninja_case_${newCase.id}`, JSON.stringify(newCase.toJSON()));

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

  const handleReorderTemplates = (newTemplates) => {
    setTemplates(newTemplates)
  }

    const handleUpdateCase = (updatedCase) => {
        const now = new Date().toISOString();
        // Ensure we are dealing with the plain JSON for storage
        const rawData = updatedCase instanceof DfmCase ? updatedCase.toJSON() : { ...updatedCase };
        
        rawData.updatedAt = now;
        if (!rawData.createdAt) rawData.createdAt = now;

        localStorage.setItem(`dfm_ninja_case_${rawData.id}`, JSON.stringify(rawData))

        // Update state with instance to keep methods
        const caseInstance = updatedCase instanceof DfmCase ? updatedCase : new DfmCase(updatedCase, settings);
        caseInstance.updatedAt = now;
        if (!caseInstance.createdAt) caseInstance.createdAt = now;
        
        setActiveCaseData(caseInstance)

        // Update index if title or resolvedAt changed
        setCases(prev => prev.map(c => 
            c.id === rawData.id 
                ? { id: c.id, title: rawData.title, resolvedAt: rawData.resolvedAt } 
                : c
        ));
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

                const now = new Date().toISOString();
                const mergedCaseData = {
                    ...existingData,
                    ...data,
                    createdAt: existingData.createdAt || now,
                    updatedAt: now
                };

                const mergedCase = new DfmCase(mergedCaseData, settings);

                setCases(prev => {
                    const existing = prev.find(c => c.id === id);
                    if (existing) {
                        return prev.map(c => c.id === id ? { id, title, resolvedAt: mergedCase.resolvedAt } : c);
                    }
                    return [...prev, { id, title, resolvedAt: mergedCase.resolvedAt }];
                })
                localStorage.setItem(`dfm_ninja_case_${id}`, JSON.stringify(mergedCase.toJSON()))
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

    const handleToggleResolveCase = (id) => {
        const saved = localStorage.getItem(`dfm_ninja_case_${id}`);
        if (!saved) return;
        
        const data = JSON.parse(saved);
        const now = new Date().toISOString();
        const newResolvedAt = data.resolvedAt ? null : now;
        
        const updatedData = { ...data, resolvedAt: newResolvedAt, updatedAt: now };
        localStorage.setItem(`dfm_ninja_case_${id}`, JSON.stringify(updatedData));
        
        // Update index
        setCases(prev => prev.map(c => 
            c.id === id ? { ...c, resolvedAt: newResolvedAt } : c
        ));
        
        // Update active case if it's the one being toggled
        if (activeCaseId === id) {
            setActiveCaseData(new DfmCase(updatedData, settings));
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
                onToggleResolveCase={handleToggleResolveCase}
                connectionStatus={connectionStatus}
                onReconnect={reconnect}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onLogoHover={setIsLogoHovered}
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
        onReorderTemplate={handleReorderTemplates}
      />
        <TemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          templates={templates}
          onSelect={(template) => {
            if (activeCaseData) {
              const newCase = new DfmCase(activeCaseData.toJSON(), settings)
              newCase.addStageFromTemplate(template)
              handleUpdateCase(newCase)
            }
            setIsTemplateModalOpen(false)
          }}
          onUpload={handleUploadTemplate}
          onDelete={(id) => setTemplates(templates.filter(t => t.id !== id))}
          onReorder={handleReorderTemplates}
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
      
      {/* GitHub Corner (Top-Left) */}
      <a
        href={pkg.homepage}
        target="_blank"
        rel="noopener noreferrer"
        className={`github-corner transition-opacity duration-300 hover:opacity-100 ${isLogoHovered ? 'opacity-100' : 'opacity-5'}`}
        aria-label="View source on GitHub"
        title="View source on GitHub"
        style={{
          position: 'absolute',
          width: '30px',
          height: '30px',
          display: 'inline-block',
          clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)',
          top: 0,
          left: 0,
          zIndex: 100,
          textDecoration: 'none'
        }}
      >
        <svg width="30" height="30" viewBox="0 0 21.147 21.147" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg" fill="#f97316" aria-hidden="true" focusable="false">
          <g transform="rotate(-90 10.5735 10.5735)">
            <path d="M21.147 0H0l9.535 9.535c.024-.025.1-.03.125-.059.258-.23.502-.48.737-.735-.116-.084-.234-.168-.338-.268-.284-.247-.509-.585-.537-.969-.05-.352.178-.652.223-.99.049-.225-.018-.45-.027-.675-.015-.072.03-.167.115-.142.243.091.37.36.402.604.064.354-.12.7-.047 1.054.068.407.423.699.792.843.18-.122.378-.231.597-.259.032-.013.116.008.116-.017-.39-.488-.72-1.073-.725-1.714-.013-.672.348-1.289.8-1.76.377-.44.928-.72 1.505-.763.071-.057.104-.17.164-.247.208-.274.472-.516.785-.665.078-.049.169-.091.229.006.265.28.39.659.494 1.021.04.115.038.253.099.355.344.213.678.445.959.738.316.3.604.63.827 1.005.048.098.108.176.227.173.427.102.877.225 1.212.525.032.035.088.078.073.132a2.064 2.064 0 0 1-.967 1.044c-.009.39-.147.774-.368 1.093a3.65 3.65 0 0 1-1.186 1.002 2.012 2.012 0 0 1-1.067.221c-.608-.029-1.148-.366-1.618-.726a1.283 1.283 0 0 1-.234.666c-.421.479-.896.909-1.322 1.383-.038.022-.029.093-.052.117l9.62 9.619z" />
          </g>
        </svg>
      </a>
    </div>
  )
}

export default App
