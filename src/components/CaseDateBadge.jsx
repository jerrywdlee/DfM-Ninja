import { isoToLocalDate, isoToCompactDate } from '../utils/dateUtils';

/**
 * Compact date badge with full tooltip on hover.
 * Shows: Resolved > Updated > Created (whichever is latest/most relevant)
 * Tooltip: all available dates combined.
 *
 * @param {object} props
 * @param {string|null} props.createdAt
 * @param {string|null} props.updatedAt
 * @param {string|null} props.resolvedAt
 * @param {'compact'|'short'} props.format  - 'compact' = YY/MM/DD, 'short' = MM/DD
 */
const CaseDateBadge = ({ createdAt, updatedAt, resolvedAt, format = 'compact' }) => {
    const isClosed = !!resolvedAt;

    const fmt = (iso) => {
        if (!iso) return '';
        if (format === 'short') {
            // MM/DD in local timezone
            const d = new Date(iso);
            if (isNaN(d)) return '';
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${mm}/${dd}`;
        }
        return isoToCompactDate(iso);
    };

    // Build full tooltip
    const parts = [];
    if (createdAt) parts.push(`Created:  ${isoToLocalDate(createdAt)}`);
    if (updatedAt) parts.push(`Updated:  ${isoToLocalDate(updatedAt)}`);
    if (resolvedAt) parts.push(`Resolved: ${isoToLocalDate(resolvedAt)}`);
    const fullTitle = parts.join('\n');
    if (!fullTitle) return null;

    // Pick display value: Resolved > Updated > Created
    if (isClosed && resolvedAt) {
        return (
            <span
                className="font-mono text-[9px] text-rose-800/80 leading-none cursor-default"
                title={fullTitle}
            >
                ✕ {fmt(resolvedAt)}
            </span>
        );
    }
    if (updatedAt) {
        return (
            <span
                className="font-mono text-[9px] text-slate-600 leading-none cursor-default"
                title={fullTitle}
            >
                ↻ {fmt(updatedAt)}
            </span>
        );
    }
    return (
        <span
            className="font-mono text-[9px] text-slate-600 leading-none cursor-default"
            title={fullTitle}
        >
            + {fmt(createdAt)}
        </span>
    );
};

export default CaseDateBadge;
