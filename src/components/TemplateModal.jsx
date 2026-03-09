import { useState, useRef } from 'react'
import JSZip from 'jszip'
import yaml from 'js-yaml'

const TemplateModal = ({ isOpen, onClose, templates, onSelect, onUpload, onDelete, onReorder, showToast }) => {
    const fileInputRef = useRef(null)

    if (!isOpen) return null

    const handleMoveUp = (index) => {
        if (index === 0) return;
        const newTemplates = [...templates];
        [newTemplates[index - 1], newTemplates[index]] = [newTemplates[index], newTemplates[index - 1]];
        onReorder(newTemplates);
    }

    const handleMoveDown = (index) => {
        if (index === templates.length - 1) return;
        const newTemplates = [...templates];
        [newTemplates[index], newTemplates[index + 1]] = [newTemplates[index + 1], newTemplates[index]];
        onReorder(newTemplates);
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.name.endsWith('.zip')) {
            alert('Please upload a .zip file')
            return
        }

        try {
            const zip = new JSZip()
            const content = await zip.loadAsync(file)

            // 1. Find and parse conf.yml
            const confFile = content.file(/conf\.yml$/i)[0]
            if (!confFile) throw new Error('conf.yml not found in zip')

            const confText = await confFile.async('string')
            const config = yaml.load(confText)

            // 2. Extract HTML for each step
            const richSteps = await Promise.all((config.steps || []).map(async (step, index) => {
                const stepNum = index + 1
                const htmlFile = content.file(new RegExp(`step${stepNum}\\.html$`, 'i'))[0]
                let html = ''
                if (htmlFile) {
                    html = await htmlFile.async('string')
                }
                return { ...step, html }
            }))

            const templateData = {
                id: config.id || config.name || file.name.replace('.zip', ''),
                name: config.name || file.name.replace('.zip', ''),
                version: config.version || '1.0.0',
                description: config.description || '',
                steps: richSteps
            }

            const existingIndex = templates.findIndex(t => t.id === templateData.id)
            if (existingIndex !== -1) {
                const existingTemp = templates[existingIndex]
                const existingVer = existingTemp.version || 'N/A'
                const newVer = templateData.version

                if (!confirm(`Template ID "${templateData.id}" は既に存在します。\n現在のバージョン: ${existingVer}\nアップロードするバージョン: ${newVer}\n\n上書きしますか？`)) {
                    return
                }
                onUpload(templateData)
                showToast(`"${templateData.id}" を上書きしました (v${newVer})`, 'success')
            } else {
                onUpload(templateData)
                showToast(`"${templateData.id}" を新しく追加しました (v${templateData.version})`, 'success')
            }
        } catch (err) {
            console.error(err)
            alert('Error processing zip: ' + err.message)
        } finally {
            e.target.value = '' // Reset input
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] relative">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-orange-500">📋</span> Template選択
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
                    <p className="text-xs text-slate-400">
                        追加するStageのテンプレートを選択してください。独自のテンプレートをアップロードすることも可能です。
                    </p>

                    <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg overflow-y-auto custom-scrollbar min-h-[400px]">
                        {templates.map((template, idx) => (
                            <div
                                key={idx}
                                className="w-full text-left p-5 border-b border-slate-800/50 hover:bg-slate-800/50 transition-all group relative"
                            >
                                <div className="flex justify-between items-start">
                                    <div
                                        className="flex-1 cursor-pointer"
                                        onClick={() => onSelect(template)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-200 group-hover:text-orange-400 transition-colors">
                                                {template.name}
                                            </span>
                                            {template.version && (
                                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono border border-slate-700">
                                                    v{template.version}
                                                </span>
                                            )}
                                        </div>
                                        {template.description && (
                                            <div className="text-xs text-slate-400 mt-0.5 italic">
                                                {template.description}
                                            </div>
                                        )}
                                        <div className="text-xs text-slate-500 mt-1">
                                            {template.id}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {template.steps?.length || 0} steps included
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 border-l border-slate-700 pl-3 ml-2">
                                        <div className="flex gap-1 mb-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMoveUp(idx);
                                                }}
                                                disabled={idx === 0}
                                                className={`p-1 rounded transition-colors text-xs flex items-center justify-center border ${idx === 0 ? 'text-slate-600 border-transparent cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-700 active:scale-90'}`}
                                                title="上へ移動"
                                            >
                                                ▲
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMoveDown(idx);
                                                }}
                                                disabled={idx === templates.length - 1}
                                                className={`p-1 rounded transition-colors text-xs flex items-center justify-center border ${idx === templates.length - 1 ? 'text-slate-600 border-transparent cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-700 active:scale-90'}`}
                                                title="下へ移動"
                                            >
                                                ▼
                                            </button>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Template "${template.name}" を削除しますか？`)) {
                                                    onDelete(template.id);
                                                }
                                            }}
                                            className="text-slate-500 hover:text-red-400 p-1.5 transition-colors text-lg active:scale-90 bg-slate-800/50 hover:bg-red-500/10 rounded-lg w-full flex items-center justify-center"
                                            title="削除"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 flex gap-3 justify-between bg-slate-800/20">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".zip"
                    />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold border border-slate-700 transition-all active:scale-95"
                    >
                        Upload Temp.
                    </button>
                    <div className="flex gap-3 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TemplateModal
