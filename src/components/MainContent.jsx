import { useState, useEffect, useRef } from 'react'
import TemplateModal from './TemplateModal'
import DfmCase from '../models/DfmCase'
import { calculateNcDate, formatDateIsoLocal, isoToLocalDate } from '../utils/dateUtils'
import LZString from 'lz-string'

const Stage = ({ stage, isActive, onToggle, onUpdate, onDelete, onMoveUp, onMoveDown, activeStepId, onStepToggle, onOpenVariables, settings }) => {
    const containerRef = useRef(null);
    const renderedTabRef = useRef(null);
    const activeTab = activeStepId || 'step-0';

    // Force script execution after innerHTML injection and protect DOM from React reconciliation
    useEffect(() => {
        if (isActive && containerRef.current) {
            if (renderedTabRef.current !== activeTab || !containerRef.current.innerHTML.trim()) {
                const stepIndex = parseInt(activeTab.replace('step-', ''));
                let htmlContent = stage.steps[stepIndex]?.html || '<div class="p-10 text-center text-slate-400">No content for this step</div>';
                
                if (stage.steps[stepIndex]?.format === 'lz' && htmlContent) {
                    try {
                        htmlContent = LZString.decompressFromUTF16(htmlContent) || htmlContent;
                    } catch (e) {
                        console.error('Failed to decompress HTML', e);
                    }
                }

                containerRef.current.innerHTML = htmlContent;
                renderedTabRef.current = activeTab;

                const scripts = containerRef.current.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    // Copy all attributes
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    // Copy content and wrap in a block scope to avoid redeclaration errors (const/let)
                    newScript.appendChild(document.createTextNode(`{ ${oldScript.innerHTML} }`));
                    // Replace old script with new one to trigger execution
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                });
            }
        }
    }, [isActive, activeTab, stage.steps]);

    const handleSaveStep = (showNotification = false) => {
        if (!containerRef.current) return;

        const stepIndex = parseInt(activeTab.replace('step-', ''));
        const updatedStep = { ...(stage.steps[stepIndex] || {}) };

        const inputs = containerRef.current.querySelectorAll('input, textarea, select, [contenteditable]');
        inputs.forEach(el => {
            const name = el.getAttribute('name');
            if (!name) return;

            // For radio/checkbox, only save if it's checked
            if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) {
                return;
            }

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

        // Show success toast only when requested (manual save)
        if (showNotification && window.showToast) {
            window.showToast('保存しました', 'success');
        }
    };

    // Shortcut for Save (Ctrl+S / Cmd+S)
    useEffect(() => {
        if (!isActive) return;

        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveStep(true);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isActive, activeTab, stage.steps]);

    return (
        <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <div
                className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${isActive ? 'bg-orange-100' : 'bg-slate-50 hover:bg-slate-100'}`}
                onClick={onToggle}
            >
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <span className="text-slate-400 shrink-0 w-4">{isActive ? '▼' : '▶'}</span>
                    <input
                        className="bg-transparent font-bold text-slate-700 border-none focus:ring-0 p-0 text-sm truncate min-w-[130px] sm:min-w-[150px] w-auto"
                        value={stage.name}
                        data-doubleclick="copy"
                        onChange={(e) => onUpdate({ ...stage, name: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className="flex items-center gap-4 ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Curt. NC */}
                        <div className="flex items-center gap-1.5 group">
                            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-tight">Curt. NC</span>
                            <input
                                type="date"
                                className="bg-slate-100 rounded px-2 py-0.5 text-[11px] w-[115px] text-center border border-transparent focus:border-orange-500 focus:ring-0"
                                value={stage.nc}
                                onChange={(e) => onUpdate({ ...stage, nc: e.target.value })}
                            />
                        </div>

                        {/* Send At */}
                        <div className="flex items-center gap-1.5 group">
                            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-tight text-orange-600/70">Send At</span>
                            <input
                                type="date"
                                className="bg-slate-100 rounded px-2 py-0.5 text-[11px] w-[115px] text-center border border-transparent focus:border-orange-500 focus:ring-0"
                                value={stage.sendAt || stage.nc}
                                onChange={(e) => onUpdate({ ...stage, sendAt: e.target.value })}
                            />
                        </div>

                        {/* Adj Days & Next Button */}
                        <div className="flex items-center gap-1 bg-slate-100/80 rounded pl-2 pr-0.5 py-0.5 border border-slate-200/50">
                            <input
                                type="number"
                                min="1"
                                max="30"
                                className="bg-transparent p-0 text-[11px] w-6 text-center border-none focus:ring-0 font-bold text-slate-600"
                                value={stage.adjDays || 3}
                                onChange={(e) => onUpdate({ ...stage, adjDays: parseInt(e.target.value) || 3 })}
                            />
                            <button
                                title={`Increment both NC and Send At by ${stage.adjDays || 3} business days`}
                                className="bg-transparent hover:bg-slate-300 w-7 h-6 rounded flex items-center justify-center text-[16px] transition-all hover:shadow-sm border border-transparent hover:border-slate-300/50"
                                onClick={() => {
                                    const ncBase = stage.nc ? new Date(stage.nc) : new Date();
                                    const sendAtBase = stage.sendAt ? new Date(stage.sendAt) : ncBase;
                                    
                                    const nextNc = formatDateIsoLocal(calculateNcDate(ncBase, stage.adjDays || 3, settings?.Holidays));
                                    const nextSendAt = formatDateIsoLocal(calculateNcDate(sendAtBase, stage.adjDays || 3, settings?.Holidays));
                                    
                                    onUpdate({ ...stage, nc: nextNc, sendAt: nextSendAt });
                                    if (window.showToast) {
                                        window.showToast(`Updated to NC: ${nextNc} / Send At: ${nextSendAt}`, 'info');
                                    }
                                }}
                            >
                                ⏭️
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenVariables) onOpenVariables();
                        }} 
                        title="Extract Variables" 
                        className={`w-8 h-8 flex items-center justify-center bg-transparent rounded border transition-colors ${isActive ? 'hover:bg-emerald-50 text-emerald-600 hover:border-emerald-200 cursor-pointer border-transparent' : 'opacity-0 pointer-events-none border-transparent'}`}
                    >
                        🔰
                    </button>
                    <button onClick={onMoveUp} title="Move Up" className="w-8 h-8 flex items-center justify-center bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded border border-transparent hover:border-slate-200 transition-colors">↑</button>
                    <button onClick={onMoveDown} title="Move Down" className="w-8 h-8 flex items-center justify-center bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded border border-transparent hover:border-slate-200 transition-colors">↓</button>
                    <button onClick={onDelete} title="Delete Stage" className="w-8 h-8 flex items-center justify-center bg-transparent hover:bg-red-50 text-red-500 hover:text-red-600 rounded border border-transparent hover:border-red-200 transition-colors">×</button>
                </div>
            </div>

            {isActive && (
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex mb-4 bg-slate-100 p-1 rounded-md overflow-x-auto custom-scrollbar">
                        {(stage.steps && Array.isArray(stage.steps) ? stage.steps : []).map((step, idx) => {
                            const name = step.name;
                            const tabId = `step-${idx}`;
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

                    <div className="bg-emerald-50 rounded-lg border border-emerald-100 min-h-[200px] overflow-hidden dfm-stage-content">
                        {/* Custom Template Rendering */}
                        {Array.isArray(stage.steps) ? (
                            <div
                                ref={containerRef}
                                className="h-full w-full"
                                onBlur={() => handleSaveStep(false)}
                            />
                        ) : (
                            /* Default Fallback UI */
                            <>
                                {activeTab === 'step-0' && <div className="p-10 text-center text-emerald-600">Under Construction...</div>}
                                {activeTab === 'step-1' && <div className="p-10 text-center text-emerald-600">Under Construction...</div>}
                            </>
                        )}
                    </div>

                    {/* Save Button for custom steps */}
                    {Array.isArray(stage.steps) && (
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={() => handleSaveStep(true)}
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

const MainContent = ({ activeCase, onUpdateCase, settings, templates, onUploadTemplate, onDeleteTemplate, onReorderTemplate, showToast, onOpenVariables }) => {
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

        // Determine initial NC date: use last stage's Send At if available
        let initialNc = formatDateIsoLocal(new Date());
        let lastSendAt = null;
        
        if (activeCase.stages && activeCase.stages.length > 0) {
            const lastStage = activeCase.stages[activeCase.stages.length - 1];
            lastSendAt = lastStage.sendAt || lastStage.nc;
            
            if (lastSendAt) {
                const baseDate = new Date(lastSendAt);
                const adjDays = Number(lastStage.adjDays) || 3;
                initialNc = formatDateIsoLocal(calculateNcDate(baseDate, adjDays, settings?.Holidays));
            }
        }

        const baseName = template.name || 'New Stage';
        let maxCount = 0;
        let hasBaseName = false;
        
        activeCase.stages.forEach(stage => {
            if (stage.name === baseName) {
                hasBaseName = true;
                if (maxCount < 1) maxCount = 1;
            } else if (stage.name && stage.name.startsWith(baseName + ' #')) {
                const countStr = stage.name.substring((baseName + ' #').length);
                const count = parseInt(countStr, 10);
                if (!isNaN(count) && count > maxCount) {
                    maxCount = count;
                }
            }
        });

        const newName = hasBaseName ? `${baseName} #${maxCount + 1}` : baseName;

        const newStage = {
            id: uid,
            name: newName,
            nc: initialNc,
            sendAt: initialNc, // Default same as NC
            adjDays: 3,
            steps: (template.steps || []).map(step => {
                let rawHtml = step.html || '';
                
                if (step.format === 'lz' && rawHtml) {
                    try {
                        rawHtml = LZString.decompressFromUTF16(rawHtml) || rawHtml;
                    } catch (e) {
                        console.error('Failed to decompress HTML', e);
                    }
                }
                
                let parsedHtml = rawHtml;
                if (window.ejs && rawHtml) {
                    try {
                        parsedHtml = window.ejs.render(rawHtml, {
                            uid: uid,
                            currentCase: window.currentCase
                        });
                    } catch (e) {
                        console.error('EJS render failed on new stage', e);
                    }
                }

                return {
                    ...step,
                    html: LZString.compressToUTF16(parsedHtml),
                    format: 'lz'
                };
            })
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

    const handleExportCase = () => {
        try {
            const rawData = activeCase instanceof DfmCase ? activeCase.toJSON() : activeCase;
            const content = JSON.stringify(rawData, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MetaData_${activeCase.id}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Export failed: ' + e.message);
        }
    };

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

                    const plainTextCleaned = cleanHtml(target.innerHTML);
                    const htmlToCopy = plainTextCleaned.replace(/\r?\n|\r/g, '<br>');
                    const plainToCopy = target.innerText.replace(/^$/gm, ' ');

                    if (plainToCopy || htmlToCopy) {
                        const blobHTML = new Blob([htmlToCopy], { type: 'text/html' });
                        const blobText = new Blob([plainToCopy], { type: 'text/plain' });
                        
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
        <div className="flex-1 overflow-y-auto bg-slate-100 custom-scrollbar" onDoubleClick={handleDoubleClick}>
            {/* Sticky Header Container */}
            <div className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 mb-2">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <input type="text" readOnly data-doubleclick="copy"
                                className="bg-blue-600 text-white font-black px-4 py-2 rounded-lg text-lg shadow-lg shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer w-[240px] text-center shrink-0 border-none tracking-tight"
                                value={activeCase.id} title="Case Number (Double-click to copy)" />
                            <input type="text" readOnly data-doubleclick="copy"
                                className="bg-transparent text-slate-900 font-extrabold text-2xl focus:outline-none flex-1 truncate cursor-pointer tracking-tight"
                                value={activeCase.title} title="Case Title (Double-click to copy)" />
                        </div>
                        <button
                            onClick={handleExportCase}
                            className="text-slate-400 hover:text-blue-600 p-2.5 rounded-xl transition-all border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm opacity-60 hover:opacity-100 flex items-center justify-center shrink-0 active:scale-95"
                            title="Export Case Data"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="flex justify-end gap-6 mt-2 text-[10px] font-bold text-slate-400/80 italic tracking-wider">
                        {activeCase.createdAt && (
                            <span>Created At: {isoToLocalDate(activeCase.createdAt)}</span>
                        )}
                        {activeCase.updatedAt && (
                            <span>Updated At: {isoToLocalDate(activeCase.updatedAt)}</span>
                        )}
                        {activeCase.resolvedAt && (
                            <span>Resolved At: {isoToLocalDate(activeCase.resolvedAt)}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pb-12">

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
                            onOpenVariables={onOpenVariables}
                            settings={settings}
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
                showToast={showToast}
            />
        </div>
    )
}

export default MainContent
