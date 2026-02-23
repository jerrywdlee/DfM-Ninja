/**
 * Scripts to be executed on the DfM page via RPC.
 * These functions are serialized and sent to DfM to be eval()ed.
 */

/**
 * Extracts the current Case Number and Title from the DfM page.
 */
export const extractCaseData = () => {
    const getVal = (id, selector, fallback) => {
        const el = document.getElementById(id) || document.querySelector(selector);
        if (!el) return fallback;
        return el.value || el.innerText || fallback;
    };

    return {
        id: getVal('caseNumInput', '.case-id-selector', '4201180000000041'),
        title: getVal('caseTitleInput', '.case-title-selector', 'Case from RPC'),
        caseNum: getVal('caseNumInput', '.case-id-selector', '4201180000000041'),
        caseTitle: getVal('caseTitleInput', '.case-title-selector', 'Case from RPC'),
        assignedTo: getVal('assignedToInput', '.assigned-to', ''),
        internalTitle: getVal('internalTitleInput', '.internal-title', ''),
        custStatement: getVal('custStatementInput', '.cust-statement', ''),
        phoneNum: getVal('phoneNumInput', '.phone-num', ''),
        email: getVal('emailInput', '.email', ''),
        contactMethod: getVal('contactMethodInput', '.contact-method', ''),
        severity: getVal('severityInput', '.severity', ''),
        statusReason: getVal('statusReasonInput', '.status-reason', ''),
        servName: getVal('servNameInput', '.serv-name', ''),
        lastUpdatedAt: getVal('lastUpdatedAtInput', '.last-updated-at', ''),
        SLA: getVal('SLAInput', '.sla', ''),
        emailCcList: getVal('emailCcListInput', '.email-cc-list', '').split(',').map(s => s.trim()).filter(Boolean),
        extractedAt: new Date().toISOString()
    };
};

/**
 * Highlights a list of keywords in the DOM using CSS Custom Highlights API.
 * Needs to be sent with args: { keywords: [...] } or just keywords array
 */
export const highlightKeywords = (args) => {
    // If args is an array, use it directly. Otherwise check for args.keywords.
    const keywords = Array.isArray(args) ? args : (args?.keywords || []);

    if (!keywords.length || !CSS.highlights) return;

    // 1. スタイル注入（省略可：CSSファイルに書いてもOK）
    if (!document.getElementById("hl-style")) {
        document.head.insertAdjacentHTML("beforeend", `<style id="hl-style">::highlight(search-results){background:#ffeb3b;color:#000;}</style>`);
    }

    // 2. 正規表現の作成 (g: 全体、i: 大文字小文字不問)
    // 特殊文字をエスケープし、| で結合
    const pattern = keywords.map(k => k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|');
    const regex = new RegExp(pattern, 'gi');

    const ranges = [];
    const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;

    while (node = treeWalker.nextNode()) {
        // matchAll を使って、ノード内の全ヒット箇所のインデックスを取得
        for (const match of node.textContent.matchAll(regex)) {
            const range = new Range();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            ranges.push(range);
        }
    }

    CSS.highlights.set("search-results", new Highlight(...ranges));
};
