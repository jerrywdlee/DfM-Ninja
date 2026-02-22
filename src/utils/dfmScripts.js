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
