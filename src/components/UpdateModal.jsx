import pkg from '../../package.json';

const STORAGE_KEY = 'dfm_ninja_app_version';

/**
 * Check if an update notification should be shown.
 * Returns: { previousVersion, mode } or null if up-to-date.
 *   mode: 'welcome'  – brand-new user (no settings exist)
 *         'upgrade'  – existing user without version record
 *         'update'   – known previous version differs
 */
export const checkForUpdate = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        const hasSettings = !!localStorage.getItem('dfm_ninja_settings');
        if (hasSettings) {
            // Existing user upgrading from a version without version tracking
            return { previousVersion: null, mode: 'upgrade' };
        }
        // Brand-new user
        return { previousVersion: null, mode: 'welcome' };
    }
    if (stored !== pkg.version) {
        return { previousVersion: stored, mode: 'update' };
    }
    return null; // same version, no modal
};

/**
 * Acknowledge the update and persist the new version.
 */
export const acknowledgeUpdate = () => {
    localStorage.setItem(STORAGE_KEY, pkg.version);
};

// ── Per-mode content ────────────────────────────────────────────────
const modeConfig = {
    welcome: {
        emoji: '👋',
        title: 'ようこそ DfM-Ninja へ！',
        subtitle: () => <>現在のバージョン: v{pkg.version}</>,
        description: (
            <>
                ご利用ありがとうございます！<br />
                まずは以下のリリースページから <code className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">templates.zip</code> をダウンロードし、Settings からインポートしてテンプレートをセットアップしてください。
            </>
        ),
        buttonLabel: () => `📦 リリースページを開く (v${pkg.version})`,
    },
    upgrade: {
        emoji: '🚀',
        title: 'アップデートのお知らせ',
        subtitle: () => <>v{pkg.version} に更新されました</>,
        description: (
            <>
                テンプレートの更新が必要な場合があります。<br />
                以下のリンクから最新のリリースページを確認し、<code className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">templates.zip</code> をダウンロードして Settings からインポートしてください。
            </>
        ),
        buttonLabel: () => `📦 リリースページを開く (v${pkg.version})`,
    },
    update: {
        emoji: '🎉',
        title: 'アップデートのお知らせ',
        subtitle: (prev) => <>v{prev} → v{pkg.version}</>,
        description: (
            <>
                テンプレートの更新が必要な場合があります。<br />
                以下のリンクから最新のリリースページを確認し、<code className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">templates.zip</code> をダウンロードして Settings からインポートしてください。
            </>
        ),
        buttonLabel: () => `📦 リリースページを開く (v${pkg.version})`,
    },
};

const UpdateModal = ({ isOpen, previousVersion, mode = 'update', onClose }) => {
    if (!isOpen) return null;

    const releaseUrl = `${pkg.homepage}/releases/tag/v${pkg.version}`;
    const cfg = modeConfig[mode] || modeConfig.update;

    const handleAcknowledge = () => {
        acknowledgeUpdate();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-700 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-slate-200">{cfg.emoji} {cfg.title}</h2>
                    <button onClick={handleAcknowledge} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="text-3xl">{cfg.emoji}</span>
                        <div>
                            <p className="text-slate-400 text-sm">
                                DfM-Ninja {mode === 'welcome' ? 'へようこそ' : 'が更新されました'}
                            </p>
                            <p className="text-slate-200 font-mono text-lg font-bold">
                                {cfg.subtitle(previousVersion)}
                            </p>
                        </div>
                    </div>

                    <p className="text-slate-400 text-sm leading-relaxed mb-5">
                        {cfg.description}
                    </p>

                    <a
                        href={releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                    >
                        {cfg.buttonLabel()}
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
