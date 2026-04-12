import pkg from '../../package.json';

const STORAGE_KEY = 'dfm_ninja_app_version';

/**
 * Check if an update notification should be shown.
 * Returns the previous version string if different, or null if up-to-date / first visit.
 */
export const checkForUpdate = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        // First visit – store current version silently
        localStorage.setItem(STORAGE_KEY, pkg.version);
        return null;
    }
    if (stored !== pkg.version) {
        return stored; // return old version so we can show it
    }
    return null; // same version
};

/**
 * Acknowledge the update and persist the new version.
 */
export const acknowledgeUpdate = () => {
    localStorage.setItem(STORAGE_KEY, pkg.version);
};

const UpdateModal = ({ isOpen, previousVersion, onClose }) => {
    if (!isOpen) return null;

    const releaseUrl = `${pkg.homepage}/releases/tag/v${pkg.version}`;

    const handleAcknowledge = () => {
        acknowledgeUpdate();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-700 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-slate-200">🎉 アップデートのお知らせ</h2>
                    <button onClick={handleAcknowledge} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="text-3xl">🚀</span>
                        <div>
                            <p className="text-slate-400 text-sm">
                                DfM-Ninja が更新されました
                            </p>
                            <p className="text-slate-200 font-mono text-lg font-bold">
                                v{previousVersion} → v{pkg.version}
                            </p>
                        </div>
                    </div>

                    <p className="text-slate-400 text-sm leading-relaxed mb-5">
                        テンプレートの更新が必要な場合があります。<br />
                        以下のリンクから最新のリリースページを確認し、<code className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">templates.zip</code> をダウンロードして Settings からインポートしてください。
                    </p>

                    <a
                        href={releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                    >
                        📦 リリースページを開く (v{pkg.version})
                    </a>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={handleAcknowledge}
                        className="px-5 py-2 rounded-lg text-sm text-slate-300 font-bold hover:bg-slate-800 transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateModal;
