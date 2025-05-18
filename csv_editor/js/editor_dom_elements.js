// editor_dom_elements.js

const editorDomElements = {
    viewerConfigFileInput: document.getElementById('viewerConfigFileInput'),
    editorConfigFileInput: document.getElementById('editorConfigFileInput'),
    csvDataFileInput: document.getElementById('csvDataFileInput'),
    addRowBtn: document.getElementById('addRowBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    statusMessages: document.getElementById('statusMessages'),
    editorGridContainer: document.getElementById('editorGridContainer'),
    editorGridTable: document.querySelector('#editorGridContainer table'),
    editorGridThead: document.querySelector('#editorGridContainer table thead'),
    editorGridTbody: document.querySelector('#editorGridContainer table tbody'),
    sortDataBtn: document.getElementById('sortDataBtn')
};

if (!editorDomElements.editorGridTable) {
    console.error("CRITICAL: Editor grid table element not found!");
    if (editorDomElements.statusMessages) {
        editorDomElements.statusMessages.textContent = "CRITICAL ERROR: HTML structure incomplete. Grid table missing.";
        editorDomElements.statusMessages.style.color = "red";
    }
}