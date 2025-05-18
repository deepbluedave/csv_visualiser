// editor_app.js
document.addEventListener('DOMContentLoaded', async () => {
    console.log("EDITOR_APP: DOMContentLoaded - Initializing...");

    // --- State Variables ---
    let viewerConfigLocal = null;
    let editorConfigLocal = null;
    let csvDataMain = [];
    let csvHeadersFromUpload = [];

    // --- DOM Elements ---
    const {
        viewerConfigFileInput, editorConfigFileInput, csvDataFileInput,
        addRowBtn, sortDataBtn, exportCsvBtn, statusMessages
    } = editorDomElements;
    const mainPageHeading = document.querySelector('#csv-editor-wrapper h1');

    // --- Helper Function Definitions ---
    function updateEditorTitles(viewerConfig) {
        const baseTitle = viewerConfig?.generalSettings?.dashboardTitle || "CSV Data";
        const editorPageTitle = `${baseTitle} - Editor`;
        document.title = editorPageTitle;
        if (mainPageHeading) {
            mainPageHeading.textContent = editorPageTitle;
        } else {
            const firstH1 = document.querySelector('h1');
            if (firstH1) firstH1.textContent = editorPageTitle;
        }
        console.log(`EDITOR_APP: Titles updated to "${editorPageTitle}"`);
    }

    function resetEditorTitles() {
        const defaultEditorTitle = "Config-Driven CSV Editor";
        document.title = defaultEditorTitle;
        if (mainPageHeading) {
            mainPageHeading.textContent = defaultEditorTitle;
        } else {
            const firstH1 = document.querySelector('h1');
            if (firstH1) firstH1.textContent = defaultEditorTitle;
        }
        console.log(`EDITOR_APP: Titles reset to "${defaultEditorTitle}"`);
    }

    function updateEditorStatus(message, isError = false) {
        if (isError) {
            console.error(`EDITOR_APP_STATUS (Error): ${message}`);
        } else {
            console.log(`EDITOR_APP_STATUS: ${message}`);
        }
        if (statusMessages) {
            statusMessages.textContent = `Status: ${message}`;
            statusMessages.style.color = isError ? 'red' : '#495057';
        }
    }

    function checkAndEnableActions() {
        const editorCfg = getEditorConfig();
        const viewerCfg = getViewerConfig();
        const canAddRow = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0);
        const canExport = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0 && (csvDataMain.length > 0 || (editorCfg.columns && editorCfg.columns.length > 0)));
        const canSort = !!(csvDataMain.length > 0 && viewerCfg?.generalSettings?.defaultItemSortBy?.length > 0 && editorCfg?.columns?.length > 0);

        if (addRowBtn) addRowBtn.disabled = !canAddRow;
        if (sortDataBtn) sortDataBtn.disabled = !canSort;
        if (exportCsvBtn) exportCsvBtn.disabled = !canExport;
    }

    async function loadFileFromUrl(url, type, expectedGlobalVarName = null) {
        console.log(`EDITOR_APP: loadFileFromUrl - Attempting to fetch ${type} from URL: ${url}`);
        if (!url) {
            console.warn(`EDITOR_APP: loadFileFromUrl - No URL provided for ${type}.`);
            return null;
        }
        updateEditorStatus(`Fetching ${type} from URL: ${url.substring(url.lastIndexOf('/') + 1)}...`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorMsg = `HTTP error ${response.status} fetching ${url}. Manual input for ${type} remains available.`;
                updateEditorStatus(errorMsg, true);
                return null;
            }
            const content = await response.text();
            console.log(`EDITOR_APP: loadFileFromUrl - Successfully fetched content for ${type} from ${url}. Length: ${content.length}`);
            if (type === 'ViewerConfig' || type === 'EditorConfig') {
                const pseudoFileName = url.substring(url.lastIndexOf('/') + 1) || `${type.toLowerCase()}_from_url.js`;
                const pseudoFile = new File([content], pseudoFileName, { type: 'application/javascript' });
                return await loadJsConfigurationFile(pseudoFile, expectedGlobalVarName);
            } else if (type === 'CSVData') {
                return content;
            }
        } catch (error) {
            updateEditorStatus(`Error loading ${type} from ${url}: ${error.message}. Manual input for ${type} remains available.`, true);
            return null;
        }
    }
    
    function confirmAndClearOnManualOverride(configTypeChanging) {
        let message = "";
        let shouldPrompt = false;
        if (configTypeChanging === "ViewerConfig" && getViewerConfig()) {
            message = "Manually loading a new Viewer Config will reprocess data with new display settings. Current data will be kept. Proceed?";
            shouldPrompt = true;
        }
        if (shouldPrompt) {
            if (!confirm(message)) { return false; }
        }
        if (configTypeChanging === "ViewerConfig") {
             setViewerConfig(null);
             viewerConfigLocal = null;
        }
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());
        return true;
    }
    
    function clearAllApplicationState() {
        console.log("EDITOR_APP: clearAllApplicationState called for full reset.");
        csvDataMain.length = 0;
        csvHeadersFromUpload = [];
        clearAllConfigs(); 
        viewerConfigLocal = null;
        editorConfigLocal = null;
        initDataGridReferences(csvDataMain, null, null); 
        clearGridStructure();
        resetEditorTitles();
        updateEditorStatus("Editor reset. Load new configurations.");
        if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        if(editorConfigFileInput) {
            editorConfigFileInput.parentElement.style.display = '';
            editorConfigFileInput.disabled = false;
            editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
        }
        if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
    }

    function handleConfigLoadError(configType, error) {
        updateEditorStatus(`Error loading ${configType}: ${error.message}`, true);
        if (configType.includes("Viewer Config")) { setViewerConfig(null); viewerConfigLocal = null; resetEditorTitles(); }
        if (configType.includes("Editor Config")) { setEditorConfig(null); editorConfigLocal = null; clearGridStructure(); }
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());
    }
    
    function finalizeConfigAndDataLoad() {
        console.log("EDITOR_APP: finalizeConfigAndDataLoad called. Current csvDataMain length:", csvDataMain.length);
        const edCfg = getEditorConfig();
        const viewerCfg = getViewerConfig();

        if (viewerCfg) { // Update titles if viewer config is available
            updateEditorTitles(viewerCfg);
        } else {
            resetEditorTitles();
        }

        if (edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Editor config present, rendering grid structure.");
            renderGridStructure(edCfg.columns);
        } else {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - No editor config, clearing grid structure.");
            clearGridStructure();
            if (editorConfigFileInput && editorConfigFileInput.parentElement.style.display !== 'none') {
                 editorConfigFileInput.disabled = false;
                 editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
            }
        }

        if (csvDataMain.length > 0 && edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Data and editor config present. Aligning, (potentially) sorting, rendering data.");
            alignDataToEditorSchema();
            if (viewerCfg) { applyDefaultSortIfNeeded(); }
            renderGridData();
        } else if (edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Editor config present, but no data. Rendering empty grid/message.");
            renderGridData();
        }
        checkAndEnableActions();
    }

    function processCsvTextOnly(csvText, sourceDescription = "CSV") {
        console.log(`EDITOR_APP: processCsvTextOnly - Processing CSV from ${sourceDescription}`);
        const currentEdConfig = getEditorConfig();
        if (!currentEdConfig) {
            updateEditorStatus("Cannot process CSV: Editor config not loaded.", true); return false;
        }
        const delimiter = currentEdConfig?.csvOutputOptions?.delimiter || ',';
        const parsed = editorParseCSV(csvText, delimiter);
        
        csvDataMain.length = 0;
        parsed.data.forEach(row => csvDataMain.push(row));
        csvHeadersFromUpload = parsed.headers;
        console.log(`EDITOR_APP: processCsvTextOnly - Parsed ${csvDataMain.length} rows.`);
        
        alignDataToEditorSchema();
        updateEditorStatus(`CSV Data from ${sourceDescription} processed and ready: ${csvDataMain.length} rows.`);
        return true;
    }

    function clearCsvData() {
        console.log("EDITOR_APP: clearCsvData called.");
        csvDataMain.length = 0;
        csvHeadersFromUpload = [];
    }

    function applyDefaultSortIfNeeded() {
        console.log("EDITOR_APP: applyDefaultSortIfNeeded - Checking if sort is needed.");
        const viewerCfg = getViewerConfig();
        const editorCfg = getEditorConfig();
        if (csvDataMain.length > 0 &&
            viewerCfg?.generalSettings?.defaultItemSortBy?.length > 0 &&
            editorCfg?.columns?.length > 0) {
            console.log("EDITOR_APP: applyDefaultSortIfNeeded - Applying default sort criteria...");
            try {
                const effectiveHeadersForSorting = editorCfg.columns.map(c => c.name);
                const sortGlobalConfigMock = {
                    csvHeaders: effectiveHeadersForSorting,
                    generalSettings: { trueValues: viewerCfg.generalSettings.trueValues || [] }
                };
                sortData(csvDataMain, viewerCfg.generalSettings.defaultItemSortBy, sortGlobalConfigMock);
            } catch (error) {
                updateEditorStatus(`Error applying default sort: ${error.message}`, true);
            }
        } else {
            console.log("EDITOR_APP: applyDefaultSortIfNeeded - Conditions for sort not met or no sort defined.");
        }
    }

    function alignDataToEditorSchema() {
        console.log("EDITOR_APP: alignDataToEditorSchema - Aligning data.");
        const currentEdConfig = getEditorConfig();
        if (!currentEdConfig || !currentEdConfig.columns) {
            console.warn("EDITOR_APP: alignDataToEditorSchema - Editor config or columns not available.");
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
                    } else if (!Array.isArray(val)) { val = []; }
                }
                alignedRow[colDef.name] = val;
            });
            tempAlignedData.push(alignedRow);
        });
        csvDataMain.length = 0;
        tempAlignedData.forEach(row => csvDataMain.push(row));
        console.log("EDITOR_APP: alignDataToEditorSchema - CSV data aligned.");
    }

    async function attemptPreloadsFromEditorConfig(loadedEditorConfig) {
        console.log("EDITOR_APP: attemptPreloadsFromEditorConfig - Starting. EditorConfig:", loadedEditorConfig);
        if (!loadedEditorConfig || !loadedEditorConfig.preloadUrls) {
            updateEditorStatus("No preloadUrls in editor config. Manual inputs active.", false);
            if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
            if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
            return;
        }
        const { viewerConfigUrl, csvDataUrl } = loadedEditorConfig.preloadUrls;

        if (viewerConfigUrl) {
            const config = await loadFileFromUrl(viewerConfigUrl, 'ViewerConfig', 'defaultConfig');
            if (config) {
                try {
                    setViewerConfig(config); viewerConfigLocal = getViewerConfig();
                    updateEditorStatus(`Viewer Config preloaded from: ${viewerConfigUrl.substring(viewerConfigUrl.lastIndexOf('/')+1)}`);
                    if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = 'none';
                } catch (e) { handleConfigLoadError('Viewer Config from URL', e); if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';}
            } else { if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';}
        } else {
            updateEditorStatus("No Viewer Config URL for preload. Manual input active.", false);
            if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        }
        // Update grid module's reference to editorConfigLocal and newly loaded viewerConfigLocal
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());

        if (csvDataUrl) {
            const edCfg = getEditorConfig();
            const viewerCfg = getViewerConfig();
            if (edCfg) {
                const csvText = await loadFileFromUrl(csvDataUrl, 'CSVData');
                if (csvText !== null) {
                    try {
                        clearCsvData();
                        if(processCsvTextOnly(csvText, `URL (${csvDataUrl.substring(csvDataUrl.lastIndexOf('/')+1)})`)){
                            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = 'none';
                            if (!viewerCfg) {
                                 updateEditorStatus("CSV Data preloaded. Viewer Config (for full display/sort) may need manual load or working URL.", true);
                            }
                        } else { throw new Error("CSV text processing failed during preload."); }
                    } catch (e) { updateEditorStatus(`Error processing preloaded CSV: ${e.message}`, true); clearCsvData(); if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';}
                } else { if(csvDataFileInput) csvDataFileInput.parentElement.style.display = ''; }
            } else {
                updateEditorStatus(`CSV Data URL found, but Editor Config not ready. Load CSV manually.`, true);
                if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
            }
        } else {
            updateEditorStatus("No CSV Data URL in editor_config. Load CSV manually.", false);
            if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
        }
        console.log("EDITOR_APP: attemptPreloadsFromEditorConfig - Finished.");
    }

    // --- Initial Load Logic ---
    async function initializeEditor() {
        console.log("EDITOR_APP: initializeEditor - Starting.");
        updateEditorStatus("Initializing editor...");
        resetEditorTitles(); // Set default titles initially

        if (typeof window.editorConfig === 'object' && window.editorConfig !== null) {
            console.log("EDITOR_APP: initializeEditor - Found pre-loaded window.editorConfig.");
            updateEditorStatus("Loading initial Editor Config embedded in page...");
            try {
                const initialEditorConf = JSON.parse(JSON.stringify(window.editorConfig));
                setEditorConfig(initialEditorConf);
                editorConfigLocal = getEditorConfig();
                initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal);
                updateEditorStatus(`Initial Editor Config "${editorConfigLocal.editorSchemaVersion || 'N/A'}" loaded.`);
                if (editorConfigFileInput) editorConfigFileInput.parentElement.style.display = 'none';
                await attemptPreloadsFromEditorConfig(editorConfigLocal);
                // Titles are updated within attemptPreloads (if viewer config loads) or by finalizeConfigAndDataLoad
            } catch (e) {
                handleConfigLoadError('Initial Editor Config (embedded)', e);
                resetEditorTitles(); // Reset title on error
                if (editorConfigFileInput) {
                     editorConfigFileInput.parentElement.style.display = '';
                     editorConfigFileInput.disabled = false;
                     editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
                }
            }
        } else {
            updateEditorStatus("Load Editor Configuration file to begin (or ensure it's embedded and defines window.editorConfig).");
            resetEditorTitles(); // Ensure default title if no preloaded editor config
            if (editorConfigFileInput) {
                editorConfigFileInput.parentElement.style.display = '';
                editorConfigFileInput.disabled = false;
                editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
            }
        }
        console.log("EDITOR_APP: initializeEditor - Calling finalizeConfigAndDataLoad after initial setup.");
        finalizeConfigAndDataLoad();
        console.log("EDITOR_APP: initializeEditor - Finished.");
    }

    // --- Initialize App State & Call Startup Function ---
    initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal); // Initial call
    await initializeEditor(); // Start the initialization process

    // --- Event Listeners (Defined after helpers) ---
    window.addEventListener('editorDataChanged', () => {
        console.log("EDITOR_APP: 'editorDataChanged' event received.");
        checkAndEnableActions();
    });

    if (viewerConfigFileInput) {
        viewerConfigFileInput.addEventListener('change', async (event) => {
            console.log("EDITOR_APP: viewerConfigFileInput - Manual 'change' event.");
            const file = event.target.files[0];
            if (!file) return;
            if (confirmAndClearOnManualOverride("Viewer Config")) {
                updateEditorStatus(`Loading Viewer Config from file: ${file.name}...`);
                try {
                    const loadedConfig = await loadJsConfigurationFile(file, 'defaultConfig');
                    setViewerConfig(loadedConfig);
                    viewerConfigLocal = getViewerConfig();
                    initDataGridReferences(csvDataMain, getEditorConfig(), viewerConfigLocal); // Use getEditorConfig()
                    updateEditorTitles(viewerConfigLocal);
                    updateEditorStatus(`Viewer Config "${file.name}" loaded manually.`);
                    finalizeConfigAndDataLoad();
                } catch (error) { handleConfigLoadError('Viewer Config (manual)', error); resetEditorTitles(); }
            } else { event.target.value = ''; }
            checkAndEnableActions();
        });
    }

    if (editorConfigFileInput) {
        editorConfigFileInput.addEventListener('change', async (event) => {
            console.log("EDITOR_APP: editorConfigFileInput - Manual 'change' event (override).");
            const file = event.target.files[0];
            if (!file) return;
            if (!confirm("Manually loading a new Editor Configuration will reset the editor and discard ALL current data and configurations. Proceed?")) {
                event.target.value = ''; return;
            }
            clearAllApplicationState(); // This also calls resetEditorTitles()
            updateEditorStatus(`Loading OVERRIDE Editor Config from file: ${file.name}...`);
            try {
                const loadedConfig = await loadJsConfigurationFile(file, 'editorConfig');
                setEditorConfig(loadedConfig);
                editorConfigLocal = getEditorConfig();
                initDataGridReferences(csvDataMain, editorConfigLocal, getViewerConfig()); // Use getViewerConfig()
                updateEditorStatus(`Editor Config "${file.name}" loaded manually (OVERRIDE).`);
                if (editorConfigFileInput) editorConfigFileInput.parentElement.style.display = 'none';
                await attemptPreloadsFromEditorConfig(editorConfigLocal);
                finalizeConfigAndDataLoad();
            } catch (error) {
                handleConfigLoadError('Editor Config (manual override)', error);
                if (editorConfigFileInput) {
                    editorConfigFileInput.parentElement.style.display = '';
                    editorConfigFileInput.disabled = false;
                    editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
                }
            }
            checkAndEnableActions();
        });
    }

    if (csvDataFileInput) {
        csvDataFileInput.addEventListener('change', async (event) => {
            console.log("EDITOR_APP: csvDataFileInput - Manual 'change' event.");
            const file = event.target.files[0];
            if (!file) return;
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Load Editor Config before CSV data.", true);
                event.target.value = ''; return;
            }
            if (csvDataMain.length > 0 && !confirm("Loading a new CSV file will replace current data. Proceed?")) {
                event.target.value = ''; return;
            }
            updateEditorStatus(`Loading CSV Data from file: ${file.name}...`);
            try {
                const csvText = await readFileContent(file);
                clearCsvData();
                if (processCsvTextOnly(csvText, `"${file.name}" (manual)`)) {
                    finalizeConfigAndDataLoad();
                } else { renderGridData(); }
            } catch (error) {
                updateEditorStatus(`Error loading CSV Data from file: ${error.message}`, true);
                clearCsvData(); renderGridData();
            }
            checkAndEnableActions();
        });
    }
    
    // --- Action Button Handlers ---
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Cannot add row: Editor config not loaded.", true); return;
            }
            if (addNewRow()) {
                updateEditorStatus("Row added. Scroll to bottom if not visible.");
            } else { updateEditorStatus("Failed to add row.", true); }
            // checkAndEnableActions(); // Called by 'editorDataChanged' event from addNewRow
        });
    }

    if (sortDataBtn) {
        sortDataBtn.addEventListener('click', () => {
            const viewerCfg = getViewerConfig();
            const editorCfg = getEditorConfig();
            if (!csvDataMain || csvDataMain.length === 0) { updateEditorStatus("No data to sort.", true); return; }
            if (!viewerCfg?.generalSettings?.defaultItemSortBy?.length) { updateEditorStatus("No default sort criteria in Viewer Config.", true); return; }
            if (!editorCfg?.columns?.length) { updateEditorStatus("Editor Config not loaded.", true); return; }
            updateEditorStatus("Sorting data manually...");
            try {
                const effectiveHeaders = editorCfg.columns.map(c => c.name);
                const sortMockCfg = { csvHeaders: effectiveHeaders, generalSettings: { trueValues: viewerCfg.generalSettings.trueValues || [] }};
                sortData(csvDataMain, viewerCfg.generalSettings.defaultItemSortBy, sortMockCfg);
                renderGridData();
                updateEditorStatus("Data sorted.");
            } catch (error) { updateEditorStatus(`Error sorting: ${error.message}`, true); }
        });
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig || (!csvDataMain.length && !(currentEdConfig.columns?.length > 0))) { updateEditorStatus("Cannot export: Config or data not loaded.", true); return; }
            const outputOptions = currentEdConfig.csvOutputOptions || {};
            const csvString = generateCsvForExport(csvDataMain, currentEdConfig.columns, outputOptions);
            if (csvString !== null || (csvString === '' && csvDataMain.length === 0)) {
                const filename = `edited_data_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
                triggerDownload(csvString, filename);
                updateEditorStatus(`Data exported to ${filename}.`);
            } else { updateEditorStatus("No data to export or error during CSV generation.", true); }
        });
    }

    console.log("EDITOR_APP: DOMContentLoaded - Editor App Initialized fully.");
});

// --- Global Utilities ---
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
        alert("Download not directly supported. Check console for data or try a different browser.");
        console.error("triggerDownload: HTML5 download attribute not supported.");
        console.log("Data for manual copy:\n----------\n", content, "\n----------");
    }
}