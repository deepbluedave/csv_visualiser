// csv_editor/js/confluence_attachment.js

function confluenceAvailable() {
    return (typeof AJS !== 'undefined') && AJS &&
           typeof AJS.contextPath === 'function' &&
           AJS.Meta && typeof AJS.Meta.get === 'function';
}

async function saveOrUpdateConfluenceAttachment(fileName, fileContent) {
    return new Promise(async (resolve, reject) => {
        if (!confluenceAvailable()) {
            return reject({ message: 'Confluence AJS object not available.' });
        }
        const pageId = AJS.Meta.get('page-id');
        const contextPath = AJS.contextPath();
        if (!pageId) return reject({ message: 'Error: Could not determine Page ID.' });

        const mimeType = fileName.endsWith('.csv') ? 'text/csv'
            : (fileName.endsWith('.md') ? 'text/markdown' : 'text/plain');
        const formData = new FormData();
        formData.append('file', new Blob([fileContent], { type: mimeType }), fileName);
        formData.append('comment', `File updated programmatically on ${new Date().toLocaleDateString()}`);
        formData.append('minorEdit', 'true');

        const checkUrl = `${contextPath}/rest/api/content/${pageId}/child/attachment?filename=${encodeURIComponent(fileName)}`;
        try {
            const checkResp = await fetch(checkUrl, { credentials: 'same-origin' });
            if (checkResp.ok) {
                const respData = await checkResp.json();
                const attachmentId = (respData.results && respData.results.length > 0) ? respData.results[0].id : null;
                if (attachmentId) {
                    const updateUrl = `${contextPath}/rest/api/content/${pageId}/child/attachment/${attachmentId}/data`;
                    const upResp = await fetch(updateUrl, {
                        method: 'POST',
                        body: formData,
                        credentials: 'same-origin',
                        headers: { 'X-Atlassian-Token': 'no-check' }
                    });
                    if (!upResp.ok) throw upResp;
                    return resolve(await upResp.json());
                } else {
                    return resolve(await _createNewAttachment(pageId, contextPath, formData));
                }
            } else if (checkResp.status === 404) {
                return resolve(await _createNewAttachment(pageId, contextPath, formData));
            } else {
                throw checkResp;
            }
        } catch (err) {
            reject(err);
        }
    });
}

async function _createNewAttachment(pageId, contextPath, formData) {
    const createUrl = `${contextPath}/rest/api/content/${pageId}/child/attachment`;
    const resp = await fetch(createUrl, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: { 'X-Atlassian-Token': 'no-check' }
    });
    if (!resp.ok) throw resp;
    return resp.json();
}

// --- End of file confluence_attachment.js
