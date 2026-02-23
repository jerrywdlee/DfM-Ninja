import { useState, useEffect } from 'react'
import pkg from '../../package.json'

const Sidebar = ({ cases, activeCaseId, onSelectCase, onNewCase, onDeleteCase, connectionStatus, onReconnect, onOpenSettings }) => {
    const [search, setSearch] = useState('')
    const filteredCases = cases.filter(c =>
        c.id.includes(search) || (c.title && c.title.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="w-64 bg-slate-900 text-white h-screen flex flex-col border-r border-slate-800 shadow-2xl">
            <div className="p-6 bg-gradient-to-b from-slate-800 to-slate-900 font-black text-center text-orange-400 text-2xl italic uppercase tracking-tighter border-b border-slate-800 relative">
                DfM-Ninja
                <span className="absolute bottom-2 right-2 text-[9px] text-slate-500 font-normal not-italic tracking-normal">
                    v{pkg.version}
                </span>
            </div>

            <div className="px-4 py-2 bg-slate-950 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                <span>Channel: {connectionStatus}</span>
                <button
                    onClick={onReconnect}
                    className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                    🔄 Reconnect
                </button>
            </div>

            <div className="p-3">
                <input
                    type="text"
                    placeholder="Search cases..."
                    className="w-full p-2 bg-slate-800 rounded-lg text-sm border border-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredCases.map(c => (
                    <div
                        key={c.id}
                        className={`w-full text-left border-b border-slate-800/50 hover:bg-slate-800/50 transition-all relative group ${activeCaseId === c.id ? 'bg-slate-800/80' : ''}`}
                    >
                        {activeCaseId === c.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-orange-600 z-10" />
                        )}
                        <div className="flex justify-between items-start p-4">
                            <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => onSelectCase(c.id)}
                            >
                                <div className={`font-mono text-sm font-bold ${activeCaseId === c.id ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'}`}>
                                    {c.id}
                                </div>
                                <div className="truncate text-xs text-slate-500 group-hover:text-slate-400">{c.title}</div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteCase(c.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-500 transition-all active:scale-90"
                                title="削除"
                            >
                                🗑️
                            </button>
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
