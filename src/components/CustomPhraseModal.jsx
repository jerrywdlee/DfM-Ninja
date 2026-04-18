import { useState, useEffect } from 'react'
import LZString from 'lz-string'

const CustomPhraseModal = ({ isOpen, onClose, template, showToast, onOpenVariables }) => {
    const [view, setView] = useState('list') // 'list' or 'edit'
    const [selectedPhrase, setSelectedPhrase] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [phrases, setPhrases] = useState({})

    useEffect(() => {
        if (isOpen && template) {
            const saved = localStorage.getItem(`dfm_ninja_custom_phrase_${template.id}`)
            if (saved) {
                setPhrases(JSON.parse(saved))
            } else {
                setPhrases({})
            }
            setView('list')
        }
    }, [isOpen, template])

    // Shortcut for Save (Ctrl+S / Cmd+S)
    useEffect(() => {
        if (!isOpen || view !== 'edit') return;

        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isOpen, view, editValue, phrases, selectedPhrase]);

    if (!isOpen || !template) return null

    const handleSave = () => {
        const newPhrases = { ...phrases, [selectedPhrase.id]: editValue }
        localStorage.setItem(`dfm_ninja_custom_phrase_${template.id}`, JSON.stringify(newPhrases))
        setPhrases(newPhrases)
        showToast('Saved custom phrase', 'success')
        setView('list')
    }

    const handleReset = () => {
        if (!confirm(`「${selectedPhrase.id}」定型文を初期値に戻しますか？`)) return;

        // Find the original text from template.steps[].html
        let originalText = ''
        template.steps.forEach(step => {
            if (!step.html) return;
            const html = step.format === 'lz' ? LZString.decompressFromUTF16(step.html) : step.html;
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const noscript = doc.querySelector(`noscript[data-name="${selectedPhrase.id}"]`);
            if (noscript) {
                originalText = noscript.textContent.trim().replace(/\n[ |\t]+/g, '\n');
            }
        });

        if (originalText !== undefined) {
             const newPhrases = { ...phrases }
             newPhrases[selectedPhrase.id] = originalText;
             localStorage.setItem(`dfm_ninja_custom_phrase_${template.id}`, JSON.stringify(newPhrases))
             setPhrases(newPhrases)
             setEditValue(originalText)
             showToast('Restored to default', 'info')
        }
    }

    const handleResetAll = () => {
        if (!confirm('このテンプレートのすべてのカスタム定型文をリセットして初期状態に戻しますか？')) return;
        localStorage.removeItem(`dfm_ninja_custom_phrase_${template.id}`);
        setPhrases({});
        showToast('All custom phrases reset to default', 'info');
        if (view === 'edit') setView('list');
    }

    // Extract all available phrases from all steps for the list view
    const availablePhrases = [];
    template.steps.forEach(step => {
        if (!step.html) return;
        const html = step.format === 'lz' ? LZString.decompressFromUTF16(step.html) : step.html;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        doc.querySelectorAll('noscript[data-name]').forEach(ns => {
            const id = ns.getAttribute('data-name');
            // Avoid duplicates across steps if any
            if (!availablePhrases.find(p => p.id === id)) {
                availablePhrases.push({
                    id,
                    defaultText: ns.textContent.trim().replace(/\n[ |\t]+/g, '\n')
                });
            }
        });
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] relative text-slate-300">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {view === 'list' ? (
                            <>Custom Phrases for <span className="text-orange-500">[ {template.id} ]</span></>
                        ) : (
                            <>[ <span className="text-orange-500">{selectedPhrase.id}</span> ] - {template.id}</>
                        )}
                    </h3>
                    <div className="flex items-center gap-3">
                        {view === 'list' && (
                            <button 
                                onClick={handleResetAll} 
                                className="text-slate-400 hover:text-orange-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
                                title="Reset All Phrases"
                            >
                                <span className="text-xl">🔁</span>
                            </button>
                        )}
                        <button 
                            onClick={view === 'edit' ? () => setView('list') : onClose} 
                            className="text-slate-400 hover:text-white transition-colors p-1"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-900 custom-scrollbar flex flex-col">
                    {view === 'list' ? (
                        <div className="flex flex-col gap-3">
                            {availablePhrases.length > 0 ? availablePhrases.map(p => {
                                const customText = phrases[p.id];
                                const display = customText || p.defaultText;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedPhrase(p);
                                            setEditValue(display);
                                            setView('edit');
                                        }}
                                        className="text-left bg-slate-950 border border-slate-800 p-4 rounded-xl shadow-sm hover:border-slate-600 transition-all group"
                                    >
                                        <div className="font-bold text-sm text-slate-200 mb-1 group-hover:text-orange-400">{p.id}</div>
                                        <div className="text-xs text-slate-500 truncate font-mono mt-1">
                                            {display.split('\n')[0]}...
                                        </div>
                                    </button>
                                );
                            }) : (
                                <div className="text-center py-10 text-slate-500 text-sm">No phrases found in this template.</div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-5">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400 font-bold">Edit Custom Phrase</span>
                                <button 
                                    onClick={onOpenVariables}
                                    className="text-sm bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-emerald-500/50 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-sm"
                                    title="Open Variables List"
                                >
                                    🔰 <span className="font-bold">Variables List</span>
                                </button>
                            </div>
                            <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full flex-1 min-h-[400px] p-5 text-sm font-mono border border-slate-700 rounded-xl bg-slate-950 text-emerald-400 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all resize-none shadow-inner custom-scrollbar"
                                placeholder="定型文をここに入力してください..."
                            />
                            
                            <div className="flex justify-between items-center pt-2">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-2 rounded-lg font-bold text-sm transition-all border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white active:scale-95"
                                >
                                    Reset
                                </button>
                                
                                <div className="flex gap-3 items-center">
                                    <button
                                        onClick={() => setView('list')}
                                        className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-8 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-sm transition-all active:scale-95 shadow-lg shadow-orange-900/20"
                                        title="Save Changes (Ctrl+S / Cmd+S)"
                                    >
                                        Save <span className="text-[10px] opacity-70 font-normal ml-1">(Ctrl+S)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CustomPhraseModal
