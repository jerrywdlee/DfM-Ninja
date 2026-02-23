import { useState, useRef } from 'react'
import yaml from 'js-yaml'

const SettingsModal = ({ isOpen, onClose, rawYaml, onSave, sysTemplates = [], setSysTemplates }) => {
    const [code, setCode] = useState(rawYaml || '')
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('yaml') // 'yaml' or 'sysTemp'
    const fileInputRef = useRef(null)

    if (!isOpen) return null

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
                    renderIf: data.renderIf,
                    content: content
                }

                const existingIndex = sysTemplates.findIndex(t => t.id === newTemp.id)
                if (existingIndex !== -1) {
                    if (!confirm(`Sys Template ID "${newTemp.id}" は既に存在します。上書きしますか？`)) {
                        return
                    }
                    const updated = [...sysTemplates]
                    updated[existingIndex] = newTemp
                    setSysTemplates(updated)
                } else {
                    setSysTemplates([...sysTemplates, newTemp])
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

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
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
                                <div key={t.id} className={`p-4 flex justify-between items-center ${index !== sysTemplates.length - 1 ? 'border-b border-slate-800' : ''}`}>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-200 font-bold">{t.title}</span>
                                        <span className="text-xs text-slate-500">{t.id}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteSysTemp(t.id)}
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
