import { useState, useEffect, useRef } from 'react'
import TemplateModal from './TemplateModal'
import DfmCase from '../models/DfmCase'
import { calculateNcDate } from '../utils/dateUtils'

const Stage = ({ stage, isActive, onToggle, onUpdate, onDelete, onMoveUp, onMoveDown, activeStepId, onStepToggle }) => {
    const containerRef = useRef(null);
    const activeTab = activeStepId || (Array.isArray(stage.steps) ? 'step-0' : 'llm')

    // Force script execution after innerHTML injection
    useEffect(() => {
        if (isActive && containerRef.current) {
            const scripts = containerRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Copy all attributes
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                // Copy content
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                // Replace old script with new one to trigger execution
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
        }
    }, [isActive, activeTab, stage]);

    const handleSaveStep = () => {
        if (!containerRef.current) return;

        const stepIndex = parseInt(activeTab.replace('step-', ''));
        const updatedStep = { ...(stage.steps[stepIndex] || {}) };

        const inputs = containerRef.current.querySelectorAll('input, textarea, select, [contenteditable]');
        inputs.forEach(el => {
            const name = el.getAttribute('name');
            if (!name) return;

            let value;
            if (el.hasAttribute('contenteditable')) {
                value = el.innerHTML;
            } else {
                value = el.value;
            }
            updatedStep[name] = value;
        });

        const newSteps = [...stage.steps];
        newSteps[stepIndex] = updatedStep;
        onUpdate({ ...stage, steps: newSteps });
    };

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
                    <span className="text-slate-400 font-bold">Current NC: </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="date"
                            className="bg-slate-100 rounded-l px-2 py-0.5 text-xs w-32 text-center border-none focus:ring-1 focus:ring-orange-500"
                            value={stage.nc}
                            onChange={(e) => onUpdate({ ...stage, nc: e.target.value })}
                        />
                        <button
                            title="Next NC (3 business days later)"
                            className="bg-slate-200 hover:bg-slate-300 px-2 py-0.5 mx-2 text-[10px] font-bold rounded-r transition-colors border-l border-white text-slate-600"
                            onClick={() => {
                                const current = stage.nc ? new Date(stage.nc) : new Date();
                                const next = calculateNcDate(current, 3);
                                const nextStr = next.toISOString().split('T')[0];
                                onUpdate({ ...stage, nc: nextStr });
                            }}
                        >
                            Next NC
                        </button>
                    </div>
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
                        {(stage.steps && Array.isArray(stage.steps) ? stage.steps : []).map((step, idx) => {
                            const name = typeof step === 'string' ? step : step.name;
                            const tabId = typeof step === 'string' ? ['llm', 'confirm', 'reply'][idx] : `step-${idx}`;
                            return (
                                <button
                                    key={idx}
                                    className={`flex-1 py-1 px-3 text-xs rounded transition-all whitespace-nowrap ${activeTab === tabId ? 'bg-white shadow-sm text-slate-800 font-bold' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                    onClick={() => onStepToggle(tabId)}
                                >
                                    {name}
                                </button>
                            )
                        })}
                    </div>

                    <div className="bg-emerald-50 rounded-lg border border-emerald-100 min-h-[200px] overflow-hidden">
                        {/* Custom Template Rendering */}
                        {Array.isArray(stage.steps) ? (
                            <div
                                ref={containerRef}
                                className="h-full w-full"
                                dangerouslySetInnerHTML={{
                                    __html: stage.steps[parseInt(activeTab.replace('step-', ''))]?.html || '<div class="p-10 text-center text-slate-400">No content for this step</div>'
                                }}
                            />
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

                    {/* Save Button for custom steps */}
                    {Array.isArray(stage.steps) && (
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={handleSaveStep}
                                className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 shadow-sm transition-all active:scale-95 flex items-center gap-2"
                            >
                                💾 保存
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const MainContent = ({ activeCase, onUpdateCase, settings, templates, onUploadTemplate, onDeleteTemplate, onReorderTemplate }) => {
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)

    // Global event listener for contenteditable elements
    useEffect(() => {
        const handlePaste = (e) => {
            const target = e.target;
            if (!target.isContentEditable) return;

            // Handle image paste
            if (e.clipboardData.items) {
                for (let i = 0; i < e.clipboardData.items.length; i++) {
                    const item = e.clipboardData.items[i];
                    if (item.type.indexOf("image") !== -1) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const img = document.createElement("img");
                            img.src = event.target.result;
                            img.className = "max-w-full h-auto my-2 rounded-lg border border-slate-200 shadow-sm"; // default styling for pasted images
                            
                            const selection = window.getSelection();
                            if (selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                range.deleteContents();
                                range.insertNode(img);
                                range.collapse(false);
                            } else {
                                target.appendChild(img);
                            }
                        };
                        reader.readAsDataURL(blob);
                        return; // Done after first image
                    }
                }
            }

            // Handle URL paste
            const text = e.clipboardData.getData("text/plain");
            if (text && text.match(/^https?:\/\/.+/)) {
                e.preventDefault();
                const a = document.createElement("a");
                a.href = text;
                a.textContent = text;
                a.className = "text-blue-500 hover:text-blue-600 underline cursor-pointer";
                a.target = "_blank";
                a.contentEditable = "false"; 
                
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(a);
                    
                    // Add a space after the link to allow typing continuously
                    const space = document.createTextNode(" ");
                    a.parentNode.insertBefore(space, a.nextSibling);
                    range.setStartAfter(space);
                    range.collapse(true);
                    
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    target.appendChild(a);
                    target.appendChild(document.createTextNode(" "));
                }
            }
        };

        const handleKeyDown = (e) => {
            const target = e.target;
            if (!target.isContentEditable) return;

            if (e.key === "Enter") {
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && selection.isCollapsed) {
                    const range = selection.getRangeAt(0);
                    const node = range.startContainer;
                    
                    if (node.nodeType === Node.TEXT_NODE) {
                        const textToCursor = node.textContent.substring(0, range.startOffset);
                        // Regex looks for http/https URLs at the end of the line
                        const urlMatch = textToCursor.match(/(?:^|\s)(https?:\/\/[^\s]+)$/);
                        
                        if (urlMatch) {
                            // Check if already inside an anchor tag
                            if (node.parentElement && node.parentElement.closest('a')) {
                                return;
                            }

                            const url = urlMatch[1];
                            const urlStart = textToCursor.lastIndexOf(url);
                            
                            const beforeUrlText = node.textContent.substring(0, urlStart);
                            const afterUrlText = node.textContent.substring(urlStart + url.length);
                            
                            const parent = node.parentNode;
                            
                            const beforeNode = document.createTextNode(beforeUrlText);
                            const afterNode = document.createTextNode(afterUrlText);
                            
                            const a = document.createElement('a');
                            a.href = url;
                            a.textContent = url;
                            a.className = 'text-blue-500 hover:text-blue-600 underline cursor-pointer';
                            a.target = '_blank';
                            a.contentEditable = "false";
                            
                            parent.insertBefore(beforeNode, node);
                            parent.insertBefore(a, node);
                            parent.insertBefore(afterNode, node);
                            parent.removeChild(node);
                            
                            // Let the default Enter behavior happen on the afterNode
                            const newRange = document.createRange();
                            newRange.setStart(afterNode, 0);
                            newRange.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                        }
                    }
                }
            }
        };

        document.addEventListener("paste", handlePaste);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("paste", handlePaste);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

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
        const uid = Date.now().toString();
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const newStage = {
            id: uid,
            name: template.name,
            nc: today,
            steps: (template.steps || []).map(step => ({
                ...step,
                html: window.ejs.render(step.html || '', {
                    uid: uid,
                    currentCase: window.currentCase
                })
            }))
        }

        const updatedCase = new DfmCase(activeCase, settings)
        updatedCase.stages = [...activeCase.stages, newStage]
        updatedCase.activeStageId = newStage.id
        updatedCase.activeStepId = 'step-0' // Default to first step for new template

        onUpdateCase(updatedCase)
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

    const handleDoubleClick = async (e) => {
        const target = e.target;
        // Check if the clicked element has the specific data attribute
        if (target && target.dataset.doubleclick === 'copy') {
            try {
                // Initialize visual feedback early
                const originalBg = target.style.backgroundColor;
                const originalTransition = target.style.transition;
                const feedbackAction = () => {
                    target.style.transition = 'background-color 0.2s ease-out';
                    target.style.backgroundColor = '#d1fae5'; // emerald-100
                    setTimeout(() => {
                        target.style.backgroundColor = originalBg;
                        setTimeout(() => { target.style.transition = originalTransition; }, 200);
                    }, 200);
                };

                // Handle input/textarea
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    target.select();
                    if (target.value) {
                        await navigator.clipboard.writeText(target.value);
                        feedbackAction();
                    }
                }
                // Handle contenteditable elements
                else if (target.isContentEditable) {
                    const range = document.createRange();
                    range.selectNodeContents(target);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    
                    const htmlContent = target.innerHTML;
                    
                    // Convert HTML to Plain Text by replacing HTML breaks with \n
                    const cleanHtml = (html) => {
                        return html.replace(/<br\s*\/?>/gi, '\n')
                                   .replace(/<div[^>]*>/gi, '\n')
                                   .replace(/<\/div>/gi, '')
                                   .replace(/<p[^>]*>/gi, '\n')
                                   .replace(/<\/p>/gi, '')
                                   .replace(/&nbsp;/gi, ' ')
                                   .trim();
                    };
                    const tmpDiv = document.createElement('div');
                    tmpDiv.innerHTML = cleanHtml(htmlContent);
                    const plainText = tmpDiv.textContent;

                    if (plainText || htmlContent) {
                        const blobHTML = new Blob([htmlContent], { type: 'text/html' });
                        const blobText = new Blob([plainText], { type: 'text/plain' });
                        
                        await navigator.clipboard.write([new ClipboardItem({
                            'text/html': blobHTML,
                            'text/plain': blobText
                        })]);
                        feedbackAction();
                    }
                }
            } catch (err) {
                console.error('Failed to copy', err);
            }
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6" onDoubleClick={handleDoubleClick}>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 w-full">
                        <input type="text" readOnly data-doubleclick="copy"
                            className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-md text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer w-[250px] text-center"
                            value={activeCase.id} title="Case Number (Double-click to copy)" />
                        <input type="text" readOnly data-doubleclick="copy"
                            className="bg-transparent text-slate-800 font-bold text-2xl focus:outline-none flex-1 truncate cursor-pointer"
                            value={activeCase.title} title="Case Title (Double-click to copy)" />
                    </div>
                </div>

                <div className="space-y-2">
                    {activeCase.stages.map((stage, index) => (
                        <Stage
                            key={stage.id}
                            stage={stage}
                            isActive={activeCase.activeStageId === stage.id}
                            onToggle={() => {
                                const updated = new DfmCase(activeCase, settings)
                                updated.activeStageId = activeCase.activeStageId === stage.id ? null : stage.id
                                onUpdateCase(updated)
                            }}
                            onUpdate={handleUpdateStage}
                            onDelete={() => handleDeleteStage(stage.id)}
                            onMoveUp={() => handleMoveStage(index, -1)}
                            onMoveDown={() => handleMoveStage(index, 1)}
                            activeStepId={activeCase.activeStageId === stage.id ? activeCase.activeStepId : null}
                            onStepToggle={(stepId) => {
                                const updated = new DfmCase(activeCase, settings)
                                updated.activeStepId = stepId
                                onUpdateCase(updated)
                            }}
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
                onReorder={onReorderTemplate}
            />
        </div>
    )
}

export default MainContent
