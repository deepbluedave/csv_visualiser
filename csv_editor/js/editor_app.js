document.addEventListener('DOMContentLoaded', async () => {
    console.log("EDITOR_APP: DOMContentLoaded - Initializing application...");

    // --- Application State Variables ---
    let viewerConfigLocal = null; // Holds the currently loaded viewer configuration
    let editorConfigLocal = null; // Holds the currently loaded editor configuration
    let csvDataMain = [];         // Main array holding the current, editable CSV data objects
    let initialCsvData = [];      // Stores a deep copy of CSV data as it was initially loaded, for change tracking
    let csvHeadersFromUpload = [];// Headers detected from the last raw CSV upload

    // --- DOM Element References (Assumed to be imported/defined elsewhere) ---
    const {
        viewerConfigFileInput, editorConfigFileInput, csvDataFileInput,
        addRowBtn, sortDataBtn, exportCsvBtn, statusMessages,
        viewChangesBtn, changesModal, changeDigestOutput, closeChangesModalBtn // Added closeChangesModalBtn for completeness
    } = editorDomElements; // Assuming editorDomElements is globally available or imported
    const mainPageHeading = document.querySelector('#csv-editor-wrapper h1');

    // --- Helper Function Definitions ---

    /**
     * Updates the document title and main page heading based on the viewer configuration.
     * @param {object} viewerConfig - The loaded viewer configuration object.
     */
    function updateEditorTitles(viewerConfig) {
        const baseTitle = viewerConfig?.generalSettings?.dashboardTitle || "CSV Data";
        const editorPageTitle = `${baseTitle} - Editor`;
        document.title = editorPageTitle;
        if (mainPageHeading) {
            mainPageHeading.textContent = editorPageTitle;
        } else { // Fallback if specific heading not found
            const firstH1 = document.querySelector('h1');
            if (firstH1) firstH1.textContent = editorPageTitle;
        }
        console.log(`EDITOR_APP: Titles updated to "${editorPageTitle}"`);
    }

    /**
     * Resets the document title and main page heading to default values.
     */
    function resetEditorTitles() {
        const defaultEditorTitle = "Config-Driven CSV Editor";
        document.title = defaultEditorTitle;
        if (mainPageHeading) {
            mainPageHeading.textContent = defaultEditorTitle;
        } else { // Fallback
            const firstH1 = document.querySelector('h1');
            if (firstH1) firstH1.textContent = defaultEditorTitle;
        }
        console.log(`EDITOR_APP: Titles reset to "${defaultEditorTitle}"`);
    }

    /**
     * Displays a status message to the user and logs it.
     * @param {string} message - The message to display.
     * @param {boolean} [isError=false] - True if the message is an error.
     */
    function updateEditorStatus(message, isError = false) {
        if (isError) {
            console.error(`EDITOR_APP: STATUS (Error) - ${message}`);
        } else {
            console.log(`EDITOR_APP: STATUS - ${message}`);
        }
        if (statusMessages) {
            statusMessages.textContent = `Status: ${message}`;
            statusMessages.style.color = isError ? 'red' : '#495057'; // Standard text color or red
        }
    }

    /**
     * Checks current state and enables/disables action buttons accordingly.
     */
    function checkAndEnableActions() {
        const editorCfg = getEditorConfig();
        const viewerCfg = getViewerConfig();

        const canAddRow = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0);
        // Can export if editor config (defining columns) is loaded, even if data is empty (exports headers).
        const canExport = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0);
        const canSort = !!(csvDataMain.length > 0 && viewerCfg?.generalSettings?.defaultItemSortBy?.length > 0 && editorCfg?.columns?.length > 0);
        const canViewChanges = !!(editorCfg && initialCsvData.length > 0); // Requires initial data to compare against

        if (addRowBtn) addRowBtn.disabled = !canAddRow;
        if (sortDataBtn) sortDataBtn.disabled = !canSort;
        if (exportCsvBtn) exportCsvBtn.disabled = !canExport;
        if (viewChangesBtn) viewChangesBtn.disabled = !canViewChanges;
    }

    /**
     * Fetches a file from a given URL.
     * @param {string} url - The URL to fetch the file from.
     * @param {string} type - Description of the file type (e.g., 'ViewerConfig', 'CSVData').
     * @param {string|null} [expectedGlobalVarName=null] - For JS configs, the global variable name they might define.
     * @returns {Promise<object|string|null>} The loaded config object, CSV text, or null on failure.
     */
    async function loadFileFromUrl(url, type, expectedGlobalVarName = null) {
        console.log(`EDITOR_APP: loadFileFromUrl - Attempting to fetch ${type} from URL: ${url}`);
        if (!url) {
            console.warn(`EDITOR_APP: loadFileFromUrl - No URL provided for ${type}.`);
            return null;
        }
        const fileNameForStatus = url.substring(url.lastIndexOf('/') + 1) || `remote ${type.toLowerCase()}`;
        updateEditorStatus(`Fetching ${type} from ${fileNameForStatus}...`);
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
                // Create a File-like object for loadJsConfigurationFile
                const pseudoFile = new File([content], pseudoFileName, { type: 'application/javascript' });
                return await loadJsConfigurationFile(pseudoFile, expectedGlobalVarName);
            } else if (type === 'CSVData') {
                return content;
            }
        } catch (error) {
            updateEditorStatus(`Error loading ${type} from ${url}: ${error.message}. Manual input for ${type} remains available.`, true);
            return null;
        }
        return null; // Should not be reached if type is one of the handled ones
    }

    /**
     * Confirms with the user before overriding a ViewerConfig.
     * If confirmed, it clears the existing viewer configuration.
     * @param {string} configTypeChanging - The type of config being changed (currently only "ViewerConfig" is handled).
     * @returns {boolean} True if the user confirmed or no confirmation was needed, false otherwise.
     */
    function confirmAndClearOnManualOverride(configTypeChanging) {
        if (configTypeChanging === "ViewerConfig" && getViewerConfig()) {
            const message = "Manually loading a new Viewer Config will reprocess data with new display settings. Current data will be kept. Proceed?";
            if (!confirm(message)) { return false; }
            setViewerConfig(null); // Clear the global state
            viewerConfigLocal = null; // Clear the local cache
        }
        // Refresh data grid references after potential config change
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());
        return true;
    }

    /**
     * Resets the entire application state to its initial condition.
     */
    function clearAllApplicationState() {
        console.log("EDITOR_APP: clearAllApplicationState - Performing full application reset.");
        csvDataMain.length = 0;
        initialCsvData.length = 0;
        csvHeadersFromUpload = [];

        clearAllConfigs(); // Assumed function to clear global config states (viewer and editor)
        viewerConfigLocal = null;
        editorConfigLocal = null;

        initDataGridReferences(csvDataMain, null, null); // Reset grid with no data/config
        clearGridStructure(); // Visually clear the grid
        resetEditorTitles();
        updateEditorStatus("Editor reset. Load new configurations and data.");

        // Reset file input visibility and states
        if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        if (editorConfigFileInput) {
            editorConfigFileInput.parentElement.style.display = '';
            editorConfigFileInput.disabled = false;
            editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
        }
        if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
    }

    /**
     * Handles errors that occur during configuration file loading.
     * @param {string} configType - Description of the config type (e.g., "Viewer Config").
     * @param {Error} error - The error object.
     */
    function handleConfigLoadError(configType, error) {
        updateEditorStatus(`Error loading ${configType}: ${error.message}`, true);
        if (configType.includes("Viewer Config")) {
            setViewerConfig(null);
            viewerConfigLocal = null;
            resetEditorTitles();
        }
        if (configType.includes("Editor Config")) {
            setEditorConfig(null);
            editorConfigLocal = null;
            clearGridStructure();
        }
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig()); // Refresh references
    }

    /**
     * Finalizes the setup after configurations and data have been loaded or changed.
     * This includes updating titles, rendering grid structure, aligning data, sorting, and rendering data.
     */
    function finalizeConfigAndDataLoad() {
        console.log("EDITOR_APP: finalizeConfigAndDataLoad - Finalizing configuration and data setup. Current csvDataMain length:", csvDataMain.length);
        const edCfg = getEditorConfig();

        if (getViewerConfig()) {
            updateEditorTitles(getViewerConfig());
        } else {
            resetEditorTitles();
        }

        if (edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Editor config present, rendering grid structure.");
            renderGridStructure(edCfg.columns); // Renders headers based on editor config
        } else {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - No editor config, clearing grid structure.");
            clearGridStructure();
            // Ensure editor config input is re-enabled if no config is loaded
            if (editorDomElements.editorConfigFileInput && editorDomElements.editorConfigFileInput.parentElement.style.display !== 'none') {
                editorDomElements.editorConfigFileInput.disabled = false;
                editorDomElements.editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
            }
        }

        if (csvDataMain.length > 0 && edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Aligning data to editor schema.");
            alignDataToEditorSchema(); // Ensures csvDataMain rows match editor schema, handles multi-selects

            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Applying sort and partition.");
            applySortAndPartition(); // Handles sorting and partitioning of csvDataMain

            // Debug log to inspect csvDataMain before rendering, useful for diagnosing sort/partition issues
            // const pkForLog = edCfg?.changeTrackingPrimaryKeyColumn || 'Entry Name';
            // console.log("EDITOR_APP: finalizeConfigAndDataLoad - csvDataMain order BEFORE renderGridData (Status of first 5, then last 5 if many):");
            // csvDataMain.slice(0, 5).forEach((r, i) => console.log(`  [${i}] ${r[pkForLog]}: Status=${r.Status}`));
            // if (csvDataMain.length > 10) {
            //     console.log("  ...");
            //     csvDataMain.slice(-5).forEach((r, i) => console.log(`  [${csvDataMain.length - 5 + i}] ${r[pkForLog]}: Status=${r.Status}`));
            // } else if (csvDataMain.length > 5) {
            //     csvDataMain.slice(5).forEach((r, i) => console.log(`  [${5 + i}] ${r[pkForLog]}: Status=${r.Status}`));
            // }

            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Rendering grid data.");
            renderGridData(); // Renders the (potentially sorted and partitioned) csvDataMain
        } else if (edCfg) { // Editor config exists, but no data
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Editor config present, but no data. Rendering empty grid/message.");
            renderGridData(); // Shows "no data" message or empty grid
        }
        checkAndEnableActions(); // Update UI button states
    }


    /**
     * Processes raw CSV text, parses it, and updates application state.
     * This includes converting multi-select strings to arrays and creating an initial data snapshot for change tracking.
     * @param {string} csvText - The raw CSV data as a string.
     * @param {string} [sourceDescription="CSV"] - Description of the CSV source for logging.
     * @returns {boolean} True if processing was successful, false otherwise.
     */
    function processCsvTextOnly(csvText, sourceDescription = "CSV") {
        console.log(`EDITOR_APP: processCsvTextOnly - Processing CSV from ${sourceDescription}`);
        const currentEdConfig = getEditorConfig();
        if (!currentEdConfig) {
            updateEditorStatus("Cannot process CSV: Editor config not loaded.", true);
            return false;
        }

        const delimiter = currentEdConfig?.csvOutputOptions?.delimiter || ',';
        const parsed = editorParseCSV(csvText, delimiter); // Assumed external CSV parsing utility

        csvDataMain.length = 0;    // Clear current data
        initialCsvData.length = 0; // Clear previous baseline

        parsed.data.forEach(row => csvDataMain.push(row));
        csvHeadersFromUpload = parsed.headers;

        if (csvDataMain.length > 0) {
            // Convert string representations of multi-select values to arrays.
            // This should happen before creating the initialCsvData snapshot.
            if (currentEdConfig.columns) {
                csvDataMain.forEach(row => {
                    currentEdConfig.columns.forEach(colDef => {
                        if (colDef.type === 'multi-select') {
                            if (row.hasOwnProperty(colDef.name) && typeof row[colDef.name] === 'string') {
                                const valStr = row[colDef.name];
                                row[colDef.name] = valStr.split(',').map(s => s.trim()).filter(s => s);
                            } else if (!row.hasOwnProperty(colDef.name) || !Array.isArray(row[colDef.name])) {
                                // Ensure it's an empty array if missing or not already an array
                                row[colDef.name] = [];
                            }
                        }
                    });
                });
            }

            // Create a deep copy of the processed data for baseline comparison (change tracking)
            initialCsvData = JSON.parse(JSON.stringify(csvDataMain));

            // Add original index and PK value markers for tracking changes, deletions, and PK modifications.
            const pkColumnName = currentEdConfig?.changeTrackingPrimaryKeyColumn;
            csvDataMain.forEach((row, index) => {
                row._originalIndex = index;
                initialCsvData[index]._originalIndex = index; // Ensure baseline also has it
                if (pkColumnName && row.hasOwnProperty(pkColumnName)) {
                    row._originalPkValue = row[pkColumnName];
                    initialCsvData[index]._originalPkValue = row[pkColumnName];
                }
            });
            console.log("EDITOR_APP: processCsvTextOnly - Initial data snapshot created with markers and multi-select conversion.");
        }

        console.log(`EDITOR_APP: processCsvTextOnly - Parsed ${csvDataMain.length} rows.`);

        // Align data structure to editor schema (e.g., ensure all defined columns exist in each row object)
        // This step is important even after multi-select conversion to handle other schema alignments.
        alignDataToEditorSchema();
        updateEditorStatus(`CSV Data from ${sourceDescription} processed: ${csvDataMain.length} rows loaded.`, csvDataMain.length === 0 && parsed.data.length > 0);
        return true;
    }

    /**
     * Clears all CSV data from the application state.
     */
    function clearCsvData() {
        console.log("EDITOR_APP: clearCsvData - Clearing main and initial CSV data.");
        csvDataMain.length = 0;
        initialCsvData.length = 0;
        csvHeadersFromUpload = [];
    }

    /**
     * Applies sorting (based on viewerConfig) and then partitioning (based on editorConfig) to csvDataMain.
     * Modifies csvDataMain in place.
     */
    function applySortAndPartition() {
        console.log("EDITOR_APP: applySortAndPartition - Applying sort and partition logic.");
        const viewerCfg = getViewerConfig();
        const editorCfg = getEditorConfig();

        if (!csvDataMain || csvDataMain.length === 0) {
            console.log("EDITOR_APP: applySortAndPartition - No data to sort or partition.");
            return;
        }
        if (!editorCfg || !editorCfg.columns || editorCfg.columns.length === 0) {
            console.warn("EDITOR_APP: applySortAndPartition - Editor config not available, cannot determine sort/partition columns.");
            return;
        }

        // 1. Apply Default Sort (from viewerConfig) to the entire csvDataMain
        const defaultSortConfig = viewerCfg?.generalSettings?.defaultItemSortBy;
        if (defaultSortConfig && defaultSortConfig.length > 0) {
            console.log("EDITOR_APP: applySortAndPartition - Applying default sort criteria to", csvDataMain.length, "items.");
            try {
                const effectiveHeadersForSorting = editorCfg.columns.map(c => c.name);
                // Mock a global config structure if sortData expects it
                const sortGlobalConfigMock = {
                    csvHeaders: effectiveHeadersForSorting,
                    generalSettings: { trueValues: viewerCfg?.generalSettings?.trueValues || [] }
                };
                sortData(csvDataMain, defaultSortConfig, sortGlobalConfigMock); // Sorts csvDataMain in place
                console.log("EDITOR_APP: applySortAndPartition - Default sort applied.");
            } catch (error) {
                updateEditorStatus(`Error applying default sort: ${error.message}`, true);
            }
        } else {
            console.log("EDITOR_APP: applySortAndPartition - No default sort criteria in viewer config or data is empty.");
        }

        // 2. Apply Partitioning (from editorConfig's editorDisplaySettings)
        const partitionConfigSettings = editorCfg?.editorDisplaySettings?.partitionBy;
        if (partitionConfigSettings?.enabled &&
            partitionConfigSettings?.filter?.conditions?.length > 0) {

            const filterGroup = partitionConfigSettings.filter;
            console.log("EDITOR_APP: applySortAndPartition - Partitioning enabled. Filter Group:", JSON.stringify(filterGroup));

            const mainItems = [];
            const partitionedItems = [];
            let itemsMeetingPartitionCriteria = 0;

            const effectiveHeadersForPartitionCheck = editorCfg.columns.map(c => c.name);
            const configForPartitionCheck = { // Config context for checkCondition utility
                generalSettings: {
                    trueValues: viewerCfg?.generalSettings?.trueValues || ["true", "yes", "1", "y", "x", "on", "✓"]
                },
                csvHeaders: effectiveHeadersForPartitionCheck
            };

            // const pkColumnNameForLogging = editorCfg.changeTrackingPrimaryKeyColumn || 'Entry Name'; // For debug logging

            csvDataMain.forEach((row /*, index*/) => {
                let rowMatchesPartitionFilter = false;
                if (filterGroup.conditions && filterGroup.conditions.length > 0) {
                    // Determine if row matches based on AND/OR logic for the conditions
                    const logicIsOr = filterGroup.logic && filterGroup.logic.toUpperCase() === 'OR';
                    try {
                        if (logicIsOr) {
                            rowMatchesPartitionFilter = filterGroup.conditions.some(singleCondition =>
                                checkCondition(row, singleCondition, configForPartitionCheck)
                            );
                        } else { // Default to AND logic
                            rowMatchesPartitionFilter = filterGroup.conditions.every(singleCondition =>
                                checkCondition(row, singleCondition, configForPartitionCheck)
                            );
                        }
                    } catch (e) {
                        console.error("EDITOR_APP: applySortAndPartition - Error in checkCondition for partitioning:", e, "Row:", row, "FilterGroup:", filterGroup);
                        // Decide on fallback behavior: treat as non-matching or halt? Currently, continues.
                    }
                }
                // Debug log for individual row partition decision
                // console.log(`APPLY_SORT_PARTITION --- Row: ${row[pkColumnNameForLogging] !== undefined ? row[pkColumnNameForLogging] : `Index ${index}`}, Status: ${row['Status']}, Matches Partition: ${rowMatchesPartitionFilter}`);

                if (rowMatchesPartitionFilter) {
                    partitionedItems.push(row);
                    itemsMeetingPartitionCriteria++;
                } else {
                    mainItems.push(row);
                }
            });

            console.log(`EDITOR_APP: applySortAndPartition - Partitioning processed. Main items: ${mainItems.length}, Partitioned items: ${partitionedItems.length}.`);

            if (itemsMeetingPartitionCriteria > 0) {
                console.log("EDITOR_APP: applySortAndPartition - Reconstructing csvDataMain with partitioned order (main items first, then partitioned).");
                // Modify csvDataMain in place by replacing its contents
                csvDataMain.splice(0, csvDataMain.length, ...mainItems, ...partitionedItems);

                // Verbose logging for partitioned data state (useful for debugging partition logic)
                // const pkForLogAfterReorder = editorCfg.changeTrackingPrimaryKeyColumn || 'Entry Name';
                // console.log("APPLY_SORT_PARTITION: csvDataMain order AFTER reconstruction (Status of first 5, then last 5 if many):");
                // csvDataMain.slice(0, 5).forEach((r, i) => console.log(`  [${i}] ${r[pkForLogAfterReorder]}: Status=${r.Status}`));
                // if (csvDataMain.length > 10) {
                //     console.log("  ...");
                //     csvDataMain.slice(-5).forEach((r, i) => console.log(`  [${csvDataMain.length - 5 + i}] ${r[pkForLogAfterReorder]}: Status=${r.Status}`));
                // } else if (csvDataMain.length > 5) {
                //     csvDataMain.slice(5).forEach((r, i) => console.log(`  [${5 + i}] ${r[pkForLogAfterReorder]}: Status=${r.Status}`));
                // }
                console.log(`EDITOR_APP: applySortAndPartition - Partitioning applied. Data reordered.`);
            } else {
                console.log("EDITOR_APP: applySortAndPartition - Partitioning resulted in no items meeting criteria. Order remains based on default sort (if applied).");
            }
        } else {
            console.log("EDITOR_APP: applySortAndPartition - Partitioning not enabled or not configured. Data order is based on default sort only (if applied).");
        }
    }

    /**
     * Aligns each row in csvDataMain to the schema defined in the editor configuration.
     * Ensures all columns defined in editorConfig exist in each data row, defaulting to empty string or empty array for multi-select.
     * This is crucial after CSV parsing or row additions to maintain a consistent data structure.
     */
    function alignDataToEditorSchema() {
        console.log("EDITOR_APP: alignDataToEditorSchema - Aligning CSV data rows to editor column schema.");
        const currentEdConfig = getEditorConfig();
        if (!currentEdConfig || !currentEdConfig.columns) {
            console.warn("EDITOR_APP: alignDataToEditorSchema - Editor config or columns not available. Skipping alignment.");
            return;
        }
        const editorColumnDefinitions = currentEdConfig.columns;
        const tempAlignedData = [];

        csvDataMain.forEach(rawRow => {
            const alignedRow = {
                // Preserve internal tracking properties
                _originalIndex: rawRow._originalIndex,
                _originalPkValue: rawRow._originalPkValue
            };
            editorColumnDefinitions.forEach(colDef => {
                let val = rawRow.hasOwnProperty(colDef.name) ? rawRow[colDef.name] : undefined;

                if (colDef.type === 'multi-select') {
                    if (typeof val === 'string' && val !== '') { // If it was a non-empty string (e.g. from a newly added row text input)
                        val = val.split(',').map(s => s.trim()).filter(s => s);
                    } else if (!Array.isArray(val)) {
                        val = []; // Default to empty array if not string, not array, or undefined
                    }
                } else if (val === undefined) {
                    val = ''; // Default other types to empty string if property is missing
                }
                alignedRow[colDef.name] = val;
            });
            tempAlignedData.push(alignedRow);
        });
        // Replace csvDataMain contents with the aligned data
        csvDataMain.length = 0;
        tempAlignedData.forEach(row => csvDataMain.push(row));
        console.log("EDITOR_APP: alignDataToEditorSchema - CSV data aligned. Multi-selects are arrays, missing columns added.");
    }

    /**
     * Attempts to preload ViewerConfig and CSVData if URLs are specified in the loaded EditorConfig.
     * @param {object} loadedEditorConfig - The successfully loaded editor configuration object.
     */
    async function attemptPreloadsFromEditorConfig(loadedEditorConfig) {
        console.log("EDITOR_APP: attemptPreloadsFromEditorConfig - Checking for preload URLs.");
        if (!loadedEditorConfig || !loadedEditorConfig.preloadUrls) {
            updateEditorStatus("No preloadUrls in editor config. Manual file inputs remain active.", false);
            if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
            return;
        }
        const { viewerConfigUrl, csvDataUrl } = loadedEditorConfig.preloadUrls;

        // Preload Viewer Config
        if (viewerConfigUrl) {
            const config = await loadFileFromUrl(viewerConfigUrl, 'ViewerConfig', 'defaultConfig');
            if (config) {
                try {
                    setViewerConfig(config);
                    viewerConfigLocal = getViewerConfig(); // Update local cache
                    const vcFileName = viewerConfigUrl.substring(viewerConfigUrl.lastIndexOf('/') + 1);
                    updateEditorStatus(`Viewer Config preloaded from: ${vcFileName}`);
                    if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = 'none'; // Hide manual input
                } catch (e) {
                    handleConfigLoadError('Viewer Config from URL', e);
                    if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = ''; // Show manual input on error
                }
            } else {
                if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = ''; // Show manual input if load failed
            }
        } else {
            updateEditorStatus("No Viewer Config URL for preload. Manual input active.", false);
            if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        }

        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig()); // Refresh after viewer config potential load

        // Preload CSV Data (requires Editor Config to be loaded first for parsing context)
        if (csvDataUrl) {
            const edCfg = getEditorConfig(); // Should be set if we are here
            const viewerCfg = getViewerConfig(); // Might have been set from preload above
            if (edCfg) {
                const csvText = await loadFileFromUrl(csvDataUrl, 'CSVData');
                if (csvText !== null) { // Check for null explicitly, empty string is valid CSV
                    try {
                        const csvFileName = csvDataUrl.substring(csvDataUrl.lastIndexOf('/') + 1);
                        if (processCsvTextOnly(csvText, `URL (${csvFileName})`)) {
                            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = 'none'; // Hide manual input
                            if (!viewerCfg) { // If viewer config wasn't preloaded or failed
                                updateEditorStatus("CSV Data preloaded. Viewer Config (for full display/sort) may need manual load or a working URL.", true);
                            }
                        } else {
                            throw new Error("CSV text processing failed during preload.");
                        }
                    } catch (e) {
                        updateEditorStatus(`Error processing preloaded CSV: ${e.message}`, true);
                        clearCsvData(); // Clear any partial data
                        if (csvDataFileInput) csvDataFileInput.parentElement.style.display = ''; // Show manual input on error
                    }
                } else {
                    if (csvDataFileInput) csvDataFileInput.parentElement.style.display = ''; // Show manual input if load failed
                }
            } else {
                // This case should ideally not happen if editorConfig is required for preloads to start
                updateEditorStatus(`CSV Data URL found, but Editor Config not ready. Load CSV manually.`, true);
                if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
            }
        } else {
            updateEditorStatus("No CSV Data URL in editor_config. Load CSV manually.", false);
            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
        }
        console.log("EDITOR_APP: attemptPreloadsFromEditorConfig - Finished.");
    }


    /**
     * Generates a textual digest of changes made to the CSV data compared to its initial state.
     * @returns {string} A string detailing additions, deletions, and modifications.
     */
    function generateChangeDigestOnDemand() {
        console.log("EDITOR_APP: generateChangeDigestOnDemand - Generating change digest...");
        const editorCfg = getEditorConfig();
        if (!editorCfg || !editorCfg.columns || !initialCsvData) {
            console.warn("EDITOR_APP: generateChangeDigestOnDemand - Editor config, columns, or initial data not available.");
            return "Cannot generate change digest: Configuration or initial data is missing.";
        }

        const pkColumnName = editorCfg.changeTrackingPrimaryKeyColumn;
        const columnDefs = editorCfg.columns;
        let digest = "";
        let changesFound = false;

        // Map current data by _originalIndex for efficient lookup of modified/existing rows
        const currentDataMapByOriginalIndex = new Map();
        csvDataMain.forEach(row => { // Use csvDataMain directly
            if (row._originalIndex !== -1 && row._originalIndex !== undefined) {
                currentDataMapByOriginalIndex.set(row._originalIndex, row);
            }
        });

        // 1. Detect Deletions: Rows in initialCsvData but not in currentDataMapByOriginalIndex
        initialCsvData.forEach(initialRow => {
            if (!currentDataMapByOriginalIndex.has(initialRow._originalIndex)) {
                changesFound = true;
                const identifier = pkColumnName ? (initialRow[pkColumnName] || `Original PK missing, Index: ${initialRow._originalIndex}`) : `Original Index: ${initialRow._originalIndex}`;
                digest += `--- Initiative: ${identifier} ---\n`;
                digest += `Status: DELETED\n`;
                digest += "Original Values:\n";
                columnDefs.forEach(colDef => {
                    digest += `  - ${colDef.label || colDef.name}: ${formatValueForDigest(initialRow[colDef.name])}\n`;
                });
                digest += "\n";
            }
        });

        // 2. Detect Additions and Modifications
        csvDataMain.forEach(currentRow => { // Use csvDataMain directly
            const originalRowIndex = currentRow._originalIndex;

            if (originalRowIndex === -1 || originalRowIndex === undefined) { // New row (added in UI)
                changesFound = true;
                const identifier = pkColumnName ? (currentRow[pkColumnName] || "New Item (PK Missing/Not Set)") : `New Item (Added at runtime)`;
                digest += `--- Initiative: ${identifier} ---\n`;
                digest += `Status: ADDED\n`;
                digest += "Values:\n";
                columnDefs.forEach(colDef => {
                    digest += `  - ${colDef.label || colDef.name}: ${formatValueForDigest(currentRow[colDef.name])}\n`;
                });
                digest += "\n";
            } else { // Existing row, check for modifications
                const initialRow = initialCsvData.find(r => r._originalIndex === originalRowIndex);
                if (!initialRow) {
                    // This should ideally not happen if _originalIndex is managed correctly
                    console.warn(`EDITOR_APP: generateChangeDigestOnDemand - Consistency issue: Current row with _originalIndex ${originalRowIndex} not found in initialCsvData.`);
                    return; // Skip this row
                }

                let rowModifications = [];
                const currentActualPK = pkColumnName ? currentRow[pkColumnName] : null;
                const originalActualPK = pkColumnName ? initialRow._originalPkValue : null; // Use _originalPkValue from initial data

                // Specifically check for Primary Key change
                if (pkColumnName && String(originalActualPK ?? '') !== String(currentActualPK ?? '')) {
                    rowModifications.push(`  - Identifier (${pkColumnName}) changed from "${formatValueForDigest(originalActualPK)}" to "${formatValueForDigest(currentActualPK)}".\n`);
                }

                columnDefs.forEach(colDef => {
                    const columnName = colDef.name;
                    if (pkColumnName && columnName === pkColumnName) return; // PK change already handled above

                    const initialValue = initialRow[columnName];
                    const currentValue = currentRow[columnName];

                    let valueChanged = false;
                    if (colDef.type === 'multi-select') {
                        // Normalize arrays for comparison (sort strings)
                        const initialArray = Array.isArray(initialValue) ? initialValue.map(String).sort() : (initialValue ? [String(initialValue)].sort() : []);
                        const currentArray = Array.isArray(currentValue) ? currentValue.map(String).sort() : (currentValue ? [String(currentValue)].sort() : []);
                        if (JSON.stringify(initialArray) !== JSON.stringify(currentArray)) {
                            valueChanged = true;
                        }
                    } else {
                        // Standard comparison for other types, coercing to string for consistent diff.
                        // Using ?? '' handles null/undefined gracefully, treating them like empty strings for comparison.
                        if (String(initialValue ?? '') !== String(currentValue ?? '')) {
                            valueChanged = true;
                        }
                    }

                    if (valueChanged) {
                        rowModifications.push(`  - ${colDef.label || columnName} changed from "${formatValueForDigest(initialValue)}" to "${formatValueForDigest(currentValue)}".\n`);
                    }
                });

                if (rowModifications.length > 0) {
                    changesFound = true;
                    // Use current PK for header, fallback to original PK, then index
                    const displayIdentifier = pkColumnName ? (currentActualPK || originalActualPK || `Original Index: ${originalRowIndex}`) : `Original Index: ${originalRowIndex}`;
                    digest += `--- Initiative: ${displayIdentifier} ---\n`;
                    if (pkColumnName && String(originalActualPK ?? '') !== String(currentActualPK ?? '') && String(originalActualPK ?? '') !== displayIdentifier) {
                        // If PK changed, also note what it was originally identified as, if different from current displayIdentifier
                        digest += `(Originally identified as: ${formatValueForDigest(originalActualPK)})\n`;
                    }
                    digest += "Modifications:\n";
                    rowModifications.forEach(change => digest += change);
                    digest += "\n";
                }
            }
        });

        if (!changesFound) {
            digest = "No changes detected since the initial data load.";
        }
        console.log("EDITOR_APP: generateChangeDigestOnDemand - Change digest generated.");
        return digest;
    }

    /**
     * Formats a value for display in the textual change digest.
     * @param {*} value - The value to format.
     * @returns {string} A string representation of the value.
     */
    function formatValueForDigest(value) {
        if (value === null || value === undefined) return "(not set)";
        if (value === '') return "(empty string)";
        if (Array.isArray(value)) {
            if (value.length === 0) return "(empty list)";
            return `[${value.map(v => formatSingleValueForDigest(String(v))).join(', ')}]`; // Format each item
        }
        return formatSingleValueForDigest(String(value)); // Format single non-array value
    }

    /**
     * Sub-helper to format individual non-array string values for the digest.
     * Primarily escapes internal double quotes. For a digest, full CSV quoting isn't strictly necessary,
     * but escaping quotes helps if values themselves contain quotes.
     * @param {string} stringValue - The string value to format.
     * @returns {string} The formatted string.
     */
    function formatSingleValueForDigest(stringValue) {
        // Assumes stringValue is not null, undefined, or empty string (handled by caller)
        // Escape internal double quotes to make the digest more robust if values contain quotes.
        return stringValue.replace(/"/g, '""');
        // Note: The original code had a more complex logic for adding surrounding quotes
        // based on content (commas, spaces). For a human-readable digest, simply escaping
        // internal quotes is often sufficient. If strict CSV-like quoting for individual fields
        // in the digest is required, that logic would need to be re-instated here.
    }

    // --- Application Initialization Logic ---

    /**
     * Initializes the editor application.
     * Attempts to load an embedded editorConfig, then preloads other configs/data if specified.
     */
    async function initializeEditor() {
        console.log("EDITOR_APP: initializeEditor - Starting editor initialization.");
        updateEditorStatus("Initializing editor...");
        resetEditorTitles();

        // Attempt to load editorConfig if embedded in the page (e.g., window.editorConfig)
        if (typeof window.editorConfig === 'object' && window.editorConfig !== null) {
            console.log("EDITOR_APP: initializeEditor - Found pre-loaded window.editorConfig.");
            updateEditorStatus("Loading initial Editor Config embedded in page...");
            try {
                const initialEditorConf = JSON.parse(JSON.stringify(window.editorConfig)); // Deep copy
                setEditorConfig(initialEditorConf);
                editorConfigLocal = getEditorConfig(); // Update local cache
                initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal);
                updateEditorStatus(`Initial Editor Config "${editorConfigLocal.editorSchemaVersion || 'N/A'}" loaded.`);
                if (editorConfigFileInput) editorConfigFileInput.parentElement.style.display = 'none'; // Hide manual input

                // Attempt to preload viewer config and CSV data based on URLs in the editor config
                await attemptPreloadsFromEditorConfig(editorConfigLocal);
            } catch (e) {
                handleConfigLoadError('Initial Editor Config (embedded)', e);
                // Ensure editor config input is visible and enabled on error
                if (editorConfigFileInput) {
                    editorConfigFileInput.parentElement.style.display = '';
                    editorConfigFileInput.disabled = false;
                    editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
                }
            }
        } else {
            updateEditorStatus("Load Editor Configuration file to begin (or ensure it's embedded and defines window.editorConfig).");
            // Ensure editor config input is visible and enabled if no embedded config
            if (editorConfigFileInput) {
                editorConfigFileInput.parentElement.style.display = '';
                editorConfigFileInput.disabled = false;
                editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
            }
        }
        console.log("EDITOR_APP: initializeEditor - Calling finalizeConfigAndDataLoad after initial setup attempt.");
        finalizeConfigAndDataLoad(); // Finalize even if parts failed, to render current state
        console.log("EDITOR_APP: initializeEditor - Initialization process finished.");
    }

    // --- Initialize App State & Call Startup Function ---
    initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal); // Initial call
    await initializeEditor(); // Start the main initialization sequence

    // --- Global Event Listeners ---
    window.addEventListener('editorDataChanged', () => {
        // This custom event is presumably dispatched from the grid editing logic
        console.log("EDITOR_APP: 'editorDataChanged' event received. Re-checking actions.");
        checkAndEnableActions(); // Update button states when data changes
    });

    // --- File Input Event Listeners ---
    if (viewerConfigFileInput) {
        viewerConfigFileInput.addEventListener('change', async (event) => {
            console.log("EDITOR_APP: viewerConfigFileInput - Manual 'change' event triggered.");
            const file = event.target.files[0];
            if (!file) return;

            if (confirmAndClearOnManualOverride("ViewerConfig")) {
                updateEditorStatus(`Loading Viewer Config from file: ${file.name}...`);
                try {
                    const loadedConfig = await loadJsConfigurationFile(file, 'defaultConfig');
                    setViewerConfig(loadedConfig);
                    viewerConfigLocal = getViewerConfig(); // Update local cache
                    initDataGridReferences(csvDataMain, getEditorConfig(), viewerConfigLocal); // Refresh grid
                    updateEditorTitles(viewerConfigLocal);
                    updateEditorStatus(`Viewer Config "${file.name}" loaded manually.`);
                    finalizeConfigAndDataLoad(); // Re-process and re-render
                } catch (error) {
                    handleConfigLoadError('Viewer Config (manual)', error);
                    resetEditorTitles(); // Reset titles on error
                }
            } else {
                event.target.value = ''; // Clear file input if user cancels
            }
            checkAndEnableActions();
        });
    }

    if (editorConfigFileInput) {
        editorConfigFileInput.addEventListener('change', async (event) => {
            console.log("EDITOR_APP: editorConfigFileInput - Manual 'change' event (triggers full reset).");
            const file = event.target.files[0];
            if (!file) return;

            if (!confirm("Manually loading a new Editor Configuration will reset the editor and discard ALL current data and configurations. Proceed?")) {
                event.target.value = ''; // Clear file input if user cancels
                return;
            }
            clearAllApplicationState(); // Full reset before loading new editor config
            updateEditorStatus(`Loading OVERRIDE Editor Config from file: ${file.name}...`);
            try {
                const loadedConfig = await loadJsConfigurationFile(file, 'editorConfig');
                setEditorConfig(loadedConfig);
                editorConfigLocal = getEditorConfig(); // Update local cache
                initDataGridReferences(csvDataMain, editorConfigLocal, getViewerConfig());
                updateEditorStatus(`Editor Config "${file.name}" loaded manually (OVERRIDE).`);
                if (editorConfigFileInput) editorConfigFileInput.parentElement.style.display = 'none'; // Hide after successful load

                await attemptPreloadsFromEditorConfig(editorConfigLocal); // Attempt preloads with new editor config
                finalizeConfigAndDataLoad(); // Re-process and re-render
            } catch (error) {
                handleConfigLoadError('Editor Config (manual override)', error);
                // Ensure input is visible and enabled on error
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
            console.log("EDITOR_APP: csvDataFileInput - Manual 'change' event triggered.");
            const file = event.target.files[0];
            if (!file) return;

            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Load Editor Config before CSV data.", true);
                event.target.value = ''; // Clear file input
                return;
            }
            // Confirm before overwriting if there's existing data (based on initialCsvData baseline)
            if (initialCsvData.length > 0 && !confirm("Loading a new CSV file will replace current data and change history. Proceed?")) {
                event.target.value = ''; // Clear file input if user cancels
                return;
            }

            updateEditorStatus(`Loading CSV Data from file: ${file.name}...`);
            try {
                const csvText = await readFileContent(file); // Assumed utility to read file text
                // processCsvTextOnly clears and re-populates csvDataMain and initialCsvData
                if (processCsvTextOnly(csvText, `"${file.name}" (manual)`)) {
                    finalizeConfigAndDataLoad(); // Re-process and re-render with new data
                } else {
                    // If processCsvTextOnly fails but doesn't throw, an error status should be set there.
                    // Render grid to show empty state or error message if applicable.
                    renderGridData();
                }
            } catch (error) {
                updateEditorStatus(`Error loading CSV Data from file: ${error.message}`, true);
                clearCsvData(); // Clear any partial data
                renderGridData(); // Render empty grid
            }
            checkAndEnableActions();
        });
    }

    // --- Action Button Event Handlers ---
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Cannot add row: Editor config not loaded.", true);
                return;
            }
            if (addNewRow()) { // addNewRow is an assumed external function that modifies csvDataMain
                updateEditorStatus("Row added. Scroll to bottom if not visible.");
                // Note: 'editorDataChanged' event should be dispatched by addNewRow or grid logic
                // to trigger checkAndEnableActions and potentially re-render.
                // If not, call finalizeConfigAndDataLoad() or parts of it here.
            } else {
                updateEditorStatus("Failed to add new row (see console for details).", true);
            }
        });
    }

    if (sortDataBtn) { // Note: This is the corrected, single listener for sortDataBtn
        sortDataBtn.addEventListener('click', () => {
            const viewerCfg = getViewerConfig();
            const editorCfg = getEditorConfig();

            if (!csvDataMain || csvDataMain.length === 0) {
                updateEditorStatus("No data to sort.", true);
                return;
            }
            // Sorting/partitioning requires either default sort criteria or partitioning to be enabled.
            if (!viewerCfg?.generalSettings?.defaultItemSortBy?.length && !editorCfg?.editorDisplaySettings?.partitionBy?.enabled) {
                updateEditorStatus("No default sort criteria in Viewer Config and partitioning is not enabled. Nothing to sort/partition.", true);
                return;
            }
            if (!editorCfg?.columns?.length) {
                updateEditorStatus("Editor Config not loaded, cannot determine sort/partition columns.", true);
                return;
            }

            updateEditorStatus("Re-applying default sort and partitioning...");
            try {
                applySortAndPartition(); // This function handles both global sort and partitioning
                renderGridData();        // Re-render the grid with the new order
                updateEditorStatus("Data sorted and partitioned successfully.");
            } catch (error) {
                updateEditorStatus(`Error during sort/partition: ${error.message}`, true);
                console.error("EDITOR_APP: Error in sortDataBtn click handler:", error);
            }
        });
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            const currentEdConfig = getEditorConfig();
            // Check if config is loaded and (there's data OR at least columns are defined for an empty export)
            if (!currentEdConfig || (!csvDataMain.length && !(currentEdConfig.columns?.length > 0))) {
                updateEditorStatus("Cannot export: Editor configuration not loaded or no data/columns to export.", true);
                return;
            }

            updateEditorStatus("Generating export files...");
            const now = new Date();
            const baseFilename = `edited_data_${now.toISOString().slice(0, 10).replace(/-/g, '')}_${now.toTimeString().slice(0, 8).replace(/:/g, '')}`;

            // 1. Generate CSV Content
            const outputOptions = currentEdConfig.csvOutputOptions || {};
            const csvString = generateCsvForExport(csvDataMain, currentEdConfig.columns, outputOptions); // Assumed external function
            const csvFilename = `${baseFilename}.csv`;

            if (csvString === null && (csvDataMain.length > 0 || (currentEdConfig.columns?.length > 0))) {
                // This implies an error during CSV generation if data/columns were expected.
                updateEditorStatus("Error during CSV generation for export. CSV not exported.", true);
            } else {
                // Trigger CSV download (even if csvString is empty, for empty data with headers)
                triggerDownload(csvString, csvFilename, 'text/csv;charset=utf-8;');
                updateEditorStatus(`Data exported to ${csvFilename}.`);
            }

            // 2. Generate Change Digest Content (only if initial data exists for comparison)
            if (initialCsvData.length > 0) {
                let digestString = generateChangeDigestOnDemand();
                let digestFilenameSuffix = "_CHANGES";
                if (digestString.startsWith("No changes detected")) {
                    digestFilenameSuffix = "_NO_CHANGES";
                }

                const userFriendlyTimestamp = now.toLocaleString();
                const digestHeader = `Change Digest Exported: ${userFriendlyTimestamp}\n` +
                                   `===================================================\n\n`;
                digestString = digestHeader + digestString;
                const digestFilename = `${baseFilename}${digestFilenameSuffix}.txt`;

                triggerDownload(digestString, digestFilename, 'text/plain;charset=utf-8;');
                updateEditorStatus(`Change digest exported to ${digestFilename}. Export process complete.`);
            } else {
                updateEditorStatus(`CSV exported. Change digest not generated as initial data was not available for comparison.`);
            }
        });
    }

    // Listener for "View Changes" button and modal interactions
    if (viewChangesBtn && changesModal && changeDigestOutput) {
        viewChangesBtn.addEventListener('click', () => {
            if (!getEditorConfig() || initialCsvData.length === 0) {
                updateEditorStatus("Load Editor Config and ensure initial CSV data is present to view changes.", true);
                return;
            }
            updateEditorStatus("Generating change digest for viewing...");
            const digestText = generateChangeDigestOnDemand();
            changeDigestOutput.textContent = digestText; // Use textContent for <pre> to preserve formatting
            changesModal.style.display = 'block';
            updateEditorStatus("Change digest displayed in modal.");
        });

        if (closeChangesModalBtn) { // Assuming a dedicated close button for the modal
            closeChangesModalBtn.onclick = function () {
                changesModal.style.display = "none";
            }
        }
        // Allow closing modal by clicking outside of it
        window.onclick = function (event) {
            if (event.target == changesModal) {
                changesModal.style.display = "none";
            }
        }
    } else {
        console.warn("EDITOR_APP: View Changes button or modal DOM elements not found. 'View Changes' functionality will be unavailable.");
    }

    console.log("EDITOR_APP: DOMContentLoaded - Editor App Initialized successfully and event listeners attached.");
});

// --- Global Utility Functions (can be moved to a separate utils.js file if preferred) ---

/**
 * Triggers a browser download for the given content.
 * @param {string|null} content - The content to download. If null, logs a warning.
 * @param {string} filename - The desired filename for the download.
 * @param {string} [mimeType='text/csv;charset=utf-8;'] - The MIME type of the content.
 */
function triggerDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    if (content === null || content === undefined) {
        console.warn(`EDITOR_APP: triggerDownload - No content provided for filename "${filename}". Download aborted.`);
        // Optionally, inform the user via updateEditorStatus if this is critical
        // updateEditorStatus(`Failed to generate content for ${filename}.`, true);
        return;
    }
    const BOM = "\uFEFF"; // Byte Order Mark for UTF-8, helps Excel open CSVs correctly
    const blob = new Blob([BOM + content], { type: mimeType });
    const link = document.createElement("a");

    // Check for HTML5 download attribute support
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up the object URL
    } else {
        // Fallback for browsers that don't support the download attribute
        alert("Download not directly supported by your browser. Check console for data or try a different browser.");
        console.error("EDITOR_APP: triggerDownload - HTML5 download attribute not supported.");
        console.log(`Data for manual copy (${filename}):\n----------\n${content}\n----------`);
    }
}
// --- End of file: editor_app.js ---