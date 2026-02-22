/**
 * Utility for date calculations, specifically for Japanese business days.
 * Assumes JapaneseHolidays is available globally (e.g., via script tag in index.html).
 */

/**
 * Calculates a date N business days from the start date.
 * Skips weekends (Sat, Sun) and Japanese national holidays.
 * 
 * @param {Date|string} startDate - The starting date.
 * @param {number} daySpan - Number of business days to add (default: 3).
 * @returns {Date} - The calculated business day.
 */
export function calculateNcDate(startDate = new Date(), daySpan = 3) {
    const date = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < daySpan) {
        // Increment by 1 day
        date.setDate(date.getDate() + 1);

        const dayOfWeek = date.getDay(); // 0: Sun, 6: Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Check for holiday (global JapaneseHolidays provided by samutake/japanese-holidays-js)
        let isHoliday = false;
        if (typeof window !== 'undefined' && window.JapaneseHolidays) {
            isHoliday = !!window.JapaneseHolidays.isHoliday(date);
        } else if (typeof JapaneseHolidays !== 'undefined') {
            isHoliday = !!JapaneseHolidays.isHoliday(date);
        }

        if (!isWeekend && !isHoliday) {
            daysAdded++;
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
