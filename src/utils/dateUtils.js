/**
 * Utility for date calculations, specifically for Japanese business days.
 * Assumes JapaneseHolidays is available globally (e.g., via script tag in index.html).
 */

/**
 * Calculates a date N business days from the start date.
 * Skips weekends (Sat, Sun), Japanese national holidays,
 * and optional custom holidays from settings.yml (Holidays list).
 * 
 * @param {Date|string} startDate - The starting date.
 * @param {number} daySpan - Number of business days to add (default: 3).
 * @param {string[]} [customHolidays=[]] - Optional array of holiday strings from settings.Holidays.
 * @returns {Date} - The calculated business day.
 */
export function calculateNcDate(startDate = new Date(), daySpan = 3, customHolidays = []) {
    const date = new Date(startDate);
    let daysMoved = 0;
    const absSpan = Math.abs(daySpan);
    const direction = daySpan >= 0 ? 1 : -1;

    while (daysMoved < absSpan) {
        // Move by 1 day
        date.setDate(date.getDate() + direction);

        const dayOfWeek = date.getDay(); // 0: Sun, 6: Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Check for Japanese national holiday
        let isHoliday = false;
        if (typeof window !== 'undefined' && window.JapaneseHolidays) {
            isHoliday = !!window.JapaneseHolidays.isHoliday(date);
        } else if (typeof JapaneseHolidays !== 'undefined') {
            isHoliday = !!JapaneseHolidays.isHoliday(date);
        }

        // Check for custom holidays (e.g. year-end/New Year from settings.Holidays)
        const isCustom = customHolidays.length > 0 ? isCustomHoliday(date, customHolidays) : false;

        if (!isWeekend && !isHoliday && !isCustom) {
            daysMoved++;
        }
    }

    return date;
}

/**
 * Formats a date to a Japanese long format string.
 * Example: 2026年2月26日(木曜日)
 */
export function formatJapaneseDate(date) {
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

/**
 * Formats a date dynamically based on a suffix for template rendering.
 * Suffixes:
 * - _XS: 0226
 * - _S: 02/26
 * - _L: Feb-26
 * - _XL: 2 月 26 日 (木)
 */
export function formatDynamicDate(date, suffix) {
    if (!date || isNaN(date.getTime())) return '';

    const pad = (n) => String(n).padStart(2, '0');
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const dowJP = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const monthsEng = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    switch (suffix) {
        case '_XS':
            return `${pad(month)}${pad(day)}`;
        case '_S':
            return `${pad(month)}/${pad(day)}`;
        case '_L':
            return `${monthsEng[month - 1]}-${pad(day)}`;
        case '_XL':
            return `${month} 月 ${day} 日 (${dowJP})`;
        default:
            return `${date.getFullYear()}-${pad(month)}-${pad(day)}`;
    }
}
/**
 * Formats a date to YYYY-MM-DD in local time.
 * Avoids the timezone shift issue of toISOString().
 */
export function formatDateIsoLocal(date) {
    if (!date || isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Formats an ISO date string to "YYYY-MM-DD" in the browser's LOCAL timezone.
 * Use this anywhere you currently do `isoStr.split('T')[0]` to avoid UTC offset issues.
 * @param {string|null} iso - ISO 8601 date string (e.g. "2026-04-01T15:30:00.000Z")
 * @returns {string} e.g. "2026-04-02" (adjusted for local timezone)
 */
export function isoToLocalDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Formats an ISO date string to compact "YY/MM/DD" in the browser's LOCAL timezone.
 * @param {string|null} iso - ISO 8601 date string
 * @returns {string} e.g. "26/04/02"
 */
export function isoToCompactDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}/${mm}/${dd}`;
}

/**
 * Checks if two dates (Date object or string) fall on the same calendar day.
 */
export function isSameDate(d1, d2) {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Parses a holiday date string into a Date object.
 *
 * Supported formats:
 *   "YYYY/MM/DD"  - Absolute date (specific year only)
 *   "+N/MM/DD"    - Relative: N is a single digit (0-9); +0 = this year, +1 = next year, etc.
 *
 * @param {string} str - Holiday date string from settings.yml.
 * @param {Date} [baseDate=new Date()] - Reference date for +N offset.
 * @returns {Date|null}
 */
export function parseHolidayDate(str, baseDate = new Date()) {
    if (!str) return null;
    const s = String(str).trim();

    // Relative: +N/MM/DD (N = single digit 0-9)
    const relMatch = s.match(/^\+(\d)\/(\d{1,2})\/(\d{1,2})$/);
    if (relMatch) {
        const year = baseDate.getFullYear() + parseInt(relMatch[1]);
        const d = new Date(year, parseInt(relMatch[2]) - 1, parseInt(relMatch[3]));
        return isNaN(d.getTime()) ? null : d;
    }

    // Absolute: YYYY/MM/DD
    const absMatch = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (absMatch) {
        const d = new Date(parseInt(absMatch[1]), parseInt(absMatch[2]) - 1, parseInt(absMatch[3]));
        return isNaN(d.getTime()) ? null : d;
    }

    return null;
}

/**
 * Returns true if `date` matches any entry in the Holidays list (from settings.yml).
 *
 * @param {Date} date
 * @param {string[]} holidays - Array from settings.Holidays
 * @param {Date} [baseDate=new Date()]
 * @returns {boolean}
 */
export function isCustomHoliday(date, holidays = [], baseDate = new Date()) {
    return holidays.some(str => {
        const parsed = parseHolidayDate(str, baseDate);
        return parsed ? isSameDate(date, parsed) : false;
    });
}

/**
 * Detects if `date` is within `warningDaysBefore` calendar days before the
 * start of a "major holiday cluster" defined in the Holidays list.
 *
 * A cluster = a group of consecutive days all in the Holidays list.
 * Runs on the Holidays list only (no weekend auto-expansion).
 * Operationally: include all relevant weekends explicitly in settings.Holidays.
 *
 * @param {Date|string} date - The date to check.
 * @param {string[]} holidays - Array from settings.Holidays.
 * @param {object} [options]
 * @param {number} [options.warningDaysBefore=10] - Calendar days before cluster start to warn.
 * @param {number} [options.minClusterDays=3] - Min consecutive days to qualify as major.
 * @param {Date} [options.baseDate=new Date()] - Reference for +N relative dates.
 * @returns {boolean}
 */
export function isNearMajorHolidayCluster(date, holidays = [], {
    warningDaysBefore = 10,
    minClusterDays = 3,
    baseDate = new Date()
} = {}) {
    if (!holidays || holidays.length === 0) return false;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Parse and sort all holiday dates
    const parsed = holidays
        .map(str => parseHolidayDate(str, baseDate))
        .filter(Boolean)
        .map(d => { d.setHours(0, 0, 0, 0); return d; })
        .sort((a, b) => a - b);

    if (parsed.length === 0) return false;

    // Group into consecutive clusters
    const clusters = [];
    let clusterStart = parsed[0];
    let clusterEnd = parsed[0];

    for (let i = 1; i < parsed.length; i++) {
        const prev = parsed[i - 1];
        const curr = parsed[i];
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Contiguous — extend current cluster
            clusterEnd = curr;
        } else {
            // Gap — save current cluster and start a new one
            clusters.push({ start: clusterStart, end: clusterEnd });
            clusterStart = curr;
            clusterEnd = curr;
        }
    }
    clusters.push({ start: clusterStart, end: clusterEnd });

    // Check if checkDate is within warningDaysBefore of any major cluster
    for (const { start, end } of clusters) {
        const clusterDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
        if (clusterDays < minClusterDays) continue;

        // How many calendar days before the cluster start is checkDate?
        const daysUntilCluster = Math.round((start - checkDate) / (1000 * 60 * 60 * 24));
        if (daysUntilCluster >= 0 && daysUntilCluster <= warningDaysBefore) {
            return true;
        }
    }

    return false;
}
