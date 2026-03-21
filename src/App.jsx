import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import SettingsModal from './components/SettingsModal'
import TemplateModal from './components/TemplateModal'
import NewCaseModal from './components/NewCaseModal'
import ToastContainer from './components/ToastContainer'
import DfmCase from './models/DfmCase'
import { useDfmBridge } from './hooks/useDfmBridge'
import * as dfmScripts from './utils/dfmScripts'
import pkg from '../package.json'
import JSZip from 'jszip'
import { getCaseDb, saveCaseDb, deleteCaseDb } from './utils/db'

const App = () => {
  const [isMigrating, setIsMigrating] = useState(true);

  useEffect(() => {
    const migrateLegacyData = async () => {
      try {
        const legacyKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('dfm_ninja_case_') && key !== 'dfm_ninja_case_index') {
            legacyKeys.push(key);
          }
        }
        
        if (legacyKeys.length === 0) {
          setIsMigrating(false);
          return;
        }

        const zip = new JSZip();
        legacyKeys.forEach(k => {
          const data = localStorage.getItem(k);
          const id = k.replace('dfm_ninja_case_', '');
          zip.file(`MetaData_${id}.json`, data);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const filename = `DfM-Ninja_Backup_${yyyy}${mm}${dd}.zip`;

        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        legacyKeys.forEach(k => localStorage.removeItem(k));
        
        alert('ストレージシステムをIndexedDBにアップグレードしました。バックアップ(ZIP)をダウンロードしましたので、右上の歯車アイコンの「Settings > Backup > Import Cases」から再度インポートしてください。');
      } catch (err) {
        console.error('Migration failed:', err);
      } finally {
        setIsMigrating(false);
      }
    };
    migrateLegacyData();
  }, []);

  // 0. Extract Parent Domain
  useEffect(() => {
    const url = new URL(window.location.href);
    let parentDomain = url.searchParams.get('parentDomain');
    
    if (!parentDomain && url.hash.includes('parentDomain=')) {
        const hashParams = new URLSearchParams(url.hash.substring(1));
        parentDomain = hashParams.get('parentDomain');
        if (parentDomain) {
            hashParams.delete('parentDomain');
            url.hash = hashParams.toString();
        }
    }

    if (parentDomain) {
        localStorage.setItem('dfm_ninja_parent_domain', parentDomain);
        url.searchParams.delete('parentDomain');
        window.history.replaceState(null, '', url.toString());
    }
  }, []);

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
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const hasLegacyHtml = parsed.some(t => t.steps && t.steps.some(s => s.html && s.format !== 'lz'));
        if (hasLegacyHtml) {
            alert('テンプレートのフォーマットが更新されました。現在登録されている一部のテンプレートは互換性がないため非表示になります。お手数ですが、最新の templates.zip を再度 Import してください。');
            const valid = parsed.filter(t => !t.steps || !t.steps.some(s => s.html && s.format !== 'lz'));
            localStorage.setItem('dfm_ninja_templates', JSON.stringify(valid));
            return valid;
        }
        return parsed
      } catch (e) {
        return []
      }
    }
    return []
  })
  const [sysTemplates, setSysTemplates] = useState(() => {
    const saved = localStorage.getItem('dfm_ninja_sys_templates')
    return saved ? JSON.parse(saved) : []
  })
  const [toasts, setToasts] = useState([])
  const toastResolvers = useRef(new Map())

  // 1.5. DfM Bridge
  const { connectionStatus, execDfM, reconnect } = useDfmBridge()

  // 2. Persistence
  useEffect(() => {
    localStorage.setItem('dfm_ninja_case_index', JSON.stringify(cases))
  }, [cases])

  // Expose bridge and scripts to global window for templates
  useEffect(() => {
    window.dfmConnectionStatus = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    window.execDfM = execDfM;
    window.dfmScripts = dfmScripts;
    window.showToast = showToast;

    // Global shortcut prevention (Ctrl+S / Cmd+S)
    const preventSave = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', preventSave);
    return () => window.removeEventListener('keydown', preventSave);
  }, [execDfM]);

  useEffect(() => {
    let mounted = true;
    if (activeCaseId) {
      getCaseDb(activeCaseId).then(saved => {
        if (mounted && saved) {
          setActiveCaseData(new DfmCase(saved, settings))
        }
      }).catch(console.error);
    } else {
      setActiveCaseData(null)
    }
    return () => { mounted = false; };
  }, [activeCaseId, settings])

  useEffect(() => {
    localStorage.setItem('dfm_ninja_settings', JSON.stringify(settings))
    localStorage.setItem('dfm_ninja_raw_yaml', rawYaml)
    localStorage.setItem('dfm_ninja_templates', JSON.stringify(templates))
    localStorage.setItem('dfm_ninja_sys_templates', JSON.stringify(sysTemplates))
  }, [settings, rawYaml, templates, sysTemplates])

  const handleCreateOrUpdateCase = async (jsonData) => {
    const id = jsonData.caseNum || jsonData.id;
    const title = jsonData.caseTitle || jsonData.title || 'New Case';

    const existingData = await getCaseDb(id) || { stages: [] };

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
    await saveCaseDb(newCase.id, newCase.toJSON());

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

  const handleDeleteTemplate = (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

    const handleUpdateCase = async (updatedCase) => {
        const now = new Date().toISOString();
        // Ensure we are dealing with the plain JSON for storage
        const rawData = updatedCase instanceof DfmCase ? updatedCase.toJSON() : { ...updatedCase };
        
        rawData.updatedAt = now;
        if (!rawData.createdAt) rawData.createdAt = now;

        await saveCaseDb(rawData.id, rawData);

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

    // 3. Hash Routing
    useEffect(() => {
        const handleHashChange = async () => {
            const hash = window.location.hash.substring(1); // remove '#'
            if (!hash) return;

            const params = new URLSearchParams(hash);
            const caseId = params.get('caseId');
            const stageId = params.get('stageId');
            const stepId = params.get('stepId');

            if (!caseId) return;

            const caseData = await getCaseDb(caseId);
            if (!caseData) {
                showToast(`Error: Case "${caseId}" not found.`, 'error');
                setActiveCaseId(null);
                window.location.hash = '';
                return;
            }

            let needsUpdate = false;
            
            if (stageId) {
                const stageIndex = caseData.stages.findIndex(s => String(s.id) === String(stageId));
                if (stageIndex === -1) {
                    showToast(`Error: Stage "${stageId}" not found in Case "${caseId}".`, 'error');
                    caseData.activeStageId = null;
                    caseData.activeStepId = null;
                    needsUpdate = true;
                } else {
                    const actualStage = caseData.stages[stageIndex];
                    caseData.activeStageId = actualStage.id;

                    if (stepId) {
                        let actualStepIndex = -1;
                        if (actualStage.steps && actualStage.steps.length > 0) {
                            if (stepId.startsWith('step-')) {
                                const idx = parseInt(stepId.replace('step-', ''), 10);
                                if (!isNaN(idx) && idx >= 0 && idx < actualStage.steps.length) {
                                    actualStepIndex = idx;
                                }
                            } else {
                                actualStepIndex = actualStage.steps.findIndex(s => String(s.id) === String(stepId));
                            }
                        }

                        if (actualStepIndex === -1 && stepId !== 'llm' && actualStage.steps && actualStage.steps.length > 0) {
                            showToast(`Error: Step "${stepId}" not found in Stage "${stageId}".`, 'error');
                            caseData.activeStepId = 'step-0';
                            needsUpdate = true;
                        } else if (actualStepIndex !== -1 || stepId === 'llm') {
                            caseData.activeStepId = stepId;
                        }
                    }
                }
            }
            
            if (needsUpdate) {
                await saveCaseDb(caseId, caseData);
            }

            // Always update state to trigger re-render
            setActiveCaseId(caseId);
            setActiveCaseData(new DfmCase(caseData, settings));
        };

        // Run once on mount to handle initial deep link
        handleHashChange();

        // Listen for subsequent hash changes
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []); // Empty dependency array ensures it only runs on mount and listens cleanly

    // Update Hash when internal active state changes
    useEffect(() => {
        if (!activeCaseData) {
            if (window.location.hash) {
                // To avoid clearing hash if we just started app and haven't processed yet
                // we only clear if we explicitly set activeCaseData to null
            }
            return;
        }
        
        const params = new URLSearchParams();
        params.set('caseId', activeCaseData.id);
        if (activeCaseData.activeStageId) {
            params.set('stageId', activeCaseData.activeStageId);
            if (activeCaseData.activeStepId) {
                params.set('stepId', activeCaseData.activeStepId);
            }
        }
        
        const newHash = `#${params.toString()}`;
        if (window.location.hash !== newHash) {
            // Use replaceState to avoid cluttering history when just clicking around inside the app
            window.history.replaceState(null, '', newHash);
        }
    }, [activeCaseData]);

    // Synchronize current case globally for templates
    window.currentCase = activeCaseData;
    window.sysTemplates = sysTemplates;

    const handleDeleteCase = async (id) => {
        if (window.confirm(`Case ${id} を削除しますか？`)) {
            setCases(prev => prev.filter(c => c.id !== id))
            await deleteCaseDb(id);
            if (activeCaseId === id) {
                setActiveCaseId(null)
            }
        }
    }

    const handleToggleResolveCase = async (id) => {
        const data = await getCaseDb(id);
        if (!data) return;
        
        const now = new Date().toISOString();
        const newResolvedAt = data.resolvedAt ? null : now;
        
        const updatedData = { ...data, resolvedAt: newResolvedAt, updatedAt: now };
        await saveCaseDb(id, updatedData);
        
        // Update index
        setCases(prev => prev.map(c => 
            c.id === id ? { ...c, resolvedAt: newResolvedAt } : c
        ));
        
        // Update active case if it's the one being toggled
        if (activeCaseId === id) {
            setActiveCaseData(new DfmCase(updatedData, settings));
        }

        // Show Toast
        if (newResolvedAt) {
            showToast(`"${id}" Marked as Resolved`, 'success');
        } else {
            showToast(`"${id}" Marked as Unresolved`, 'info');
        }
    }

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        if (toastResolvers.current.has(id)) {
            toastResolvers.current.get(id)();
            toastResolvers.current.delete(id);
        }
    };

    const showToast = (msg, type = 'info', duration = 3000) => {
        const id = Date.now();
        
        // Console logging
        const logger = console[type] || console.log;
        logger(`[Toast:${type}] ${msg}`);

        return new Promise((resolve) => {
            toastResolvers.current.set(id, resolve);
            
            setToasts(prev => {
                const newToasts = [...prev, { id, msg, type, duration }];
                if (newToasts.length > 3) {
                    const removed = newToasts.shift();
                    if (toastResolvers.current.has(removed.id)) {
                        toastResolvers.current.get(removed.id)();
                        toastResolvers.current.delete(removed.id);
                    }
                }
                return newToasts;
            });

            if (duration > 0) {
                setTimeout(() => removeToast(id), duration);
            }
        });
    };

    const handleExtractCase = async () => {
        try {
            const data = await execDfM(dfmScripts.extractCaseData);
            const id = data.caseNum;
            if (!id) {
                showToast('caseNumが取得できませんでした。ページを確認してください。', 'error');
                return;
            }
            const title = data.caseTitle || data.title || 'New Case';
            const existingData = await getCaseDb(id);

            const now = new Date().toISOString();

            if (existingData) {
                const doMerge = window.confirm(`Case "${id}" は既に存在します。最新データで更新しますか？`);
                if (doMerge) {
                    const mergedData = {
                        ...existingData,
                        ...data,
                        id,
                        title,
                        createdAt: existingData.createdAt || now,
                        updatedAt: now,
                    };
                    const updatedCase = new DfmCase(mergedData, settings);
                    await saveCaseDb(id, updatedCase.toJSON());
                    setCases(prev => prev.map(c => c.id === id ? { ...c, title } : c));
                    setActiveCaseId(id);
                    showToast(`Case "${id}" を更新しました。`, 'success');
                } else {
                    setActiveCaseId(id);
                    showToast(`Case "${id}" を更新せず開きました。`, 'warning');
                }
            } else {
                const newData = {
                    ...data,
                    id,
                    title,
                    createdAt: now,
                    updatedAt: now,
                    stages: [],
                };
                const newCase = new DfmCase(newData, settings);
                await saveCaseDb(id, newCase.toJSON());
                setCases(prev => {
                    const exists = prev.some(c => c.id === id);
                    return exists ? prev.map(c => c.id === id ? { ...c, title } : c) : [...prev, { id, title }];
                });
                setActiveCaseId(id);
                showToast(`Case "${id}" を作成しました。`, 'success');
            }
        } catch (err) {
            showToast(`ケースの取得に失敗しました: ${err.message}`, 'error');
        }
    };

    if (isMigrating) {
        return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold text-lg">Migrating Legacy Data...</div>;
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
                onExtractCase={handleExtractCase}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onLogoHover={setIsLogoHovered}
            />
            <ToastContainer toasts={toasts} onRemove={removeToast} />
      <MainContent
        activeCase={activeCaseData}
        onUpdateCase={handleUpdateCase}
        settings={settings}
        templates={templates}
        onUploadTemplate={handleUploadTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onReorderTemplate={setTemplates}
        showToast={showToast}
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
        templates={templates}
        setTemplates={setTemplates}
        showToast={showToast}
      />
      
      {/* GitHub Corner (Top-Left) */}
      <a
        href={pkg.homepage}
        target="_blank"
        rel="noopener noreferrer"
        className={`github-corner transition-opacity duration-300 hover:opacity-[0.4] ${isLogoHovered ? 'opacity-[0.85]' : 'opacity-5'}`}
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
