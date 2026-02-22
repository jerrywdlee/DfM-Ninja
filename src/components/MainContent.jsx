import { useState } from 'react'
import TemplateModal from './TemplateModal'

const Stage = ({ stage, isActive, onToggle, onUpdate, onDelete, onMoveUp, onMoveDown }) => {
    const [activeTab, setActiveTab] = useState(Array.isArray(stage.steps) ? 'step-0' : 'llm')

    return (
        <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <div
                className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${isActive ? 'bg-orange-100' : 'bg-slate-50 hover:bg-slate-100'}`}
                onClick={onToggle}
            >
                <div className="flex items-center gap-4 flex-1">
                    <span className="text-slate-400">{isActive ? '▼' : '▶'}</span>
                    <input
                        className="bg-transparent font-bold text-slate-700 border-none focus:ring-0 p-0"
                        value={stage.name}
                        onChange={(e) => onUpdate({ ...stage, name: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-slate-400 font-bold">NC</span>
                    <input
                        type="date"
                        className="bg-slate-100 rounded px-2 py-0.5 text-xs w-32 text-center border-none focus:ring-1 focus:ring-orange-500"
                        value={stage.nc}
                        onChange={(e) => onUpdate({ ...stage, nc: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={onMoveUp} className="p-1 hover:bg-slate-200 rounded">↑</button>
                    <button onClick={onMoveDown} className="p-1 hover:bg-slate-200 rounded">↓</button>
                    <button onClick={onDelete} className="p-1 hover:bg-red-100 text-red-500 rounded">×</button>
                </div>
            </div>

            {isActive && (
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex mb-4 bg-slate-100 p-1 rounded-md overflow-x-auto">
                        {(stage.steps && Array.isArray(stage.steps) ? stage.steps : ['LLM連携', '確認メール', '回答作成']).map((step, idx) => {
                            const name = typeof step === 'string' ? step : step.name;
                            const tabId = typeof step === 'string' ? ['llm', 'confirm', 'reply'][idx] : `step-${idx}`;
                            return (
                                <button
                                    key={tabId}
                                    className={`flex-1 py-1 px-3 text-xs rounded transition-all whitespace-nowrap ${activeTab === tabId ? 'bg-white shadow-sm text-slate-800 font-bold' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                    onClick={() => setActiveTab(tabId)}
                                >
                                    {name.startsWith('Step:') ? name : `Step: ${name}`}
                                </button>
                            )
                        })}
                    </div>

                    <div className="bg-emerald-50 rounded-lg border border-emerald-100 min-h-[200px] overflow-hidden">
                        {/* Custom Template Rendering */}
                        {Array.isArray(stage.steps) ? (
                            stage.steps.map((step, idx) => (
                                activeTab === `step-${idx}` && (
                                    <div
                                        key={idx}
                                        className="h-full w-full"
                                        dangerouslySetInnerHTML={{ __html: step.html || '<div class="p-10 text-center text-slate-400">No content for this step</div>' }}
                                    />
                                )
                            ))
                        ) : (
                            /* Default Fallback UI */
                            <>
                                {activeTab === 'llm' && (
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Prompt</h4>
                                                <div className="flex gap-2">
                                                    <button title="レンダリング" className="text-xs hover:bg-emerald-200 p-1 rounded transition-colors" onClick={(e) => e.stopPropagation()}>⚡️</button>
                                                    <button title="リセット" className="text-xs hover:bg-emerald-200 p-1 rounded transition-colors" onClick={(e) => e.stopPropagation()}>🔄</button>
                                                </div>
                                            </div>
                                            <textarea className="w-full h-32 p-2 text-xs font-mono border border-emerald-200 rounded bg-white" placeholder="Prompt goes here..." />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-emerald-800 mb-2 uppercase tracking-wide">Json</h4>
                                            <textarea className="w-full h-32 p-2 text-xs font-mono border border-emerald-200 rounded bg-white" placeholder="{ ... }" />
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'confirm' && <div className="p-10 text-center text-emerald-600">Confirmation Email Preview...</div>}
                                {activeTab === 'reply' && <div className="p-10 text-center text-emerald-600">Final Reply Generator...</div>}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

const MainContent = ({ activeCase, onUpdateCase, templates, onUploadTemplate, onDeleteTemplate }) => {
    const [expandedStageId, setExpandedStageId] = useState(null)
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)

    if (!activeCase) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
                ケースを選択するか、新規作成してください
            </div>
        )
    }

    const handleUpdateStage = (updatedStage) => {
        const newStages = activeCase.stages.map(s => s.id === updatedStage.id ? updatedStage : s)
        onUpdateCase({ ...activeCase, stages: newStages })
    }

    const handleAddStage = () => {
        setIsTemplateModalOpen(true)
    }

    const handleSelectTemplate = (template) => {
        const d = new Date()
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const newStage = {
            id: Date.now().toString(),
            name: template.name,
            nc: today,
            steps: template.steps || {}
        }
        onUpdateCase({ ...activeCase, stages: [...activeCase.stages, newStage] })
        setExpandedStageId(newStage.id)
        setIsTemplateModalOpen(false)
    }

    const handleDeleteStage = (id) => {
        const newStages = activeCase.stages.filter(s => s.id !== id)
        onUpdateCase({ ...activeCase, stages: newStages })
    }

    const handleMoveStage = (index, direction) => {
        const newStages = [...activeCase.stages]
        const targetIndex = index + direction
        if (targetIndex < 0 || targetIndex >= newStages.length) return
        [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]]
        onUpdateCase({ ...activeCase, stages: newStages })
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded text-lg font-mono">{activeCase.id}</span>
                        {activeCase.title}
                    </h2>
                </div>

                <div className="space-y-2">
                    {activeCase.stages.map((stage, index) => (
                        <Stage
                            key={stage.id}
                            stage={stage}
                            isActive={expandedStageId === stage.id}
                            onToggle={() => setExpandedStageId(expandedStageId === stage.id ? null : stage.id)}
                            onUpdate={handleUpdateStage}
                            onDelete={() => handleDeleteStage(stage.id)}
                            onMoveUp={() => handleMoveStage(index, -1)}
                            onMoveDown={() => handleMoveStage(index, 1)}
                        />
                    ))}
                </div>

                <button
                    onClick={handleAddStage}
                    className="mt-4 w-full border-2 border-dashed border-slate-300 py-3 rounded-lg text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-all font-bold"
                >
                    + Stage追加
                </button>
            </div>

            <TemplateModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                templates={templates}
                onSelect={handleSelectTemplate}
                onUpload={onUploadTemplate}
                onDelete={onDeleteTemplate}
            />
        </div>
    )
}

export default MainContent
