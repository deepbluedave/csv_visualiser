// csv_editor/js/editor_app.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log("EDITOR_APP: DOMContentLoaded - Initializing...");

    // --- State Variables ---
    let viewerConfigLocal = null;
    let editorConfigLocal = null;
    let csvDataMain = [];
    let initialCsvData = []; // << NEW: For storing the initial state
    let csvHeadersFromUpload = [];

    // --- DOM Elements ---
    const {
        viewerConfigFileInput, editorConfigFileInput, csvDataFileInput,
        addRowBtn, sortDataBtn, exportCsvBtn, statusMessages,
        // Add new button and modal elements later
        viewChangesBtn, changesModal, changeDigestOutput // Placeholders for now
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
        const dataLoaded = csvDataMain.length > 0 || (editorCfg && editorCfg.columns && editorCfg.columns.length > 0 && initialCsvData.length > 0);

        const canAddRow = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0);
        const canExport = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0 && (csvDataMain.length > 0 || (editorCfg.columns && editorCfg.columns.length > 0)));
        const canSort = !!(csvDataMain.length > 0 && viewerCfg?.generalSettings?.defaultItemSortBy?.length > 0 && editorCfg?.columns?.length > 0);
        const canViewChanges = !!(editorCfg && initialCsvData.length > 0); // Enable if initial data and config exists

        if (addRowBtn) addRowBtn.disabled = !canAddRow;
        if (sortDataBtn) sortDataBtn.disabled = !canSort;
        if (exportCsvBtn) exportCsvBtn.disabled = !canExport;
        if (viewChangesBtn) viewChangesBtn.disabled = !canViewChanges; // Enable/disable new button
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
        initialCsvData.length = 0; // << MODIFIED: Clear initial data
        csvHeadersFromUpload = [];
        clearAllConfigs();
        viewerConfigLocal = null;
        editorConfigLocal = null;
        initDataGridReferences(csvDataMain, null, null);
        clearGridStructure();
        resetEditorTitles();
        updateEditorStatus("Editor reset. Load new configurations.");
        if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        if (editorConfigFileInput) {
            editorConfigFileInput.parentElement.style.display = '';
            editorConfigFileInput.disabled = false;
            editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
        }
        if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
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

        if (viewerCfg) {
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

        // Ensure csvDataMain reflects the current state after potential initial processing
        // The comparison for digest will be between initialCsvData and current csvDataMain
        if ((csvDataMain.length > 0 || initialCsvData.length > 0) && edCfg) { // Check either has data
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Data (current or initial) and editor config present. Aligning, (potentially) sorting, rendering data.");
            alignDataToEditorSchema(); // Aligns csvDataMain
            if (viewerCfg && csvDataMain.length > 0) { // Only sort if there's current data to sort
                applyDefaultSortIfNeeded();
            }
            renderGridData(); // Renders csvDataMain
        } else if (edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Editor config present, but no data. Rendering empty grid/message.");
            renderGridData(); // Will show "no data" message
        }
        checkAndEnableActions();
    }

    function processCsvTextOnly(csvText, sourceDescription = "CSV") {
        console.log(`EDITOR_APP: processCsvTextOnly - Processing CSV from ${sourceDescription}`);
        const currentEdConfig = getEditorConfig(); // Get editorConfig FIRST
        if (!currentEdConfig) {
            updateEditorStatus("Cannot process CSV: Editor config not loaded.", true); return false;
        }
        const delimiter = currentEdConfig?.csvOutputOptions?.delimiter || ',';
        const parsed = editorParseCSV(csvText, delimiter); // Uses standard CSV parsing

        csvDataMain.length = 0;
        initialCsvData.length = 0;

        parsed.data.forEach(row => csvDataMain.push(row));
        csvHeadersFromUpload = parsed.headers;

        if (csvDataMain.length > 0) {
            // --- NEW: Convert string to array for multi-select types in csvDataMain BEFORE deep copy ---
            // This uses the editorConfig to know which columns are multi-select.
            if (currentEdConfig && currentEdConfig.columns) {
                csvDataMain.forEach(row => {
                    currentEdConfig.columns.forEach(colDef => {
                        if (colDef.type === 'multi-select' && row.hasOwnProperty(colDef.name) && typeof row[colDef.name] === 'string') {
                            const valStr = row[colDef.name];
                            row[colDef.name] = valStr.split(',').map(s => s.trim()).filter(s => s);
                        } else if (colDef.type === 'multi-select' && !row.hasOwnProperty(colDef.name)) {
                            row[colDef.name] = []; // Ensure it's an empty array if missing
                        }
                    });
                });
            }
            // --- END NEW ---

            initialCsvData = JSON.parse(JSON.stringify(csvDataMain)); // Deep copy for baseline AFTER potential conversion
            const pkColumnName = currentEdConfig?.changeTrackingPrimaryKeyColumn;

            csvDataMain.forEach((row, index) => {
                row._originalIndex = index;
                initialCsvData[index]._originalIndex = index;
                if (pkColumnName && row.hasOwnProperty(pkColumnName)) {
                    row._originalPkValue = row[pkColumnName];
                    initialCsvData[index]._originalPkValue = row[pkColumnName];
                }
            });
            console.log("EDITOR_APP: Initial data snapshot created with markers and multi-select conversion.");
        }

        console.log(`EDITOR_APP: processCsvTextOnly - Parsed ${csvDataMain.length} rows.`);

        alignDataToEditorSchema(); // This will now work with csvDataMain already having arrays for multi-selects
        updateEditorStatus(`CSV Data from ${sourceDescription} processed and ready: ${csvDataMain.length} rows.`);
        return true;
    }

    function clearCsvData() {
        console.log("EDITOR_APP: clearCsvData called.");
        csvDataMain.length = 0;
        initialCsvData.length = 0; // << MODIFIED: Clear initial data
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

        csvDataMain.forEach(rawRow => { // rawRow here is from the updated csvDataMain
            const alignedRow = {
                _originalIndex: rawRow._originalIndex,
                _originalPkValue: rawRow._originalPkValue
            };
            editorColumnDefinitions.forEach(colDef => {
                let val = rawRow.hasOwnProperty(colDef.name) ? rawRow[colDef.name] : '';

                // Ensure multi-select columns are arrays, even if initially empty from CSV or schema
                if (colDef.type === 'multi-select') {
                    if (typeof val === 'string') { // If somehow it's still a string after processCsvTextOnly
                        val = val.split(',').map(s => s.trim()).filter(s => s);
                    } else if (!Array.isArray(val)) {
                        val = []; // Default to empty array if not string or array
                    }
                }
                alignedRow[colDef.name] = val;
            });
            tempAlignedData.push(alignedRow);
        });
        csvDataMain.length = 0;
        tempAlignedData.forEach(row => csvDataMain.push(row));
        console.log("EDITOR_APP: alignDataToEditorSchema - CSV data aligned. Multi-selects are arrays.");
    }

    async function attemptPreloadsFromEditorConfig(loadedEditorConfig) {
        console.log("EDITOR_APP: attemptPreloadsFromEditorConfig - Starting. EditorConfig:", loadedEditorConfig);
        if (!loadedEditorConfig || !loadedEditorConfig.preloadUrls) {
            updateEditorStatus("No preloadUrls in editor config. Manual inputs active.", false);
            if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
            return;
        }
        const { viewerConfigUrl, csvDataUrl } = loadedEditorConfig.preloadUrls;

        if (viewerConfigUrl) {
            const config = await loadFileFromUrl(viewerConfigUrl, 'ViewerConfig', 'defaultConfig');
            if (config) {
                try {
                    setViewerConfig(config); viewerConfigLocal = getViewerConfig();
                    updateEditorStatus(`Viewer Config preloaded from: ${viewerConfigUrl.substring(viewerConfigUrl.lastIndexOf('/') + 1)}`);
                    if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = 'none';
                } catch (e) { handleConfigLoadError('Viewer Config from URL', e); if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = ''; }
            } else { if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = ''; }
        } else {
            updateEditorStatus("No Viewer Config URL for preload. Manual input active.", false);
            if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        }

        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());

        if (csvDataUrl) {
            const edCfg = getEditorConfig(); // This is already set if preloads are running
            const viewerCfg = getViewerConfig(); // Might be set from above
            if (edCfg) {
                const csvText = await loadFileFromUrl(csvDataUrl, 'CSVData');
                if (csvText !== null) {
                    try {
                        // processCsvTextOnly now clears initialCsvData as well, so no separate clear needed
                        if (processCsvTextOnly(csvText, `URL (${csvDataUrl.substring(csvDataUrl.lastIndexOf('/') + 1)})`)) {
                            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = 'none';
                            if (!viewerCfg) {
                                updateEditorStatus("CSV Data preloaded. Viewer Config (for full display/sort) may need manual load or working URL.", true);
                            }
                        } else { throw new Error("CSV text processing failed during preload."); }
                    } catch (e) { updateEditorStatus(`Error processing preloaded CSV: ${e.message}`, true); clearCsvData(); if (csvDataFileInput) csvDataFileInput.parentElement.style.display = ''; }
                } else { if (csvDataFileInput) csvDataFileInput.parentElement.style.display = ''; }
            } else {
                updateEditorStatus(`CSV Data URL found, but Editor Config not ready. Load CSV manually.`, true);
                if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
            }
        } else {
            updateEditorStatus("No CSV Data URL in editor_config. Load CSV manually.", false);
            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
        }
        console.log("EDITOR_APP: attemptPreloadsFromEditorConfig - Finished.");
    }


    function generateChangeDigestOnDemand() {
        console.log("EDITOR_APP: generateChangeDigestOnDemand - Generating digest...");
        const editorCfg = getEditorConfig();
        const pkColumnName = editorCfg?.changeTrackingPrimaryKeyColumn;
        const columnDefs = editorCfg?.columns || [];

        let digest = "";
        let changesFound = false;

        // Create a map of current data by _originalIndex for efficient lookup of modified/existing rows
        const currentDataMapByOriginalIndex = new Map();
        _csvDataInstance.forEach(row => {
            if (row._originalIndex !== -1 && row._originalIndex !== undefined) { // Only map existing rows
                currentDataMapByOriginalIndex.set(row._originalIndex, row);
            }
        });

        // 1. Detect Deletions
        initialCsvData.forEach(initialRow => {
            if (!currentDataMapByOriginalIndex.has(initialRow._originalIndex)) {
                // This row was deleted
                changesFound = true;
                const identifier = pkColumnName ? (initialRow[pkColumnName] || `Original PK missing, Index: ${initialRow._originalIndex}`) : `Original Index: ${initialRow._originalIndex}`;
                digest += `--- Initiative: ${identifier} ---\n`;
                digest += `Status: DELETED\n`;
                digest += "Original Values:\n";
                columnDefs.forEach(colDef => {
                    const val = initialRow[colDef.name];
                    digest += `  - ${colDef.label || colDef.name}: ${formatValueForDigest(val)}\n`;
                });
                digest += "\n";
            }
        });

        // 2. Detect Additions and Modifications
        _csvDataInstance.forEach(currentRow => {
            const originalRowIndex = currentRow._originalIndex;

            if (originalRowIndex === -1 || originalRowIndex === undefined) { // New row
                changesFound = true;
                const identifier = pkColumnName ? (currentRow[pkColumnName] || "New Item (PK Missing/Not Set)") : `New Item (Index: ${digest.split("---").length})`; // Crude unique ID for new items if no PK
                digest += `--- Initiative: ${identifier} ---\n`;
                digest += `Status: ADDED\n`;
                digest += "Values:\n";
                columnDefs.forEach(colDef => {
                    const val = currentRow[colDef.name];
                    digest += `  - ${colDef.label || colDef.name}: ${formatValueForDigest(val)}\n`;
                });
                digest += "\n";
            } else { // Existing row, check for modifications
                const initialRow = initialCsvData.find(r => r._originalIndex === originalRowIndex);
                if (!initialRow) {
                    console.warn(`Consistency issue: Current row with _originalIndex ${originalRowIndex} not found in initialCsvData.`);
                    return; // Skip this row if its initial state is missing
                }

                let rowChanges = [];
                let currentActualPK = pkColumnName ? currentRow[pkColumnName] : null;
                let originalActualPK = pkColumnName ? initialRow[pkColumnName] : null; // PK value from initial data

                // Check for PK change specifically
                if (pkColumnName && String(originalActualPK) !== String(currentActualPK)) {
                    rowChanges.push(`  - Identifier (${pkColumnName}) changed from "${formatValueForDigest(originalActualPK)}" to ${formatValueForDigest(currentActualPK)}.\n`);
                }

                columnDefs.forEach(colDef => {
                    const columnName = colDef.name;
                    if (pkColumnName && columnName === pkColumnName) return; // PK change already handled

                    const initialValue = initialRow[columnName];
                    const currentValue = currentRow[columnName];

                    // Special handling for multi-select array comparison
                    if (colDef.type === 'multi-select') {
                        const initialArray = Array.isArray(initialValue) ? initialValue.map(String).sort() : (initialValue ? [String(initialValue)].sort() : []);
                        const currentArray = Array.isArray(currentValue) ? currentValue.map(String).sort() : (currentValue ? [String(currentValue)].sort() : []);
                        if (JSON.stringify(initialArray) !== JSON.stringify(currentArray)) {
                            rowChanges.push(`  - ${colDef.label || columnName} changed from "${formatValueForDigest(initialValue)}" to "${formatValueForDigest(currentValue)}".\n`);
                        }
                    } else if (String(initialValue ?? '') !== String(currentValue ?? '')) {
                        rowChanges.push(`  - ${colDef.label || columnName} changed from "${formatValueForDigest(initialValue)}" to "${formatValueForDigest(currentValue)}".\n`);
                    }
                });

                if (rowChanges.length > 0) {
                    changesFound = true;
                    // Use the CURRENT PK for the header if PK exists, otherwise original PK, otherwise index
                    const displayIdentifier = pkColumnName ? (currentActualPK || originalActualPK || `Original Index: ${originalRowIndex}`) : `Original Index: ${originalRowIndex}`;
                    digest += `--- Initiative: ${displayIdentifier} ---\n`;
                    if (pkColumnName && String(originalActualPK) !== String(currentActualPK) && String(originalActualPK) !== displayIdentifier) {
                        digest += `(Originally identified as: ${formatValueForDigest(originalActualPK)})\n`;
                    }
                    digest += "Modifications:\n";
                    rowChanges.forEach(change => digest += change);
                    digest += "\n";
                }
            }
        });

        if (!changesFound) {
            digest = "No changes detected since the initial data load.";
        }
        console.log("EDITOR_APP: Change digest generated.");
        return digest;
    }

    // Helper to format values for the digest string
    function formatValueForDigest(value) {
        if (value === null || value === undefined) {
            return "(not set)";
        }
        if (value === '') {
            return "(empty string)";
        }
        if (Array.isArray(value)) {
            if (value.length === 0) return "(empty list)";
            // For arrays, format each item and then join. The outer brackets are added here.
            return `[${value.map(v => formatSingleValueForDigest(String(v))).join(', ')}]`;
        }
        // For single values, call a sub-helper that handles the actual string formatting
        return formatSingleValueForDigest(String(value));
    }

    // Sub-helper for formatting individual non-array string values for the digest
    function formatSingleValueForDigest(stringValue) {
        // No need to check for null/undefined/empty here as the main function does it.
        // This function assumes stringValue is a non-empty string.

        // Always escape internal double quotes first.
        const escapedString = stringValue.replace(/"/g, '""');

        // Add surrounding quotes if:
        // 1. It contains a comma.
        // 2. It contains a space.
        // 3. It contains internal double quotes (which are now escaped, so it would have "").
        // 4. It starts or ends with whitespace (after trim, this implies internal significant whitespace).
        // (We won't try to intelligently detect if it *was* already quoted in the source CSV for this digest output)
        if (escapedString.includes(',') ||
            escapedString.includes(' ') ||
            escapedString.includes('""') ||
            stringValue.trim() !== stringValue // Original had leading/trailing spaces
        ) {
            return `${escapedString}`;
        }

        // If it's a simple string without the above, return it as is for the digest.
        return escapedString;
    }

    // --- Initial Load Logic ---
    async function initializeEditor() {
        console.log("EDITOR_APP: initializeEditor - Starting.");
        updateEditorStatus("Initializing editor...");
        resetEditorTitles();

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
            } catch (e) {
                handleConfigLoadError('Initial Editor Config (embedded)', e);
                resetEditorTitles();
                if (editorConfigFileInput) {
                    editorConfigFileInput.parentElement.style.display = '';
                    editorConfigFileInput.disabled = false;
                    editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
                }
            }
        } else {
            updateEditorStatus("Load Editor Configuration file to begin (or ensure it's embedded and defines window.editorConfig).");
            resetEditorTitles();
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
    initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal);
    await initializeEditor();

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
            if (confirmAndClearOnManualOverride("ViewerConfig")) { // Corrected casing
                updateEditorStatus(`Loading Viewer Config from file: ${file.name}...`);
                try {
                    const loadedConfig = await loadJsConfigurationFile(file, 'defaultConfig');
                    setViewerConfig(loadedConfig);
                    viewerConfigLocal = getViewerConfig();
                    initDataGridReferences(csvDataMain, getEditorConfig(), viewerConfigLocal);
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
            clearAllApplicationState();
            updateEditorStatus(`Loading OVERRIDE Editor Config from file: ${file.name}...`);
            try {
                const loadedConfig = await loadJsConfigurationFile(file, 'editorConfig');
                setEditorConfig(loadedConfig);
                editorConfigLocal = getEditorConfig();
                initDataGridReferences(csvDataMain, editorConfigLocal, getViewerConfig());
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
            // Check against initialCsvData now, as csvDataMain might be empty if user deleted all rows
            if (initialCsvData.length > 0 && !confirm("Loading a new CSV file will replace current data and change history. Proceed?")) {
                event.target.value = ''; return;
            }
            updateEditorStatus(`Loading CSV Data from file: ${file.name}...`);
            try {
                const csvText = await readFileContent(file);
                // processCsvTextOnly clears both csvDataMain and initialCsvData now
                if (processCsvTextOnly(csvText, `"${file.name}" (manual)`)) {
                    finalizeConfigAndDataLoad();
                } else { renderGridData(); /* Render empty grid or error message */ }
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
            if (addNewRow()) { // addNewRow now internally handles _originalIndex for new rows
                updateEditorStatus("Row added. Scroll to bottom if not visible.");
            } else { updateEditorStatus("Failed to add row.", true); }
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
                const sortMockCfg = { csvHeaders: effectiveHeaders, generalSettings: { trueValues: viewerCfg.generalSettings.trueValues || [] } };
                sortData(csvDataMain, viewerCfg.generalSettings.defaultItemSortBy, sortMockCfg);
                renderGridData(); // Re-render after sorting
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

    // --- Listener for the new "    // --- Listener for the new "View Changes" button ---
    if (editorDomElements.viewChangesBtn && editorDomElements.changesModal && editorDomElements.changeDigestOutput) {
        editorDomElements.viewChangesBtn.addEventListener('click', () => {
            if (!getEditorConfig() || initialCsvData.length === 0) { // Check initialCsvData
                updateEditorStatus("Load Editor Config and initial CSV data to view changes.", true);
                return;
            }
            updateEditorStatus("Generating change digest...");
            const digestText = generateChangeDigestOnDemand();
            editorDomElements.changeDigestOutput.textContent = digestText; // Use textContent for <pre>
            editorDomElements.changesModal.style.display = 'block';
            updateEditorStatus("Change digest displayed.");
        });

        if (editorDomElements.closeChangesModalBtn) {
            editorDomElements.closeChangesModalBtn.onclick = function () {
                editorDomElements.changesModal.style.display = "none";
            }
        }
        window.onclick = function (event) {
            if (event.target == editorDomElements.changesModal) {
                editorDomElements.changesModal.style.display = "none";
            }
        }
    } else {
        console.warn("EDITOR_APP: View Changes button or modal elements not found for event listeners.");
    }
    // --- End new button listener ---

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
// --- End of file: editor_app.js ---