/**
 * Scans plain text and converts URLs into HTML hyperlink anchor tags.
 * Exposes the method to the global window object for use in templates.
 * 
 * @param {string} text - The plain text containing URLs
 * @returns {string} HTML string with clickable links
 */
export const autoLinkUrls = (text) => {
    if (!text) return '';
    // Match: 1. Existing <a> tags, 2. Other HTML tags, 3. http/https URLs
    const regex = /(<a\b[^>]*>[\s\S]*?<\/a>)|(<[^>]+>)|(https?:\/\/[^\s<"']+)/gi;
    
    return text.replace(regex, (match, aTag, otherTag, url) => {
        if (aTag) return aTag; // Already an anchor
        if (otherTag) return otherTag; // Some other HTML tag
        if (url) {
            // Unlinked URL
            return `<a href="${url}" target="_blank" class="text-blue-500 hover:text-blue-600 underline cursor-pointer" contenteditable="false">${url}</a>`;
        }
        return match;
    });
};

// Expose globally for use within template scripts (e.g. step1.html, step2.html)
window.autoLinkUrls = autoLinkUrls;
