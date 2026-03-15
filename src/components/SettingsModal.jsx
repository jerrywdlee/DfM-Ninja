import { useState, useRef, useEffect } from 'react'
import yaml from 'js-yaml'
import JSZip from 'jszip'
import { bookmarkletCode } from '../utils/bookmarkletCode'
import installBookmarkletImg from '/install-bookmarklet.png'

const SettingsModal = ({ isOpen, onClose, rawYaml, onSave, sysTemplates = [], setSysTemplates, templates = [], setTemplates, showToast }) => {
    const [code, setCode] = useState(rawYaml || '')
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('usage') // 'usage', 'yaml', 'sysTemp', or 'data'
    const fileInputRef = useRef(null)
    const importInputRef = useRef(null)
    const importTemplatesRef = useRef(null)
    const bookmarkletAnchorRef = useRef(null)

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // Shortcut for Save (Ctrl+S / Cmd+S)
    useEffect(() => {
        if (!isOpen) return;

        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isOpen, code]);

    // Set bookmarklet href directly on DOM to bypass React's javascript: security block
    // Must depend on isOpen so it re-runs after the anchor is rendered (modal visible)
    useEffect(() => {
        if (!isOpen || !bookmarkletAnchorRef.current) return;
        const origin = window.location.origin;
        const pathname = window.location.pathname.replace(/\/$/, '');
        const ninja_path = `${origin}${pathname}`;
        const href = `javascript:${bookmarkletCode}`.replace(/\$\{DFM_NINJA_PATH\}/g, ninja_path);
        bookmarkletAnchorRef.current.setAttribute('href', href);
    }, [isOpen]);

    if (!isOpen) return null

    const handleSave = () => {
        try {
            const parsed = yaml.load(code) || {}
            setError(null)
            onSave(code, parsed)
            if (showToast) {
                showToast('設定を保存しました', 'success');
            }
            onClose()
        } catch (e) {
            setError(e.message)
        }
    }


    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target.result
            try {
                // Parse markdown with frontmatter manually since gray-matter requires Buffer
                const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)

                let data = {}
                let content = text

                if (match) {
                    try {
                        data = yaml.load(match[1]) || {}
                    } catch (yErr) {
                        throw new Error("Invalid YAML Frontmatter: " + yErr.message)
                    }
                    content = match[2]
                } else {
                    throw new Error("Missing YAML Frontmatter (---) at the start of the file.")
                }

                if (!data || !data.id) {
                    alert('Error: YAML Frontmatter must contain an "id" property.\n\nExample:\n---\nid: footerNormal\ntitle: Footer - 通常\n---\n...')
                    return
                }

                const newTemp = {
                    id: data.id,
                    title: data.title || data.id,
                    version: data.version || '1.0.0',
                    renderIf: data.renderIf,
                    content: content
                }

                const existingIndex = sysTemplates.findIndex(t => t.id === newTemp.id)
                if (existingIndex !== -1) {
                    const existingTemp = sysTemplates[existingIndex]
                    const existingVer = existingTemp.version || 'N/A'
                    const newVer = newTemp.version

                    if (!confirm(`Sys Template ID "${newTemp.id}" は既に存在します。\n現在のバージョン: ${existingVer}\nアップロードするバージョン: ${newVer}\n\n上書きしますか？`)) {
                        return
                    }
                    const updated = [...sysTemplates]
                    updated[existingIndex] = newTemp
                    setSysTemplates(updated)
                    showToast(`"${newTemp.id}" を上書きしました (v${newVer})`, 'success')
                } else {
                    setSysTemplates([...sysTemplates, newTemp])
                    showToast(`"${newTemp.id}" を新しく追加しました (v${newTemp.version})`, 'success')
                }
            } catch (err) {
                showToast(`MD/YAMLの解析に失敗しました: ${err.message}`, 'error')
            }
        }
        reader.readAsText(file)
        e.target.value = '' // Reset input
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    const handleDeleteSysTemp = (id) => {
        if (confirm(`System Template "${id}" を削除しますか？`)) {
            setSysTemplates(sysTemplates.filter(t => t.id !== id))
        }
    }

    const handleExportCases = async () => {
        try {
            const indexStr = localStorage.getItem('dfm_ninja_case_index');
            if (!indexStr) {
                alert('No cases to export.');
                return;
            }
            const index = JSON.parse(indexStr);
            if (!Array.isArray(index) || index.length === 0) {
                alert('No cases to export.');
                return;
            }

            const zip = new JSZip();
            index.forEach(item => {
                const caseDataStr = localStorage.getItem(`dfm_ninja_case_${item.id}`);
                if (caseDataStr) {
                    zip.file(`MetaData_${item.id}.json`, caseDataStr);
                }
            });

            const content = await zip.generateAsync({ type: 'blob' });
            
            // Generate filename with YYYYMMDD
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const filename = `DfM-Ninja_Backup_${yyyy}${mm}${dd}.zip`;

            // Trigger download
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Export failed: ' + e.message);
        }
    };

    const handleResetCases = () => {
        if (!confirm('本当にすべてのケースを削除しますか？\n（※テンプレートや設定は保持されます）\n\nこの操作は元に戻せません。')) {
            return;
        }
        
        const indexStr = localStorage.getItem('dfm_ninja_case_index');
        if (indexStr) {
            try {
                const index = JSON.parse(indexStr);
                index.forEach(item => {
                    localStorage.removeItem(`dfm_ninja_case_${item.id}`);
                });
            } catch(e) {}
        }
        
        localStorage.removeItem('dfm_ninja_case_index');
        alert('すべてのケースを削除しました。画面をリロードします。');
        window.location.reload();
    };

    const handleImportCases = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('バックアップファイル内のケースを取り込みますか？\n（同じ Case ID が存在する場合は上書きされます）')) {
            e.target.value = '';
            return;
        }

        try {
            const zip = await JSZip.loadAsync(file);
            const files = Object.keys(zip.files).filter(name => name.endsWith('.json'));
            
            if (files.length === 0) {
                alert('有効なJSONファイルが見つかりませんでした。');
                return;
            }

            let index = [];
            const indexStr = localStorage.getItem('dfm_ninja_case_index');
            if (indexStr) {
                try {
                    index = JSON.parse(indexStr);
                } catch(e) {}
            }

            let importedCount = 0;

            for (const filename of files) {
                const content = await zip.files[filename].async('string');
                try {
                    const caseData = JSON.parse(content);
                    const id = caseData.id || caseData.caseNum;
                    const title = caseData.title || caseData.caseTitle || 'Imported Case';
                    
                    if (id) {
                        localStorage.setItem(`dfm_ninja_case_${id}`, JSON.stringify(caseData));
                        
                        // Update index
                        const existingIdx = index.findIndex(item => item.id === id);
                        if (existingIdx >= 0) {
                            index[existingIdx] = { id, title };
                        } else {
                            index.push({ id, title });
                        }
                        importedCount++;
                    }
                } catch (parseErr) {
                    console.error('Failed to parse ' + filename, parseErr);
                }
            }

            localStorage.setItem('dfm_ninja_case_index', JSON.stringify(index));
            alert(`${importedCount} 件のケースを取り込みました。画面をリロードします。`);
            window.location.reload();

        } catch (e) {
            alert('取り込みに失敗しました: ' + e.message);
        } finally {
            e.target.value = '';
        }
    }

    const handleImportTemplates = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            alert('テンプレートの一括インポートは templates.zip を指定してください');
            e.target.value = '';
            return;
        }

        if (!confirm('テンプレートを一括インポート（上書き）します。よろしいですか？\n※ Settings.yml は上書きされません')) {
            e.target.value = '';
            return;
        }

        try {
            const masterZip = await JSZip.loadAsync(file);
            let importedSysCount = 0;
            let importedStageCount = 0;

            const newSysTemplates = [...sysTemplates];
            const newStageTemplates = [...templates];

            for (const [filename, fileData] of Object.entries(masterZip.files)) {
                if (!fileData.dir && filename.endsWith('.zip')) {
                    const innerBuffer = await fileData.async('arraybuffer');
                    const innerZip = await JSZip.loadAsync(innerBuffer);

                    if (filename === 'Settings.zip') {
                        // Extract Sys Temp from .md files
                        for (const [innerName, innerData] of Object.entries(innerZip.files)) {
                            if (!innerData.dir && innerName.endsWith('.md')) {
                                const text = await innerData.async('string');
                                const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
                                if (match) {
                                    try {
                                        const data = yaml.load(match[1]) || {};
                                        if (data.id) {
                                            const newTemp = {
                                                id: data.id,
                                                title: data.title || data.id,
                                                version: data.version || '1.0.0',
                                                renderIf: data.renderIf,
                                                content: match[2]
                                            };
                                            const existingIndex = newSysTemplates.findIndex(t => t.id === newTemp.id);
                                            if (existingIndex !== -1) {
                                                newSysTemplates[existingIndex] = newTemp;
                                            } else {
                                                newSysTemplates.push(newTemp);
                                            }
                                            importedSysCount++;
                                        }
                                    } catch (err) {
                                        console.error('Failed to parse md frontmatter:', innerName, err);
                                    }
                                }
                            }
                        }
                    } else {
                        // Stage template
                        const confFileKeys = Object.keys(innerZip.files).filter(k => /conf\.yml$/i.test(k));
                        if (confFileKeys.length > 0) {
                            const confFile = innerZip.files[confFileKeys[0]];
                            const confText = await confFile.async('string');
                            const config = yaml.load(confText);

                            const richSteps = [];
                            if (config.steps) {
                                for (let i = 0; i < config.steps.length; i++) {
                                    const stepNum = i + 1;
                                    const htmlRegex = new RegExp(`step${stepNum}\\.html$`, 'i');
                                    const htmlFileKeys = Object.keys(innerZip.files).filter(k => htmlRegex.test(k));
                                    let html = '';
                                    if (htmlFileKeys.length > 0) {
                                        html = await innerZip.files[htmlFileKeys[0]].async('string');
                                    }
                                    richSteps.push({ ...config.steps[i], html });
                                }
                            }

                            const templateId = config.id || config.name || filename.replace('.zip', '');
                            const templateData = {
                                id: templateId,
                                name: config.name || templateId,
                                version: config.version || '1.0.0',
                                description: config.description || '',
                                steps: richSteps
                            };

                            const existingIndex = newStageTemplates.findIndex(t => t.id === templateData.id);
                            if (existingIndex !== -1) {
                                newStageTemplates[existingIndex] = templateData;
                            } else {
                                newStageTemplates.push(templateData);
                            }
                            importedStageCount++;
                        }
                    }
                }
            }

            setSysTemplates(newSysTemplates);
            setTemplates(newStageTemplates);

            if (showToast) {
                showToast(`Sys Temp: ${importedSysCount}件、Stage Template: ${importedStageCount}件 をインポートしました。`, 'success');
            } else {
                alert(`Sys Temp: ${importedSysCount}件、Stage Template: ${importedStageCount}件 をインポートしました。`);
            }

        } catch (err) {
            console.error(err);
            alert('テンプレートの取り込みに失敗しました: ' + err.message);
        } finally {
            e.target.value = '';
        }
    };;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] relative">
                <div className="p-4 border-b border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-orange-500">⚙️</span> System Settings
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-slate-950/50 rounded-lg p-1 w-fit border border-slate-800">
                        <button
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'usage' ? 'bg-slate-800 text-orange-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                            onClick={() => setActiveTab('usage')}
                        >
                            🥷 Usage
                        </button>
                        <button
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'yaml' ? 'bg-slate-800 text-orange-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                            onClick={() => setActiveTab('yaml')}
                        >
                            YAML
                        </button>
                        <button
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'sysTemp' ? 'bg-slate-800 text-orange-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                            onClick={() => setActiveTab('sysTemp')}
                        >
                            Sys Temp.
                        </button>
                        <button
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'data' ? 'bg-slate-800 text-orange-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                            onClick={() => setActiveTab('data')}
                        >
                            Data Backup
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
                {/* Usage Tab Content */}
                    <div className={`flex-1 flex flex-col gap-6 items-center justify-center min-h-0 ${activeTab === 'usage' ? 'flex' : 'hidden'}`}>
                        <div className="text-center space-y-2">
                            <p className="text-sm text-slate-300 font-semibold">以下のボタンをブラウザの<span className="text-orange-400">ブックマークバーへドラッグ</span>してインストール</p>
                            <p className="text-xs text-slate-500">ブックマークバーが非表示の場合は <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-700">Ctrl+Shift+B</kbd> / <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-700">⌘+Shift+B</kbd> で表示できます</p>
                        </div>

                        {/* Draggable bookmarklet anchor */}
                        <a
                            ref={bookmarkletAnchorRef}
                            draggable
                            onClick={(e) => {
                                e.preventDefault();
                                alert('このリンクをブックマークバーへドラッグしてインストールしてください。\nここでクリックしても動作しません。');
                            }}
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-xl font-black text-white shadow-2xl shadow-orange-900/30 border-2 border-orange-500/40 select-none cursor-grab active:cursor-grabbing"
                            style={{ background: 'linear-gradient(135deg, #92400e 0%, #b45309 40%, #d97706 100%)' }}
                            title="ブックマークバーへドラッグしてインストール"
                        >
                            🥷 DfM-Ninja
                        </a>

                        <img
                            src={installBookmarkletImg}
                            alt="ブックマークバーへドラッグしてインストールする手順"
                            className="w-full max-w-sm rounded-xl opacity-75 select-none pointer-events-none"
                            draggable={false}
                        />

                        <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                            <span className="text-slate-500">↑</span>
                            このボタンをそのままブックマークバーへドラッグ＆ドロップしてください
                        </p>
                    </div>

                    {/* YAML Tab Content */}
                    <div className={`flex-1 flex flex-col gap-4 min-h-0 ${activeTab === 'yaml' ? 'flex' : 'hidden'}`}>
                        <p className="text-xs text-slate-400">
                            Configure system prompts, templates, and UI behavior using YAML format.
                        </p>
                        <div className="flex-1 min-h-[400px] relative border border-slate-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-orange-500/50">
                            <textarea
                                className="absolute inset-0 w-full h-full bg-slate-950 p-4 text-sm font-mono text-emerald-400 resize-none focus:outline-none"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="# Example YAML config\nprompt_template: 'Hello world'"
                                spellCheck="false"
                            />
                        </div>
                        {error && (
                            <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded text-xs font-mono">
                                <strong>YAML Error:</strong> {error}
                            </div>
                        )}
                    </div>

                    {/* Sys Temp Tab Content */}
                    <div className={`flex-1 flex flex-col gap-4 min-h-0 ${activeTab === 'sysTemp' ? '' : 'hidden'}`}>
                        <p className="text-xs text-slate-400">
                            Upload System Templates (.md format with YAML frontmatter).
                        </p>
                        <div className="bg-slate-950 border border-slate-700 rounded-lg flex flex-col flex-1 overflow-y-auto custom-scrollbar min-h-0">
                            {sysTemplates.map((t, index) => (
                                <div 
                                    key={t.id} 
                                    className={`p-4 flex justify-between items-center group hover:bg-slate-900/80 transition-colors cursor-pointer ${index !== sysTemplates.length - 1 ? 'border-b border-slate-800' : ''}`}
                                    onDoubleClick={(e) => {
                                        // prevent body double clicks
                                        e.stopPropagation()
                                        const textToCopy = `{{${t.id}}}`;
                                        navigator.clipboard.writeText(textToCopy).then(() => {
                                            showToast(`コピーしました: ${textToCopy}`, 'info');
                                        });
                                    }}
                                    title="Double-click to copy ID as {{id}}"
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-200 font-bold">{t.title}</span>
                                            {t.version && (
                                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono border border-slate-700">
                                                    v{t.version}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 font-mono group-hover:text-slate-400 transition-colors">{t.id}</span>
                                            <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                (Double-click to copy)
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteSysTemp(t.id)
                                        }}
                                        className="text-red-400 hover:text-white hover:bg-red-500/20 px-2 py-1 rounded transition-colors text-sm font-bold flex gap-1 items-center"
                                        title="Delete Template"
                                    >
                                        ✕ Delete
                                    </button>
                                </div>
                            ))}
                            {sysTemplates.length === 0 && (
                                <div className="p-8 text-slate-500 text-sm flex flex-col items-center justify-center h-full">
                                    <span>No System Templates loaded.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Backup Tab Content */}
                    <div className={`flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar min-h-0 ${activeTab === 'data' ? '' : 'hidden'}`}>
                        <div className="bg-slate-950 border border-slate-700/50 p-6 rounded-xl shadow-inner">
                            <h4 className="text-lg font-bold text-slate-200 mb-2">Export Data</h4>
                            <p className="text-sm text-slate-400 mb-4 pb-4 border-b border-slate-800">
                                現在所有するすべてのケース情報を `MetaData_&lt;caseNum&gt;.json` のセットとし、zip形式でダウンロードします。
                                テンプレートなどの設定はエクスポートされません。
                            </p>
                            <button
                                onClick={handleExportCases}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                📦 Export Cases
                            </button>
                        </div>

                        <div className="bg-slate-950 border border-slate-700/50 p-6 rounded-xl shadow-inner">
                            <h4 className="text-lg font-bold text-slate-200 mb-2">Import Data</h4>
                            <p className="text-sm text-slate-400 mb-4 pb-4 border-b border-slate-800">
                                バックアップとしてエクスポートされたZIPファイルを取り込みます。
                                ローカルに同IDのケースがある場合は<strong>上書き</strong>されます。
                            </p>
                            <input 
                                type="file" 
                                accept=".zip"
                                ref={importInputRef}
                                onChange={handleImportCases}
                                className="hidden"
                            />
                            <button
                                onClick={() => importInputRef.current?.click()}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                📥 Import Cases
                            </button>
                        </div>

                        <div className="bg-slate-950 border border-slate-700/50 p-6 rounded-xl shadow-inner">
                            <h4 className="text-lg font-bold text-slate-200 mb-2">Import Templates</h4>
                            <p className="text-sm text-slate-400 mb-4 pb-4 border-b border-slate-800">
                                `templates.zip` を取り込み、Sys Temp. および Stage Templates を一括で上書き更新します（Settings.ymlは上書きされません）。
                            </p>
                            <input 
                                type="file" 
                                accept=".zip"
                                ref={importTemplatesRef}
                                onChange={handleImportTemplates}
                                className="hidden"
                            />
                            <button
                                onClick={() => importTemplatesRef.current?.click()}
                                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-teal-900/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                📥 Import Templates
                            </button>
                        </div>

                        <div className="bg-red-950/20 border border-red-900/40 p-6 rounded-xl shadow-inner">
                            <h4 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h4>
                            <p className="text-sm text-red-400/70 mb-4 pb-4 border-b border-red-900/40">
                                ローカルに保存されているすべてのケースを削除します。テンプレートや基本設定は保持されます。
                            </p>
                            <button
                                onClick={handleResetCases}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                🗑️ Reset Cases
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-800/20">
                    <div>
                        {activeTab === 'sysTemp' && (
                            <>
                                <input
                                    type="file"
                                    accept=".md"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={triggerFileInput}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <span>Upload Temp.</span>
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        {activeTab === 'yaml' && (
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                            >
                                Save Changes
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SettingsModal
