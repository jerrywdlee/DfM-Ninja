import { useState } from 'react'
import yaml from 'js-yaml'

const SettingsModal = ({ isOpen, onClose, rawYaml, onSave }) => {
    const [code, setCode] = useState(rawYaml || '')
    const [error, setError] = useState(null)

    if (!isOpen) return null

    const handleSave = () => {
        try {
            const parsed = yaml.load(code)
            setError(null)
            onSave(code, parsed)
            onClose()
        } catch (e) {
            setError(e.message)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-orange-500">⚙️</span> System Settings (YAML)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
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

                <div className="p-4 border-t border-slate-800 flex gap-3 justify-end bg-slate-800/20">
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
    )
}

export default SettingsModal
