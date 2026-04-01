import { useState, useEffect, useRef, useCallback } from 'react'
import { getCaseDb } from '../utils/db'
import { isoToLocalDate } from '../utils/dateUtils'
import CaseDateBadge from './CaseDateBadge'

// Extract all searchable text from a step (excluding html field)
const flattenStepText = (step) => {
    if (!step || typeof step !== 'object') return '';
    const EXCLUDED = new Set(['html', 'format', 'id', 'name']);
    return Object.entries(step)
        .filter(([key]) => !EXCLUDED.has(key))
        .map(([, val]) => {
            if (typeof val === 'string') return val;
            if (typeof val === 'object' && val !== null) return JSON.stringify(val);
            return '';
        })
        .join(' ');
};

// Extract snippets (±5 chars around each match) as structured objects for highlighting
const extractSnippets = (text, regex) => {
    const snippets = [];
    const cloned = new RegExp(regex.source, regex.flags.replace('g', '') + 'g');
    let match;
    while ((match = cloned.exec(text)) !== null && snippets.length < 5) {
        const start = Math.max(0, match.index - 5);
        const end = Math.min(text.length, match.index + match[0].length + 5);
        snippets.push({
            prefix: start > 0 ? '…' : '',
            before: text.slice(start, match.index),
            match: match[0],
            after: text.slice(match.index + match[0].length, end),
            suffix: end < text.length ? '…' : '',
        });
        if (match[0].length === 0) cloned.lastIndex++;
    }
    return snippets;
};


const SearchModal = ({ isOpen, onClose, cases }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [openCaseIds, setOpenCaseIds] = useState(new Set());
    const [regexError, setRegexError] = useState(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery('');
            setResults([]);
            setOpenCaseIds(new Set());
            setRegexError(null);
        }
    }, [isOpen]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prev; };
        }
    }, [isOpen]);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const runSearch = useCallback(async (pattern) => {
        if (!pattern.trim()) {
            setResults([]);
            setRegexError(null);
            return;
        }

        // Try to build regex
        let regex;
        try {
            regex = new RegExp(pattern, 'gi');
            setRegexError(null);
        } catch (e) {
            setRegexError(e.message);
            setResults([]);
            return;
        }

        setIsSearching(true);
        const found = [];

        for (const caseIndex of cases) {
            try {
                const caseData = await getCaseDb(caseIndex.id);
                if (!caseData || !Array.isArray(caseData.stages)) continue;

                const stageHits = [];

                for (const stage of caseData.stages) {
                    let stageText = stage.name || '';

                    // Flatten all step fields (exclude html)
                    if (Array.isArray(stage.steps)) {
                        for (const step of stage.steps) {
                            stageText += ' ' + flattenStepText(step);
                        }
                    }

                    // Test if any match exists
                    regex.lastIndex = 0;
                    if (!regex.test(stageText)) continue;

                    // Collect snippets
                    regex.lastIndex = 0;
                    const snippets = extractSnippets(stageText.trim(), regex);

                    stageHits.push({
                        stageId: stage.id,
                        stageName: stage.name || `Stage ${stage.id}`,
                        snippets,
                    });
                }

                if (stageHits.length > 0) {
                    found.push({
                        caseId: caseData.id,
                        title: caseData.title || caseData.id,
                        resolvedAt: caseData.resolvedAt || null,
                        createdAt: caseData.createdAt || null,
                        updatedAt: caseData.updatedAt || null,
                        stages: stageHits,
                    });
                }
            } catch (e) {
                console.warn('Search error for case', caseIndex.id, e);
            }
        }

        setResults(found);
        setIsSearching(false);

        // Auto-open first result
        if (found.length > 0) {
            setOpenCaseIds(new Set([found[0].caseId]));
        }
    }, [cases]);

    // Debounced search trigger
    useEffect(() => {
        if (!isOpen) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            runSearch(query);
        }, 350);
        return () => clearTimeout(debounceRef.current);
    }, [query, isOpen, runSearch]);

    const toggleCase = (caseId) => {
        setOpenCaseIds(prev => {
            const next = new Set(prev);
            if (next.has(caseId)) next.delete(caseId);
            else next.add(caseId);
            return next;
        });
    };

    const handleNavigate = (caseId, stageId) => {
        window.location.hash = `#caseId=${encodeURIComponent(caseId)}&stageId=${encodeURIComponent(stageId)}`;
        onClose();
    };

    if (!isOpen) return null;

    const totalHits = results.reduce((sum, r) => sum + r.stages.length, 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]"
            style={{ background: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-2xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: '80vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
                    <span className="text-slate-500 font-mono text-sm select-none">/</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="正規表現で全文検索..."
                        className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 text-sm font-mono focus:outline-none"
                        spellCheck={false}
                        autoComplete="off"
                    />
                    <span className="text-slate-500 font-mono text-sm select-none">/</span>
                    {isSearching && (
                        <span className="text-slate-500 text-xs animate-pulse">検索中...</span>
                    )}
                    {!isSearching && query && !regexError && (
                        <span className="text-slate-500 text-xs">{results.length} Cases / {totalHits} Hits</span>
                    )}
                    <button
                        onClick={onClose}
                        className="text-slate-600 hover:text-slate-300 transition-colors text-xs font-mono px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
                    >
                        ESC
                    </button>
                </div>

                {/* Regex Error */}
                {regexError && (
                    <div className="px-5 py-2 bg-red-950/50 border-b border-red-900/30 text-red-400 text-xs font-mono">
                        ⚠ 正規表現エラー: {regexError}
                    </div>
                )}

                {/* Results */}
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {!query.trim() && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
                            <span className="text-3xl">🔍</span>
                            <p className="text-sm">正規表現を入力して全ケースを全文検索</p>
                            <p className="text-xs">例: <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">テスト|Test</span> <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">Error\d+</span></p>
                        </div>
                    )}

                    {query.trim() && !isSearching && !regexError && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-600">
                            <span className="text-2xl">🌑</span>
                            <p className="text-sm">一致するケースが見つかりませんでした</p>
                        </div>
                    )}

                    {results.map((result) => {
                        const isClosed = !!result.resolvedAt;
                        const isExpanded = openCaseIds.has(result.caseId);
                        return (
                            <div key={result.caseId} className={`border-b last:border-b-0 ${isClosed ? 'border-slate-800/30' : 'border-slate-800/60'}`}>
                                {/* Case Row */}
                                <button
                                    onClick={() => toggleCase(result.caseId)}
                                    className={`w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left group ${
                                        isClosed
                                            ? 'hover:bg-slate-800/20 opacity-60 hover:opacity-90'
                                            : 'hover:bg-slate-800/40'
                                    }`}
                                >
                                    {/* Chevron */}
                                    <span className={`text-[10px] transition-transform duration-150 shrink-0 ${isExpanded ? 'rotate-90' : ''} ${isClosed ? 'text-slate-600' : 'text-slate-500'}`}>▶</span>

                                    {/* ID + Title */}
                                    <div className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
                                        <span className={`font-mono text-[12px] font-bold shrink-0 ${isClosed ? 'text-slate-500' : 'text-orange-400'}`}>
                                            {result.caseId}
                                        </span>
                                        <span
                                            className={`text-xs truncate min-w-0 ${isClosed ? 'text-slate-600 line-through decoration-slate-700/60' : 'text-slate-400'}`}
                                            title={result.title}
                                        >
                                            {result.title}
                                        </span>
                                    </div>

                                    {/* Right-side meta */}
                                    <div className="shrink-0 flex flex-col items-end gap-0.5 ml-2">
                                        <span className="text-[10px] bg-slate-800 text-slate-600 px-1.5 py-0.5 rounded-full">
                                            {result.stages.length} stage{result.stages.length !== 1 ? 's' : ''}
                                        </span>
                                        <CaseDateBadge
                                            createdAt={result.createdAt}
                                            updatedAt={result.updatedAt}
                                            resolvedAt={result.resolvedAt}
                                            format="compact"
                                        />
                                    </div>
                                </button>

                                {/* Stage Rows (accordion) */}
                                {isExpanded && (
                                    <div className="bg-slate-950/30">
                                        {result.stages.map((stage) => (
                                            <button
                                                key={stage.stageId}
                                                onClick={() => handleNavigate(result.caseId, stage.stageId)}
                                                className="w-full flex flex-col gap-1 px-8 py-2.5 hover:bg-orange-500/5 transition-colors text-left border-t border-slate-800/30 first:border-t-0 group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-500 text-[10px]">↳</span>
                                                    <span className="text-slate-200 text-xs font-semibold group-hover:text-orange-300 transition-colors truncate">
                                                        {stage.stageName}
                                                    </span>
                                                </div>
                                                {stage.snippets.map((snip, i) => (
                                                    <p key={i} className="text-slate-500 text-[10px] font-mono pl-4 truncate group-hover:text-slate-400 transition-colors">
                                                        <span>{snip.prefix}{snip.before}</span>
                                                        <span className="bg-orange-400/25 text-orange-300 rounded px-0.5 font-semibold">{snip.match}</span>
                                                        <span>{snip.after}{snip.suffix}</span>
                                                    </p>
                                                ))}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                {results.length > 0 && (
                    <div className="px-5 py-2 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] text-slate-600">クリックで該当ステージを開きます</span>
                        <span className="text-[10px] text-slate-600 font-mono">{results.length} Case Hits</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchModal;
