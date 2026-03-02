import { useState } from 'react';

const NewCaseModal = ({ isOpen, onClose, onSave }) => {
    const [jsonStr, setJsonStr] = useState('');
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    if (!isOpen) return null;

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        setError('');

        const file = e.dataTransfer.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                // Basic validation attempt
                JSON.parse(content);
                setJsonStr(content);
            } catch (err) {
                setError('Dropped file is not a valid JSON.');
            }
        };
        reader.readAsText(file);
    };

    const handleSave = () => {
        try {
            const data = JSON.parse(jsonStr);
            if (!data.caseNum && !data.id) {
                setError('JSON must contain a "caseNum" or "id" property.');
                return;
            }
            onSave(data);
            setJsonStr('');
            setError('');
            onClose();
        } catch (e) {
            setError('Invalid JSON format.');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div 
                className={`bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border transition-all flex flex-col max-h-[90vh] ${
                    isDragging ? 'border-emerald-500 bg-slate-800 scale-[1.02]' : 'border-slate-700'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-slate-200">New Case from JSON</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    <p className="text-sm text-slate-400 mb-4">
                        Paste or Drop a .json file below to create or update a case.
                    </p>
                    <textarea
                        className={`w-full h-[400px] bg-slate-950 text-emerald-400 font-mono text-sm p-4 rounded-lg border transition-all focus:outline-none ${
                            isDragging 
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                                : 'border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
                        }`}
                        placeholder={'{\n  "caseNum": "4201180000000042",\n  "caseTitle": "..."\n}'}
                        value={jsonStr}
                        onChange={(e) => {
                            setJsonStr(e.target.value);
                            setError('');
                        }}
                    />
                    {error && <div className="text-red-400 text-sm mt-3 font-bold bg-red-500/10 p-2 rounded">{error}</div>}
                    {isDragging && (
                        <div className="absolute inset-x-0 bottom-24 flex justify-center pointer-events-none">
                            <div className="bg-emerald-600 text-white px-6 py-3 rounded-full font-bold shadow-xl animate-bounce">
                                📂 Drop JSON file here
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm text-slate-300 font-bold hover:bg-slate-800 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewCaseModal;
