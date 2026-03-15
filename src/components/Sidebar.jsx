import { useState, useEffect } from 'react'
import pkg from '../../package.json'

const Sidebar = ({ cases, activeCaseId, onSelectCase, onNewCase, onDeleteCase, onToggleResolveCase, connectionStatus, onReconnect, onExtractCase, onOpenSettings, onLogoHover }) => {
    const [search, setSearch] = useState('')
    const [showResolved, setShowResolved] = useState(false)

    const filteredCases = cases.filter(c => {
        const keywords = search.split(',').map(k => k.trim()).filter(k => k !== '');
        
        const matchesSearch = keywords.length === 0 || keywords.some(k => {
            const lowerK = k.toLowerCase();
            return c.id.toLowerCase().includes(lowerK) || (c.title && c.title.toLowerCase().includes(lowerK));
        });

        const matchesResolved = !c.resolvedAt || showResolved;
        return matchesSearch && matchesResolved;
    }).reverse()

    return (
        <div className="w-72 bg-slate-900 text-white h-screen flex flex-col border-r border-slate-800 shadow-2xl font-sans shrink-0">
            <div 
                className="p-5 bg-gradient-to-b from-slate-800 to-slate-900 font-black text-center text-orange-400 text-xl italic uppercase tracking-tighter border-b border-slate-800 relative select-none"
                onMouseEnter={() => onLogoHover(true)}
                onMouseLeave={() => onLogoHover(false)}
            >
                DfM-Ninja
                <span className="absolute bottom-2 right-2 text-[8px] text-slate-500 font-normal not-italic tracking-normal">
                    v{pkg.version}
                </span>
            </div>

            <div className="px-4 py-1.5 bg-slate-950 flex items-center justify-between text-[9px] uppercase font-bold tracking-widest text-slate-500 border-b border-slate-900/50">
                <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></span>
                    {connectionStatus}
                </span>
                {connectionStatus === 'connected' ? (
                    <button
                        onClick={onExtractCase}
                        className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
                    >
                        <span className="text-[11px]">📟</span> Extract Case
                    </button>
                ) : (
                    <button
                        onClick={onReconnect}
                        className="hover:text-orange-400 transition-colors cursor-pointer flex items-center gap-1"
                    >
                        <span className="text-[11px]">🔄</span> Reconnect
                    </button>
                )}
            </div>

            <div className="p-3 bg-slate-900/50 border-b border-slate-800/30">
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1 group">
                        <input
                            type="text"
                            placeholder="Search (`,` for OR)..."
                            title="Multiple keywords separated by commas (OR search)"
                            className="w-full pl-8 pr-2 py-1.5 bg-slate-950 rounded border border-slate-800 text-[11px] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/10 transition-all text-slate-200 placeholder-slate-600"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500/50 transition-colors">🔍</span>
                    </div>
                    <button
                        onClick={() => setShowResolved(!showResolved)}
                        className={`p-1.5 rounded border transition-all flex items-center justify-center shrink-0 ${showResolved ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.1)]' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'}`}
                        title={showResolved ? "Hide resolved cases" : "Show resolved cases"}
                    >
                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${showResolved ? 'border-orange-400 bg-orange-400' : 'border-slate-700'}`}>
                            {showResolved && <span className="text-[9px] text-slate-900 font-black">✓</span>}
                        </div>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/20">
                {filteredCases.map(c => (
                    <div
                        key={c.id}
                        className={`w-full text-left border-b border-slate-800/30 hover:bg-slate-800/40 transition-all relative group ${activeCaseId === c.id ? 'bg-slate-800/60' : ''} ${c.resolvedAt ? 'opacity-50' : ''}`}
                    >
                        {activeCaseId === c.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-500 z-10" />
                        )}
                        <div className="flex justify-between items-center px-4 py-3 gap-3">
                            <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => onSelectCase(c.id)}
                            >
                                <div className={`font-mono text-[12px] font-bold flex items-center gap-1.5 ${activeCaseId === c.id ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'}`}>
                                    {c.resolvedAt && (
                                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded-sm border border-emerald-500/20 leading-none shrink-0 font-sans">🎯</span>
                                    )}
                                    <span className="truncate text-[16px] tracking-tight">{c.id}</span>
                                </div>
                                <div className="truncate text-[10px] text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors leading-tight">{c.title}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleResolveCase(c.id);
                                    }}
                                    className={`p-1 rounded-md text-[16px] transition-all active:scale-90 border flex items-center justify-center w-7 h-7 ${c.resolvedAt ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' : 'text-slate-500 hover:text-orange-400 hover:bg-slate-800 border-transparent opacity-0 group-hover:opacity-100'}`}
                                    title={c.resolvedAt ? `解決済み (${new Date(c.resolvedAt).toLocaleString()})` : "解決済みにする"}
                                >
                                    {c.resolvedAt ? '✅' : '🎯'}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteCase(c.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[11px] text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-all active:scale-90 w-7 h-7 flex items-center justify-center"
                                    title="削除"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 space-y-3 bg-slate-950/50">
                <button
                    onClick={onNewCase}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98]"
                >
                    + 新規ケース
                </button>
                <button
                    onClick={onOpenSettings}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 py-2 rounded-lg text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all focus:outline-none focus:ring-1 focus:ring-slate-600"
                >
                    ⚙️ 設定
                </button>
            </div>
        </div>
    )
}

export default Sidebar
