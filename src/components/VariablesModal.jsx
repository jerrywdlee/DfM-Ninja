import React, { useState, useEffect } from 'react';
import DfmCase from '../models/DfmCase';
import LZString from 'lz-string';
import pkg from '../../package.json';

const VariablesModal = ({ isOpen, onClose, activeCase, onUpdateCase, sysTemplates, showToast }) => {
    // Editable Var
    const [editableVars, setEditableVars] = useState(
        Array(5).fill({ name: '', value: '' })
    );

    // Dynamic Var Initial State
    const [dynRow1, setDynRow1] = useState({ base: 'nextNC', offset: '+0', format: '_XS' });
    const [dynRow2, setDynRow2] = useState({ base: 'Lic', format: '_XL' });
    const [dynRow3, setDynRow3] = useState({ base: 'stageLog', format: '_Dot' });

    // Stage Var State
    const [stageVars, setStageVars] = useState([]);
    const [showEmptyStageVars, setShowEmptyStageVars] = useState(false);

    // Initialize Editable Vars & Stage Vars when modal opens
    useEffect(() => {
        if (!isOpen || !activeCase) return;

        // 1. Setup Editable Vars
        const presetVars = new Set();
        if (Array.isArray(sysTemplates)) {
            sysTemplates.forEach(t => {
                if (t.variables && Array.isArray(t.variables)) {
                    t.variables.forEach(v => presetVars.add(v));
                }
            });
        }
        const presetArray = Array.from(presetVars);
        const rowCount = presetArray.length + 2;

        setEditableVars(prev => {
            const newVars = [];
            for (let i = 0; i < rowCount; i++) {
                const existing = prev[i] || { name: '', value: '' };
                if (!existing.name && presetArray[i]) {
                    newVars[i] = { name: presetArray[i], value: activeCase[presetArray[i]] || '' };
                } else if (existing.name && activeCase[existing.name] !== undefined) {
                    newVars[i] = { ...existing, value: activeCase[existing.name] };
                } else {
                    newVars[i] = existing;
                }
            }
            return newVars;
        });

        // 2. Setup Stage Vars (Scan active stage HTML)
        const stage = activeCase.stages?.find(s => s.id === activeCase.activeStageId);
        if (stage && stage.steps) {
            const extracted = new Set();
            stage.steps.forEach(step => {
                let html = step.html || '';
                if (step.format === 'lz' && html) {
                    try {
                        html = LZString.decompressFromUTF16(html) || html;
                    } catch(e) {}
                }
                const regex = /name=["']([^"']+)["']/g;
                let match;
                while ((match = regex.exec(html)) !== null) {
                    extracted.add(match[1]);
                }
            });

            const vars = Array.from(extracted).map(name => {
                let val = '';
                stage.steps.forEach(step => {
                    if (step[name] !== undefined && step[name] !== null) {
                        val = String(step[name]);
                    }
                });
                return { name, value: val };
            });
            setStageVars(vars);
        } else {
            setStageVars([]);
        }
        setShowEmptyStageVars(false);
    }, [isOpen, sysTemplates, activeCase, activeCase?.activeStageId]); // re-run on case open

    if (!isOpen) return null;

    const handleUpdateEditableVar = (index, field, val) => {
        const newVars = [...editableVars];
        newVars[index] = { ...newVars[index], [field]: val };
        setEditableVars(newVars);

        // Auto update activeCase if both exist
        if (field === 'value' && newVars[index].name) {
            onUpdateCase({
                ...activeCase,
                [newVars[index].name]: val || undefined
            });
        }
        if (field === 'name' && val && newVars[index].value) {
            onUpdateCase({
                ...activeCase,
                [val]: newVars[index].value
            });
        }
    };

    const copyVarName = (name) => {
        const copyText = `{{${name}}}`;
        navigator.clipboard.writeText(copyText).then(() => {
            if (showToast) showToast(`コピーしました: ${copyText}`, 'info');
        });
    };

    const copyVarValue = (value) => {
        navigator.clipboard.writeText(value).then(() => {
            if (showToast) showToast(`値をコピーしました`, 'info');
        });
    };

    // Engine for Preview 
    const previewEngine = new DfmCase(activeCase);

    const getPreview = (text) => {
        try {
            const res = previewEngine.render(text);
            const collapsed = (res || '').replace(/\s+/g, ' ');
            return collapsed.length > 15 ? collapsed.substring(0, 15) + '...' : collapsed;
        } catch(e) {
            return 'Error';
        }
    };

    // Dynamic keys
    const getRow1Key = () => {
        const off = dynRow1.offset === '+0' ? '' : dynRow1.offset;
        const fmt = dynRow1.format === '(none)' ? '' : dynRow1.format;
        return `${dynRow1.base}${off}${fmt}`;
    };
    const getRow2Key = () => `Lic${dynRow2.format === '(none)' ? '' : dynRow2.format}`;
    const getRow3Key = () => `stageLog${dynRow3.format === '(none)' ? '' : dynRow3.format}`;


    // Stage Var filtering logic
    const nonEmptyStageVars = stageVars.filter(v => {
        let valPreview = String(v.value || '').replace(/\s+/g, ' ');
        if (/\{\{.*?\}\}/.test(valPreview)) valPreview = '';
        return valPreview.trim().length > 0;
    });
    const emptyStageVars = stageVars.filter(v => {
        let valPreview = String(v.value || '').replace(/\s+/g, ' ');
        if (/\{\{.*?\}\}/.test(valPreview)) valPreview = '';
        return valPreview.trim().length === 0;
    });
    const allEmpty = nonEmptyStageVars.length === 0;
    // Show: non-empty always. If all empty show first 2. Toggle reveals rest.
    const visibleStageVars = showEmptyStageVars
        ? stageVars
        : allEmpty
            ? stageVars.slice(0, 2)
            : nonEmptyStageVars;
    const hiddenCount = stageVars.length - visibleStageVars.length;

    const renderCopyButtons = (varName, varValue) => (
        <td className="p-3 w-fit text-center">
            <div className="flex items-center gap-1 justify-center">
                <button
                    onClick={() => copyVarName(varName)}
                    disabled={!varName}
                    className="text-red-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-50 p-1.5 rounded transition-colors text-lg filter drop-shadow hover:drop-shadow-md"
                    title={`変数名をコピー: {{${varName}}}`}
                >
                    🧲
                </button>
                <button
                    onClick={() => copyVarValue(varValue)}
                    disabled={!varValue}
                    className="text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-50 p-1.5 rounded transition-colors text-lg filter drop-shadow hover:drop-shadow-md"
                    title="値をコピー"
                >
                    📋
                </button>
            </div>
        </td>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            <div 
                className="bg-[#eafaf1] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-[#a1dfc3]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-[#a1dfc3]/50 bg-[#eafaf1]">
                    <h2 className="text-xl font-black text-[#0f5132] flex items-center gap-2">
                        🔰 Variables List
                        <a 
                            href={`${pkg.homepage}/blob/main/docs/Variables.md`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="ml-3 text-sm no-underline bg-white border border-[#a1dfc3] text-[#0f5132] px-2.5 py-0.5 rounded-full flex items-center shadow-sm opacity-60 hover:opacity-100 hover:scale-105 transition-all duration-200"
                            title="Open Variables Document"
                        >
                            🔗 <span className="text-[10px] ml-1 font-bold">Docs</span>
                        </a>
                    </h2>
                    <button onClick={onClose} className="text-[#0f5132]/60 hover:text-[#0f5132] transition-colors p-1 flex items-center justify-center rounded-full hover:bg-[#a1dfc3]/30">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8 bg-[#eafaf1]">
                    
                    {/* Editable Var */}
                    <section>
                        <h3 className="text-lg font-bold text-[#146c43] mb-3 flex items-center gap-2 border-b-2 border-[#146c43]/20 pb-1">
                             Editable Var.
                        </h3>
                        <div className="bg-white rounded-lg border border-[#a1dfc3] overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <tbody>
                                    {editableVars.map((v, i) => (
                                        <tr key={i} className="border-b border-[#a1dfc3]/30 last:border-none">
                                            <td className="p-3 w-1/3">
                                                <input 
                                                    className="w-full bg-[#f8fdfa] border border-[#a1dfc3] focus:border-[#198754] focus:ring-1 focus:ring-[#198754] rounded px-2 py-1.5 text-[#0f5132]"
                                                    placeholder="Variable Name"
                                                    value={v.name}
                                                    onChange={(e) => handleUpdateEditableVar(i, 'name', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    className="w-full bg-[#f8fdfa] border border-[#a1dfc3] focus:border-[#198754] focus:ring-1 focus:ring-[#198754] rounded px-2 py-1.5 text-[#0f5132]"
                                                    placeholder="Value"
                                                    value={v.value}
                                                    onChange={(e) => handleUpdateEditableVar(i, 'value', e.target.value)}
                                                />
                                            </td>
                                            {renderCopyButtons(v.name, v.value)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Dynamic Var */}
                    <section>
                        <h3 className="text-lg font-bold text-[#146c43] mb-3 flex items-center gap-2 border-b-2 border-[#146c43]/20 pb-1">
                             Dynamic Var.
                        </h3>
                        <div className="bg-white rounded-lg border border-[#a1dfc3] overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b border-[#a1dfc3]/30">
                                        <td className="p-2 w-[45%]">
                                            <div className="flex gap-1 items-center flex-wrap">
                                                <select className="bg-[#f8fdfa] border border-[#a1dfc3] rounded px-1.5 py-1 text-[#0f5132] outline-none hover:bg-white focus:border-[#198754]" value={dynRow1.base} onChange={e=>setDynRow1({...dynRow1, base: e.target.value})}>
                                                    <option value="prevNC">prevNC</option>
                                                    <option value="prevSendAt">prevSendAt</option>
                                                    <option value="currentNC">currentNC</option>
                                                    <option value="nextNC">nextNC</option>
                                                    <option value="sendAt">sendAt</option>
                                                </select>
                                                <select className="bg-[#f8fdfa] border border-[#a1dfc3] rounded px-1.5 py-1 text-[#0f5132] outline-none hover:bg-white focus:border-[#198754]" value={dynRow1.offset} onChange={e=>setDynRow1({...dynRow1, offset: e.target.value})}>
                                                    {['+0','+1','+2','+3','+4','+5','-1','-2','-3'].map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                                <select className="bg-[#f8fdfa] border border-[#a1dfc3] rounded px-1.5 py-1 text-[#0f5132] outline-none hover:bg-white focus:border-[#198754]" value={dynRow1.format} onChange={e=>setDynRow1({...dynRow1, format: e.target.value})}>
                                                    <option value="(none)">(none)</option>
                                                    <option value="_XS">_XS</option>
                                                    <option value="_S">_S</option>
                                                    <option value="_L">_L</option>
                                                    <option value="_XL">_XL</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="p-2 text-[#4f6f60] max-w-[150px] truncate">
                                            {getPreview(`{{${getRow1Key()}}}`)}
                                        </td>
                                        {renderCopyButtons(getRow1Key(), previewEngine.render(`{{${getRow1Key()}}}`) || '')}
                                    </tr>

                                    <tr className="border-b border-[#a1dfc3]/30">
                                        <td className="p-2 w-[45%]">
                                            <div className="flex gap-1 items-center">
                                                <span className="font-bold text-[#0f5132] mr-1">Lic</span>
                                                <select className="bg-[#f8fdfa] border border-[#a1dfc3] rounded px-1.5 py-1 text-[#0f5132] outline-none hover:bg-white focus:border-[#198754]" value={dynRow2.format} onChange={e=>setDynRow2({...dynRow2, format: e.target.value})}>
                                                    <option value="(none)">(none)</option>
                                                    <option value="_S">_S</option>
                                                    <option value="_L">_L</option>
                                                    <option value="_XL">_XL</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="p-2 text-[#4f6f60] max-w-[150px] truncate">
                                            {getPreview(`{{${getRow2Key()}}}`)}
                                        </td>
                                        {renderCopyButtons(getRow2Key(), previewEngine.render(`{{${getRow2Key()}}}`) || '')}
                                    </tr>

                                    <tr className="border-b border-[#a1dfc3]/30">
                                        <td className="p-2 w-[45%]">
                                            <div className="flex gap-1 items-center">
                                                <span className="font-bold text-[#0f5132] mr-1">stageLog</span>
                                                <select className="bg-[#f8fdfa] border border-[#a1dfc3] rounded px-1.5 py-1 text-[#0f5132] outline-none hover:bg-white focus:border-[#198754]" value={dynRow3.format} onChange={e=>setDynRow3({...dynRow3, format: e.target.value})}>
                                                    <option value="(none)">(none)</option>
                                                    <option value="_Dot">_Dot</option>
                                                    <option value="_Dash">_Dash</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="p-2 text-[#4f6f60] max-w-[150px] truncate">
                                            {getPreview(`{{${getRow3Key()}}}`)}
                                        </td>
                                        {renderCopyButtons(getRow3Key(), previewEngine.render(`{{${getRow3Key()}}}`) || '')}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Stage Var */}
                    <section>
                        <h3 className="text-lg font-bold text-[#146c43] mb-3 flex items-center gap-2 border-b-2 border-[#146c43]/20 pb-1">
                             Stage Var.
                        </h3>
                        <div className="bg-white rounded-lg border border-[#a1dfc3] overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <tbody>
                                    {visibleStageVars.map((v, i) => {
                                        let valPreview = String(v.value || '').replace(/\s+/g, ' ');
                                        if (/\{\{.*?\}\}/.test(valPreview)) valPreview = '';
                                        if (valPreview.length > 20) valPreview = valPreview.substring(0, 20) + '...';
                                        return (
                                            <tr key={i} className="border-b border-[#a1dfc3]/30 last:border-none">
                                                <td className="p-3 w-[45%] truncate font-bold text-[#0f5132]">
                                                    {v.name}
                                                </td>
                                                <td className="p-3 text-[#4f6f60] truncate max-w-[150px]">
                                                    {valPreview}
                                                </td>
                                                {renderCopyButtons(v.name, v.value)}
                                            </tr>
                                        );
                                    })}
                                    {stageVars.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="p-6 text-center text-[#4f6f60] italic">
                                                No named inputs found in this stage.
                                            </td>
                                        </tr>
                                    )}
                                    {/* Toggle row */}
                                    {stageVars.length > 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-3 py-1.5 border-t border-[#a1dfc3]/30">
                                                <button
                                                    onClick={() => setShowEmptyStageVars(v => !v)}
                                                    className="w-full flex items-center justify-center gap-1.5 text-[11px] text-[#4f6f60] hover:text-[#0f5132] transition-colors py-0.5 rounded hover:bg-[#eafaf1]"
                                                >
                                                    {showEmptyStageVars
                                                        ? <><span>🔼</span> 空の変数を隠す</>
                                                        : hiddenCount > 0
                                                            ? <><span>🔽</span> 空の変数をすべて表示 ({hiddenCount} 件)</>
                                                            : null
                                                    }
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Sys Temp. (Template IDs themselves) */}
                    {Array.isArray(sysTemplates) && sysTemplates.length > 0 && (
                        <section>
                            <h3 className="text-lg font-bold text-[#146c43] mb-3 flex items-center gap-2 border-b-2 border-[#146c43]/20 pb-1">
                                 Sys Temp.
                            </h3>
                            <div className="bg-white rounded-lg border border-[#a1dfc3] overflow-hidden shadow-sm">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {sysTemplates.map((t, i) => {
                                            const rendered = previewEngine.render(`{{${t.id}}}`) || '';
                                            let valPreview = rendered.replace(/\s+/g, ' ');
                                            if (valPreview.length > 20) valPreview = valPreview.substring(0, 20) + '...';
                                            return (
                                                <tr key={i} className="border-b border-[#a1dfc3]/30 last:border-none">
                                                    <td className="p-3 w-[40%]">
                                                        <div className="font-bold text-[#0f5132]">{t.title || t.id}</div>
                                                        <div className="text-[10px] text-[#6aaa85] font-mono mt-0.5">{t.id}</div>
                                                    </td>
                                                    <td className="p-3 text-[#4f6f60] truncate max-w-[120px] text-xs">
                                                        {valPreview || <span className="italic text-[#a1dfc3] text-[10px]">no preview</span>}
                                                    </td>
                                                    {renderCopyButtons(t.id, rendered)}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VariablesModal;

