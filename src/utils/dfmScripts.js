/**
 * Scripts to be executed on the DfM page via RPC.
 * These functions are serialized and sent to DfM to be eval()ed.
 */

/**
 * Extracts the current Case Number and Title from the DfM page.
 */
export const extractCaseData = () => {
    const formStatusInfo = () => {
        const $infoArea = $('#headerBodyContainer [data-id="headerContainer"]').next();

        const res = {
            caseNum: '', servName: '', severity: '', statusReason: '',
            sampledAt: (new Date()).toISOString(),
        };

        const $columns = $infoArea.find('[data-preview_orientation="column"]');

        let text = $($columns[0]).text();
        let match = text.match(/^(\d+)\ \|(.*?)Case/);
        if (match && match[1] && match[2]) {
            res.caseNum = match[1].trim();
            res.servName = match[2].trim();
        }

        text = $($columns[1]).text();
        match = text.match(/^(.+?)Severity/);
        if (match && match[1]) {
            res.severity = match[1].trim();
        }

        text = $($columns[2]).text();
        match = text.match(/^(.+?)Status/);
        if (match && match[1]) {
            res.statusReason = match[1].trim();
        }

        return res;
    }

    const isDenied = () => {
        const $contactInfo = $('[aria-label="Contact information"]');
        const errMsg = $('[id*="component-error-text"]').text();
        const res = errMsg.match(/Access\ Is\ Denied/i);

        return !!(res && $contactInfo.length === 0);
    }

    const $headerCon = $('#headerBodyContainer');
    const caseTitle = $headerCon.find('[data-id="header_title"]').attr('title');
    const assignedTo = $headerCon.find('[href*="onesupport.crm.dynamics.com"]').text().trim();

    const statusInfo = formStatusInfo();

    const $restrictedInfo = $('[aria-label="Restricted information"]');
    const custStatement = $restrictedInfo.find('textarea[aria-label="Customer Statement"]').val();

    const internalTitle = $('[aria-label="Internal title"]').val();

    if (isDenied()) {
        return {
            caseTitle, assignedTo, internalTitle, custStatement, ...statusInfo,
            error: 'Access Is Denied',
        }
    }

    const $contactInfo = $('[aria-label="Contact information"]');
    const phoneNum = $contactInfo.find('[data-id$=phone-text-input]').val();
    const email = $contactInfo.find('[aria-label=Email]').val();
    const contactMethod = $contactInfo.find('[aria-label="Preferred method of contact"]').val();



    let emailCcList = $('[aria-label="Email CC list"]').val().trim();

    const $SLA = $('[aria-label*="IR"][aria-label*="SLA"][aria-label*="In Progress"]').next();
    const SLA = $SLA.text() ? $SLA.text() : 'Met';

    if (emailCcList) {
        emailCcList = emailCcList.split(/;/);
    } else {
        emailCcList = [];
    }

    if (isDenied() && !email) {
        return {
            caseTitle, assignedTo, internalTitle, custStatement, ...statusInfo,
            error: 'Access Is Denied',
        }
    }

    return {
        caseTitle, assignedTo, internalTitle, custStatement,
        phoneNum, email, emailCcList, contactMethod, SLA, ...statusInfo,
    }
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
