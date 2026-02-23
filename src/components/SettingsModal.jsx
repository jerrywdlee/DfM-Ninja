import { useState, useRef } from 'react'
import yaml from 'js-yaml'
import JSZip from 'jszip'

const SettingsModal = ({ isOpen, onClose, rawYaml, onSave, sysTemplates = [], setSysTemplates }) => {
    const [code, setCode] = useState(rawYaml || '')
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('yaml') // 'yaml', 'sysTemp', or 'data'
    const [sysTempActionMsg, setSysTempActionMsg] = useState(null)
    const fileInputRef = useRef(null)
    const importInputRef = useRef(null)

    if (!isOpen) return null

    const showSysTempMsg = (msg) => {
        setSysTempActionMsg(msg)
        setTimeout(() => setSysTempActionMsg(null), 3000)
    }

    const handleSave = () => {
        try {
            const parsed = yaml.load(code) || {}
            setError(null)
            onSave(code, parsed)
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
                    showSysTempMsg(`✅ "${newTemp.id}" を上書きしました (v${newVer})`)
                } else {
                    setSysTemplates([...sysTemplates, newTemp])
                    showSysTempMsg(`✨ "${newTemp.id}" を新しく追加しました (v${newTemp.version})`)
                }
            } catch (err) {
                alert(`Error parsing Markdown/YAML:\n${err.message}`)
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
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] relative">
                {sysTempActionMsg && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600/95 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-xl shadow-emerald-900/50 z-[100] animate-fade-in-down whitespace-nowrap">
                        {sysTempActionMsg}
                    </div>
                )}
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

                <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
                    {/* YAML Tab Content */}
                    <div className={`flex-1 flex flex-col gap-4 ${activeTab === 'yaml' ? '' : 'hidden'}`}>
                        <p className="text-xs text-slate-400">
                            Configure system prompts, templates, and UI behavior using YAML format.
                        </p>
                        <div className="flex-1 min-h-[300px] relative border border-slate-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-orange-500/50">
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
                    <div className={`flex-1 flex flex-col gap-4 overflow-y-auto ${activeTab === 'sysTemp' ? '' : 'hidden'}`}>
                        <p className="text-xs text-slate-400">
                            Upload System Templates (.md format with YAML frontmatter).
                        </p>
                        <div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden flex flex-col min-h-[300px]">
                            {sysTemplates.map((t, index) => (
                                <div 
                                    key={t.id} 
                                    className={`p-4 flex justify-between items-center group hover:bg-slate-900/80 transition-colors cursor-pointer ${index !== sysTemplates.length - 1 ? 'border-b border-slate-800' : ''}`}
                                    onDoubleClick={(e) => {
                                        // prevent body double clicks
                                        e.stopPropagation()
                                        const textToCopy = `{{${t.id}}}`;
                                        navigator.clipboard.writeText(textToCopy).then(() => {
                                            showSysTempMsg(`📋 コピーしました: ${textToCopy}`);
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
                    <div className={`flex-1 flex flex-col gap-6 overflow-y-auto ${activeTab === 'data' ? '' : 'hidden'}`}>
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
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SettingsModal
