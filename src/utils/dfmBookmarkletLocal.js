(function () {
    const extractCaseData = () => {
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

        let emailCcList = $('[aria-label="Email CC list"]').val()?.trim() || '';

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

    const triggerDownload = () => {
        try {
            const data = extractCaseData();
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const caseNum = data.caseNum || 'unknown';
            a.download = `MetaData_${caseNum}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Extraction error:", e);
            alert("Failed to extract case data: " + e.message);
        }
    };

    if (!window.__dfmNinjaLocalInitialized) {
        window.__dfmNinjaLocalInitialized = true;
        window.addEventListener('beforeunload', e => {
            e.preventDefault();
            e.returnValue = '';
        });
    }

    const style = 'background: none; border: none; right: 4px; top: 60px; font-size: 18px; position: absolute; z-index: 10000;';
    if (!document.getElementById('DfM-Ninja-Local')) {
        const $btn = $(`<button style="${style}" id="DfM-Ninja-Local" title="Download Case Data (Offline)">🥷</button>`);
        $btn.on('click', triggerDownload);
        $('body').append($btn);
    }
    console.log("DfM-Ninja Local Bookmarklet Initialized.");
})();
