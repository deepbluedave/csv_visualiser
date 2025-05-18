// editor_app.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("Editor App Initializing...");

    // --- Global State for the Editor (managed by this module) ---
    let viewerConfigLocal = null;
    let editorConfigLocal = null;
    let csvDataMain = [];
    let csvHeadersFromUpload = [];

    // --- DOM Elements ---
    const {
        viewerConfigFileInput, editorConfigFileInput, csvDataFileInput,
        addRowBtn, sortDataBtn, exportCsvBtn, statusMessages
    } = editorDomElements;

    initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal);

    function updateEditorStatus(message, isError = false) {
        // ... (no change from previous version)
        if (statusMessages) {
            statusMessages.textContent = `Status: ${message}`;
            statusMessages.style.color = isError ? 'red' : '#495057';
        }
        if (isError) console.error(message);
        else console.log(message);
    }

    function checkAndEnableActions() {
        // ... (no change from previous version)
        const editorCfg = getEditorConfig();
        const viewerCfg = getViewerConfig();
        const canAddRow = editorCfg && editorCfg.columns && editorCfg.columns.length > 0;
        const canExport = editorCfg && editorCfg.columns && editorCfg.columns.length > 0 && (csvDataMain.length > 0 || editorCfg.columns.length > 0);
        const canSort = csvDataMain.length > 0 && viewerCfg?.generalSettings?.defaultItemSortBy?.length > 0 && editorCfg?.columns?.length > 0;

        if (addRowBtn) addRowBtn.disabled = !canAddRow;
        if (sortDataBtn) sortDataBtn.disabled = !canSort;
        if (exportCsvBtn) exportCsvBtn.disabled = !canExport;

        if (viewerCfg && editorCfg && csvDataMain.length > 0) {
            updateEditorStatus("All files loaded. Ready for editing.");
        } else if (viewerCfg && editorCfg) {
            updateEditorStatus("Configuration loaded. Load CSV data or use '+ Add Row'.");
        } else {
            let msg = "Load ";
            if (!viewerCfg) msg += "Viewer Config, ";
            if (!editorCfg) msg += "Editor Config, ";
            msg += "and optionally a CSV file.";
            updateEditorStatus(msg.replace(/, $/,'.'));
        }
    }

    window.addEventListener('editorDataChanged', () => {
        checkAndEnableActions();
    });

    // --- Event Handlers for File Inputs ---
    // viewerConfigFileInput and editorConfigFileInput listeners remain the same as previous full version
    if (viewerConfigFileInput) {
        viewerConfigFileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            updateEditorStatus(`Loading Viewer Config: ${file.name}...`);
            try {
                const loadedConfig = await loadJsConfigurationFile(file, 'defaultConfig');
                setViewerConfig(loadedConfig);
                viewerConfigLocal = getViewerConfig();
                initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal); // Update refs
                updateEditorStatus(`Viewer Config "${file.name}" loaded successfully.`);
                if (getEditorConfig()) {
                    renderGridStructure(getEditorConfig().columns);
                    // If data exists, try to sort and re-render after viewer config load
                    if (csvDataMain.length > 0) {
                        applyDefaultSortIfNeeded(); // NEW: Try sorting
                        renderGridData();
                    }
                }
            } catch (error) {
                updateEditorStatus(`Error loading Viewer Config: ${error.message}`, true);
                setViewerConfig(null); viewerConfigLocal = null;
                initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal); // Update refs
                clearGridStructure();
            }
            checkAndEnableActions();
        });
    }

    if (editorConfigFileInput) {
        editorConfigFileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            if (csvDataMain.length > 0 || getEditorConfig()) {
                if (!confirm("Loading a new editor configuration will discard current data and unsaved changes. Proceed?")) {
                    event.target.value = ''; return;
                }
                csvDataMain.length = 0;
                csvHeadersFromUpload = [];
                clearAllConfigs();
                viewerConfigLocal = null;
                editorConfigLocal = null;
                initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal);
                clearGridStructure();
            }
            updateEditorStatus(`Loading Editor Config: ${file.name}...`);
            try {
                const loadedConfig = await loadJsConfigurationFile(file, 'editorConfig');
                setEditorConfig(loadedConfig);
                editorConfigLocal = getEditorConfig();
                initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal); // Update refs
                updateEditorStatus(`Editor Config "${file.name}" loaded successfully.`);
                renderGridStructure(editorConfigLocal.columns);
                // If data exists, align and re-render (which might also trigger sort if viewerConfig is already there)
                if (csvDataMain.length > 0) {
                    alignDataToEditorSchema();
                    applyDefaultSortIfNeeded(); // NEW: Try sorting
                }
                renderGridData();
            } catch (error) {
                updateEditorStatus(`Error loading Editor Config: ${error.message}`, true);
                setEditorConfig(null); editorConfigLocal = null;
                initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal); // Update refs
                clearGridStructure();
            }
            checkAndEnableActions();
        });
    }

    if (csvDataFileInput) {
        csvDataFileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Please load an Editor Configuration file before loading CSV data.", true);
                event.target.value = ''; return;
            }
            updateEditorStatus(`Loading CSV Data: ${file.name}...`);
            try {
                const csvText = await readFileContent(file);
                const delimiter = currentEdConfig?.csvOutputOptions?.delimiter || ',';
                const parsed = editorParseCSV(csvText, delimiter);
                csvDataMain.length = 0;
                parsed.data.forEach(row => csvDataMain.push(row));
                csvHeadersFromUpload = parsed.headers;

                alignDataToEditorSchema(); // Align data to editor's column structure

                updateEditorStatus(`CSV Data "${file.name}" loaded: ${csvDataMain.length} rows.`);

                // --- APPLY DEFAULT SORT AFTER LOADING AND ALIGNING CSV ---
                applyDefaultSortIfNeeded();
                // --- END APPLY DEFAULT SORT ---

                renderGridData(); // Render the (potentially sorted) data
            } catch (error) {
                updateEditorStatus(`Error loading CSV Data: ${error.message}`, true);
                csvDataMain.length = 0; csvHeadersFromUpload = [];
                renderGridData();
            }
            checkAndEnableActions();
        });
    }

    /**
     * Applies the default sort if defined in viewerConfig and data/editorConfig are ready.
     */
    function applyDefaultSortIfNeeded() {
        const viewerCfg = getViewerConfig();
        const editorCfg = getEditorConfig();

        if (csvDataMain.length > 0 &&
            viewerCfg?.generalSettings?.defaultItemSortBy?.length > 0 &&
            editorCfg?.columns?.length > 0) {
            
            updateEditorStatus("Applying default sort criteria...");
            try {
                const effectiveHeadersForSorting = editorCfg.columns.map(c => c.name);
                const sortGlobalConfigMock = {
                    csvHeaders: effectiveHeadersForSorting,
                    generalSettings: { trueValues: viewerCfg.generalSettings.trueValues || [] }
                };
                sortData(csvDataMain, viewerCfg.generalSettings.defaultItemSortBy, sortGlobalConfigMock);
                console.log("Default sort applied to loaded CSV data.");
                // No need to call renderGridData() here, it will be called by the calling function.
            } catch (error) {
                updateEditorStatus(`Error applying default sort: ${error.message}`, true);
                console.error("Default sort error:", error);
            }
        }
    }

    function alignDataToEditorSchema() {
        // ... (no change from previous version)
        const currentEdConfig = getEditorConfig();
        if (!currentEdConfig || !currentEdConfig.columns) {
            console.warn("alignDataToEditorSchema: Editor config or columns not available.");
            return;
        }
        const editorColumnDefinitions = currentEdConfig.columns;
        const tempAlignedData = [];
        csvDataMain.forEach(rawRow => {
            const alignedRow = {};
            editorColumnDefinitions.forEach(colDef => {
                let val = rawRow.hasOwnProperty(colDef.name) ? rawRow[colDef.name] : '';
                if (colDef && colDef.type === 'multi-select') {
                    if (typeof val === 'string') {
                        val = val.split(',').map(s => s.trim()).filter(s => s);
                    } else if (!Array.isArray(val)) {
                        val = [];
                    }
                }
                alignedRow[colDef.name] = val;
            });
            tempAlignedData.push(alignedRow);
        });
        csvDataMain.length = 0;
        tempAlignedData.forEach(row => csvDataMain.push(row));
        console.log("CSV data aligned to editor schema.");
    }

    // --- Action Button Handlers ---
    if (addRowBtn) {
        // ... (no change from previous version)
        addRowBtn.addEventListener('click', () => {
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Cannot add row: Editor config not loaded.", true); return;
            }
            if(addNewRow()) { // addNewRow in editor_data_grid.js
                updateEditorStatus("Row added. Scroll to bottom if not visible.");
                // checkAndEnableActions(); // Called by 'editorDataChanged' event
            } else {
                updateEditorStatus("Failed to add row (see console for details).", true);
            }
        });
    }

    if (sortDataBtn) {
        // ... (no change from previous version - this is for manual sort)
         sortDataBtn.addEventListener('click', () => {
            const viewerCfg = getViewerConfig();
            const editorCfg = getEditorConfig();

            if (!csvDataMain || csvDataMain.length === 0) {
                updateEditorStatus("No data to sort.", true); return;
            }
            if (!viewerCfg?.generalSettings?.defaultItemSortBy || viewerCfg.generalSettings.defaultItemSortBy.length === 0) {
                updateEditorStatus("No default sort criteria defined in viewer configuration.", true); return;
            }
            if (!editorCfg || !editorCfg.columns || editorCfg.columns.length === 0) {
                updateEditorStatus("Editor configuration not loaded, cannot determine sortable columns effectively.", true); return;
            }

            updateEditorStatus("Sorting data...");
            try {
                const effectiveHeadersForSorting = editorCfg.columns.map(c => c.name);
                const sortGlobalConfigMock = {
                    csvHeaders: effectiveHeadersForSorting,
                    generalSettings: { trueValues: viewerCfg.generalSettings.trueValues || [] }
                };
                sortData(csvDataMain, viewerCfg.generalSettings.defaultItemSortBy, sortGlobalConfigMock);
                renderGridData();
                updateEditorStatus("Data sorted using viewer's default sort criteria.");
            } catch (error) {
                updateEditorStatus(`Error sorting data: ${error.message}`, true);
                console.error("Sort error:", error);
            }
        });
    }

    if (exportCsvBtn) {
        // ... (no change from previous version)
        exportCsvBtn.addEventListener('click', () => {
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig || (!csvDataMain.length && !(currentEdConfig.columns && currentEdConfig.columns.length > 0))) {
                updateEditorStatus("Cannot export: Editor config or data not loaded sufficiently.", true); return;
            }
            const outputOptions = currentEdConfig.csvOutputOptions || {};
            const csvString = generateCsvForExport(csvDataMain, currentEdConfig.columns, outputOptions);
            if (csvString !== null || (csvString === '' && csvDataMain.length === 0) ) {
                const filename = `edited_data_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.csv`;
                triggerDownload(csvString, filename);
                updateEditorStatus(`Data exported to ${filename}.`);
            } else {
                updateEditorStatus("No data to export or error during CSV generation.", true);
            }
        });
    }

    // --- Initial UI State ---
    updateEditorStatus("Load Viewer Config, then Editor Config, then optionally a CSV file.");
    checkAndEnableActions();

    console.log("Editor App Initialized.");
}); // End of DOMContentLoaded

// --- Global Utility (triggerDownload) ---
// ... (no change from previous version)
function triggerDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    if (content === null || content === undefined) {
        console.warn("triggerDownload: No content provided.");
        return;
    }
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + content], { type: mimeType });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        alert("Download not directly supported by your browser. Check console for data or try a different browser.");
        console.error("triggerDownload: HTML5 download attribute not supported.");
        console.log("Data for manual copy:\n----------\n", content, "\n----------");
    }
}