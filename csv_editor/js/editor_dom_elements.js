// csv_editor/js/editor_dom_elements.js

const editorDomElements = {
    viewerConfigFileInput: document.getElementById('viewerConfigFileInput'),
    editorConfigFileInput: document.getElementById('editorConfigFileInput'),
    csvDataFileInput: document.getElementById('csvDataFileInput'),
    addRowBtn: document.getElementById('addRowBtn'),
    sortDataBtn: document.getElementById('sortDataBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    uploadConfluenceBtn: document.getElementById('uploadConfluenceBtn'),
    statusMessages: document.getElementById('statusMessages'),
    editorGridContainer: document.getElementById('editorGridContainer'),
    editorGridTable: document.querySelector('#editorGridContainer table'),
    editorGridThead: document.querySelector('#editorGridContainer table thead'),
    editorGridTbody: document.querySelector('#editorGridContainer table tbody'),
    
    // Elements supporting the change digest modal
    viewChangesBtn: document.getElementById('viewChangesBtn'),
    changesModal: document.getElementById('changesModal'),
    changeDigestOutput: document.getElementById('changeDigestOutput'),
    closeChangesModalBtn: document.getElementById('closeChangesModalBtn'), // For the modal's close button
    hierarchyToggle: document.getElementById('hierarchyToggle')
};

if (!editorDomElements.editorGridTable) {
    console.error("CRITICAL: Editor grid table element not found!");
    if (editorDomElements.statusMessages) {
        editorDomElements.statusMessages.textContent = "CRITICAL ERROR: HTML structure incomplete. Grid table missing.";
        editorDomElements.statusMessages.style.color = "red";
    }
}
// Check new elements
if (!editorDomElements.viewChangesBtn) console.warn("DOM Element 'viewChangesBtn' not found.");
if (!editorDomElements.changesModal) console.warn("DOM Element 'changesModal' not found.");
if (!editorDomElements.changeDigestOutput) console.warn("DOM Element 'changeDigestOutput' not found.");
if (!editorDomElements.closeChangesModalBtn) console.warn("DOM Element 'closeChangesModalBtn' not found.");
if (!editorDomElements.uploadConfluenceBtn) console.warn("DOM Element 'uploadConfluenceBtn' not found.");
if (!editorDomElements.hierarchyToggle) console.warn("DOM Element 'hierarchyToggle' not found.");

// --- End of file editor_dom_elements.js ---