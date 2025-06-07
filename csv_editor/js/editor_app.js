// ================================================================
// File: csv_editor/js/editor_app.js
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("EDITOR_APP: DOMContentLoaded - Initializing application...");

    // --- Application State Variables ---
    let viewerConfigLocal = null;
    let editorConfigLocal = null;
    let csvDataMain = [];
    let initialCsvData = [];
    let csvHeadersFromUpload = [];
    let cachedCumulativeLogContent = null;
    let activeDisplayFilterId = null; // ID of the currently active display filter

    // --- DOM Element References ---
    const {
        viewerConfigFileInput, editorConfigFileInput, csvDataFileInput,
        addRowBtn, sortDataBtn, exportCsvBtn, uploadConfluenceBtn, statusMessages,
        viewChangesBtn, changesModal, changeDigestOutput, closeChangesModalBtn
    } = editorDomElements;
    const mainPageHeading = document.querySelector('#csv-editor-wrapper h1');
    const displayFilterDropdown = document.createElement('select'); // Dropdown for selecting a display filter
    displayFilterDropdown.id = 'editorDisplayFilterDropdown';
    displayFilterDropdown.style.marginLeft = '15px'; // Add some spacing

    // --- Helper Function Definitions ---


    /**
        * Formats a relational ID (or array of IDs) for the changelog digest.
        * Looks up the corresponding name for the ID and returns "Name (ID)".
        * @param {*} value - The ID or array of IDs to format.
        * @param {object} colDef - The column definition for the field being checked.
        * @returns {string} The formatted, human-readable string.
        */
    function formatRelationalValueForDigest(value, colDef) {
        if (value === null || value === undefined || value === '') return "(not set)";

        const idsToFormat = Array.isArray(value) ? value : [value];
        if (idsToFormat.length === 0) return "(empty list)";

        const derivationConfig = colDef.deriveOptionsFrom;
        if (!derivationConfig) {
            // Fallback for non-relational fields, should not happen if called correctly
            return formatValueForDigest(value);
        }

        const formattedValues = idsToFormat.map(id => {
            if (id === null || typeof id === 'undefined' || String(id).trim() === '') return "(empty)";

            const linkedItem = _csvDataInstance.find(row => String(row[derivationConfig.column]) === String(id));

            if (linkedItem) {
                const displayLabel = linkedItem[derivationConfig.labelColumn] || `(Label missing)`;
                return `${displayLabel} (${id})`;
            } else {
                return `${id} (Not Found)`;
            }
        });

        return `[${formattedValues.join(', ')}]`;
    }

    /**
        * Generates a formatted UTC timestamp string.
        * @param {Date} dateObject - The Date object to format.
        * @param {boolean} [forFilename=false] - If true, formats as YYYYMMDD_HHMM. Otherwise, YYYY-MM-DD HH:MM.
        * @returns {string} The formatted UTC timestamp string.
        */
    function getFormattedUTCTimestamp(dateObject, forFilename = false) {
        const year = dateObject.getUTCFullYear();
        const month = (dateObject.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = dateObject.getUTCDate().toString().padStart(2, '0');
        const hours = dateObject.getUTCHours().toString().padStart(2, '0');
        const minutes = dateObject.getUTCMinutes().toString().padStart(2, '0');

        if (forFilename) {
            return `${year}${month}${day}_${hours}${minutes}`;
        } else {
            return `${year}-${month}-${day} ${hours}:${minutes}`; // The " UTC" will be added where this is used for content
        }
    }

    function getFormattedTimestampsForLog(dateObject) {
        // 1. UTC (as before)
        const yearUTC = dateObject.getUTCFullYear();
        const monthUTC = (dateObject.getUTCMonth() + 1).toString().padStart(2, '0');
        const dayUTC = dateObject.getUTCDate().toString().padStart(2, '0');
        const hoursUTC = dateObject.getUTCHours().toString().padStart(2, '0');
        const minutesUTC = dateObject.getUTCMinutes().toString().padStart(2, '0');
        const utcString = `${yearUTC}-${monthUTC}-${dayUTC} ${hoursUTC}:${minutesUTC} UTC`;

        // Helper to format time for a specific IANA zone
        const formatForIANAZone = (ianaZoneName) => {
            try {
                const formatter = new Intl.DateTimeFormat('en-US', { // Using 'en-US' for consistent formatting parts
                    timeZone: ianaZoneName,
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: true // Or false for 24-hour
                });
                const parts = formatter.formatToParts(dateObject);

                const y = parts.find(p => p.type === 'year')?.value;
                const m = parts.find(p => p.type === 'month')?.value;
                const d = parts.find(p => p.type === 'day')?.value;
                const h = parts.find(p => p.type === 'hour')?.value;
                const min = parts.find(p => p.type === 'minute')?.value;
                const ap = parts.find(p => p.type === 'dayPeriod')?.value; // AM/PM

                if (y && m && d && h && min && ap) {
                    // We'll include the IANA zone name itself instead of trying to get an abbreviation
                    return `${y}-${m}-${d} ${h}:${min} ${ap} (${ianaZoneName})`;
                } else {
                    // Fallback if parts are not as expected (less likely with 'en-US' locale)
                    const fallbackFormatted = dateObject.toLocaleString('en-US', { timeZone: ianaZoneName, hour12: true, timeZoneName: 'short' });
                    return `(${fallbackFormatted} - ${ianaZoneName})`;
                }
            } catch (e) {
                console.warn(`Error formatting time for IANA zone ${ianaZoneName}:`, e);
                return `(${ianaZoneName} not available)`;
            }
        };

        // 2. New York Time (using IANA name)
        const newYorkString = formatForIANAZone('America/New_York');

        // 3. Phoenix Time (using IANA name)
        const phoenixString = formatForIANAZone('America/Phoenix');

        return { utc: utcString, newYork: newYorkString, phoenix: phoenixString };
    }

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
            console.error(`EDITOR_APP: STATUS (Error) - ${message}`);
        } else {
            console.log(`EDITOR_APP: STATUS - ${message}`);
        }
        if (statusMessages) {
            statusMessages.textContent = `Action: ${message}`;
            statusMessages.style.color = isError ? 'red' : '#495057';
        }
    }

    function checkAndEnableActions() {
        const editorCfg = getEditorConfig();
        const viewerCfg = getViewerConfig();
        const canAddRow = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0);
        const canExport = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0);
        const canSort = !!(csvDataMain.length > 0 && viewerCfg?.generalSettings?.defaultItemSortBy?.length > 0 && editorCfg?.columns?.length > 0);
        const canViewChanges = !!(editorCfg && (initialCsvData.length > 0 || cachedCumulativeLogContent !== null));
        const confluenceEnabled = !!(editorCfg?.confluenceAttachmentSettings?.enabled);

        if (addRowBtn) addRowBtn.disabled = !canAddRow;
        if (sortDataBtn) sortDataBtn.disabled = !canSort;
        if (exportCsvBtn) exportCsvBtn.disabled = !canExport;
        if (viewChangesBtn) viewChangesBtn.disabled = !canViewChanges;
        if (uploadConfluenceBtn) {
            if (confluenceEnabled) {
                uploadConfluenceBtn.style.display = '';
                const ready = csvDataMain.length > 0 && confluenceAvailable();
                uploadConfluenceBtn.disabled = !ready;
            } else {
                uploadConfluenceBtn.style.display = 'none';
            }
        }
    }

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
                const errorMsg = `HTTP error ${response.status} fetching ${url}.`;
                updateEditorStatus(errorMsg, true);
                return null;
            }
            const content = await response.text();
            console.log(`EDITOR_APP: loadFileFromUrl - Successfully fetched content for ${type} from ${url}. Length: ${content.length}`);
            if (type === 'ViewerConfig' || type === 'EditorConfig') {
                const pseudoFileName = url.substring(url.lastIndexOf('/') + 1) || `${type.toLowerCase()}_from_url.js`;
                const pseudoFile = new File([content], pseudoFileName, { type: 'application/javascript' });
                return await loadJsConfigurationFile(pseudoFile, expectedGlobalVarName);
            } else if (type === 'CSVData' || type === 'CumulativeLog') {
                return content;
            }
        } catch (error) {
            updateEditorStatus(`Error loading ${type} from ${url}: ${error.message}.`, true);
            return null;
        }
        return null;
    }

    function confirmAndClearOnManualOverride(configTypeChanging) {
        if (configTypeChanging === "ViewerConfig" && getViewerConfig()) {
            const message = "Manually loading a new Viewer Config will reprocess data with new display settings. Current data will be kept. Proceed?";
            if (!confirm(message)) { return false; }
            setViewerConfig(null);
            viewerConfigLocal = null;
        }
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());
        return true;
    }

    function clearAllApplicationState() {
        console.log("EDITOR_APP: clearAllApplicationState - Performing full application reset.");
        csvDataMain.length = 0;
        initialCsvData.length = 0;
        csvHeadersFromUpload = [];
        cachedCumulativeLogContent = null;
        activeDisplayFilterId = null; // Reset active filter ID

        clearAllConfigs();
        viewerConfigLocal = null;
        editorConfigLocal = null;

        initDataGridReferences(csvDataMain, null, null);
        clearGridStructure();
        resetEditorTitles();
        updateEditorStatus("Editor reset. Load new configurations and data.");

        if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        if (editorConfigFileInput) {
            editorConfigFileInput.parentElement.style.display = '';
            editorConfigFileInput.disabled = false;
            editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
        }
        if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
        populateDisplayFilterDropdown(); // Refresh filter dropdown
    }

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
            cachedCumulativeLogContent = null;
            activeDisplayFilterId = null; // Reset after loading
            populateDisplayFilterDropdown(); // Repopulate dropdown
        }
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());
    }

    function finalizeConfigAndDataLoad() {
        console.log("EDITOR_APP: finalizeConfigAndDataLoad - Finalizing. csvDataMain length:", csvDataMain.length);
        const edCfg = getEditorConfig();

        if (getViewerConfig()) {
            updateEditorTitles(getViewerConfig());
        } else {
            resetEditorTitles();
        }

        // Update the dropdown after loading new editorConfig
        populateDisplayFilterDropdown();

        if (edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Editor config present, rendering grid structure.");
            renderGridStructure(edCfg.columns);
        } else {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - No editor config, clearing grid structure.");
            clearGridStructure();
            if (editorDomElements.editorConfigFileInput && editorDomElements.editorConfigFileInput.parentElement.style.display !== 'none') {
                editorDomElements.editorConfigFileInput.disabled = false;
                editorDomElements.editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
            }
        }

        if (csvDataMain.length > 0 && edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Aligning data to editor schema.");
            alignDataToEditorSchema();
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Applying sort and partition.");
            applySortAndPartition(); // This sorts/partitions _csvDataInstance
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Rendering grid data.");
            renderGridData(); // This renders based on _csvDataInstance
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Applying display filter.");
            applyDisplayFilter(); // This hides/shows rows in the rendered grid
        } else if (edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Editor config present, but no data. Rendering empty grid/message.");
            renderGridData(); // Shows "no data" message or empty grid
            applyDisplayFilter(); // Still apply filter in case "Show All" isn't default (though unlikely for no data)
        }
        checkAndEnableActions();
    }

    function processCsvTextOnly(csvText, sourceDescription = "CSV") {
        console.log(`EDITOR_APP: processCsvTextOnly - Processing CSV from ${sourceDescription}`);
        const currentEdConfig = getEditorConfig();
        if (!currentEdConfig) {
            updateEditorStatus("Cannot process CSV: Editor config not loaded.", true);
            return false;
        }
        const delimiter = currentEdConfig?.csvOutputOptions?.delimiter || ',';
        const parsed = editorParseCSV(csvText, delimiter);
        csvDataMain.length = 0;
        initialCsvData.length = 0;
        parsed.data.forEach(row => csvDataMain.push(row));
        csvHeadersFromUpload = parsed.headers;
        if (csvDataMain.length > 0) {
            if (currentEdConfig.columns) {
                csvDataMain.forEach(row => {
                    currentEdConfig.columns.forEach(colDef => {
                        if (colDef.type === 'multi-select') {
                            if (row.hasOwnProperty(colDef.name) && typeof row[colDef.name] === 'string') {
                                const valStr = row[colDef.name];
                                row[colDef.name] = valStr.split(',').map(s => s.trim()).filter(s => s);
                            } else if (!row.hasOwnProperty(colDef.name) || !Array.isArray(row[colDef.name])) {
                                row[colDef.name] = [];
                            }
                        }
                    });
                });
            }
            initialCsvData = JSON.parse(JSON.stringify(csvDataMain));
            const pkColumnName = currentEdConfig?.changeTrackingPrimaryKeyColumn;
            csvDataMain.forEach((row, index) => {
                row._originalIndex = index;
                initialCsvData[index]._originalIndex = index;
                if (pkColumnName && row.hasOwnProperty(pkColumnName)) {
                    row._originalPkValue = row[pkColumnName];
                    initialCsvData[index]._originalPkValue = row[pkColumnName];
                }
            });
            console.log("EDITOR_APP: processCsvTextOnly - Initial data snapshot created.");
        }
        console.log(`EDITOR_APP: processCsvTextOnly - Parsed ${csvDataMain.length} rows.`);
        alignDataToEditorSchema();
        updateEditorStatus(`CSV Data from ${sourceDescription} processed: ${csvDataMain.length} rows loaded.`, csvDataMain.length === 0 && parsed.data.length > 0);
        return true;
    }

    function clearCsvData() {
        console.log("EDITOR_APP: clearCsvData - Clearing main and initial CSV data.");
        csvDataMain.length = 0;
        initialCsvData.length = 0;
        csvHeadersFromUpload = [];
    }

    function applySortAndPartition() {
        console.log("EDITOR_APP: applySortAndPartition - Applying sort and partition logic.");
        const viewerCfg = getViewerConfig();
        const editorCfg = getEditorConfig();
        if (!csvDataMain || csvDataMain.length === 0) {
            console.log("EDITOR_APP: applySortAndPartition - No data to sort or partition.");
            return;
        }
        if (!editorCfg || !editorCfg.columns || editorCfg.columns.length === 0) {
            console.warn("EDITOR_APP: applySortAndPartition - Editor config not available.");
            return;
        }
        const defaultSortConfig = viewerCfg?.generalSettings?.defaultItemSortBy;
        if (defaultSortConfig && defaultSortConfig.length > 0) {
            console.log("EDITOR_APP: applySortAndPartition - Applying default sort to", csvDataMain.length, "items.");
            try {
                const effectiveHeadersForSorting = editorCfg.columns.map(c => c.name);
                const sortGlobalConfigMock = {
                    csvHeaders: effectiveHeadersForSorting,
                    generalSettings: { trueValues: viewerCfg?.generalSettings?.trueValues || [] }
                };
                sortData(csvDataMain, defaultSortConfig, sortGlobalConfigMock);
                console.log("EDITOR_APP: applySortAndPartition - Default sort applied.");
            } catch (error) {
                updateEditorStatus(`Error applying default sort: ${error.message}`, true);
            }
        } else {
            console.log("EDITOR_APP: applySortAndPartition - No default sort criteria.");
        }
        const partitionConfigSettings = editorCfg?.editorDisplaySettings?.partitionBy;
        if (partitionConfigSettings?.enabled &&
            partitionConfigSettings?.filter?.conditions?.length > 0) {
            const filterGroup = partitionConfigSettings.filter;
            console.log("EDITOR_APP: applySortAndPartition - Partitioning enabled. Filter:", JSON.stringify(filterGroup));
            const mainItems = [];
            const partitionedItems = [];
            let itemsMeetingPartitionCriteria = 0;
            const effectiveHeadersForPartitionCheck = editorCfg.columns.map(c => c.name);
            const configForPartitionCheck = {
                generalSettings: {
                    trueValues: viewerCfg?.generalSettings?.trueValues || ["true", "yes", "1", "y", "x", "on", "âœ“"]
                },
                csvHeaders: effectiveHeadersForPartitionCheck
            };
            csvDataMain.forEach((row) => {
                let rowMatchesPartitionFilter = false;
                if (filterGroup.conditions && filterGroup.conditions.length > 0) {
                    const logicIsOr = filterGroup.logic && filterGroup.logic.toUpperCase() === 'OR';
                    try {
                        if (logicIsOr) {
                            rowMatchesPartitionFilter = filterGroup.conditions.some(singleCondition =>
                                checkCondition(row, singleCondition, configForPartitionCheck)
                            );
                        } else {
                            rowMatchesPartitionFilter = filterGroup.conditions.every(singleCondition =>
                                checkCondition(row, singleCondition, configForPartitionCheck)
                            );
                        }
                    } catch (e) {
                        console.error("EDITOR_APP: applySortAndPartition - Error in checkCondition for partitioning:", e);
                    }
                }
                if (rowMatchesPartitionFilter) {
                    partitionedItems.push(row);
                    itemsMeetingPartitionCriteria++;
                } else {
                    mainItems.push(row);
                }
            });
            console.log(`EDITOR_APP: applySortAndPartition - Partitioning processed. Main: ${mainItems.length}, Partitioned: ${partitionedItems.length}.`);
            if (itemsMeetingPartitionCriteria > 0) {
                csvDataMain.splice(0, csvDataMain.length, ...mainItems, ...partitionedItems);
                console.log(`EDITOR_APP: applySortAndPartition - Partitioning applied. Data reordered.`);
            } else {
                console.log("EDITOR_APP: applySortAndPartition - Partitioning resulted in no items meeting criteria.");
            }
        } else {
            console.log("EDITOR_APP: applySortAndPartition - Partitioning not enabled or not configured.");
        }
    }

    function alignDataToEditorSchema() {
        console.log("EDITOR_APP: alignDataToEditorSchema - Aligning CSV data rows to editor column schema.");
        const currentEdConfig = getEditorConfig();
        if (!currentEdConfig || !currentEdConfig.columns) {
            console.warn("EDITOR_APP: alignDataToEditorSchema - Editor config or columns not available.");
            return;
        }
        const editorColumnDefinitions = currentEdConfig.columns;
        const tempAlignedData = [];
        csvDataMain.forEach(rawRow => {
            const alignedRow = {
                _originalIndex: rawRow._originalIndex,
                _originalPkValue: rawRow._originalPkValue
            };
            editorColumnDefinitions.forEach(colDef => {
                let val = rawRow.hasOwnProperty(colDef.name) ? rawRow[colDef.name] : undefined;
                if (colDef.type === 'multi-select') {
                    if (typeof val === 'string' && val !== '') {
                        val = val.split(',').map(s => s.trim()).filter(s => s);
                    } else if (!Array.isArray(val)) {
                        val = [];
                    }
                } else if (val === undefined) {
                    val = '';
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
        console.log("EDITOR_APP: attemptPreloadsFromEditorConfig - Checking for preload URLs.");
        cachedCumulativeLogContent = null;

        if (!loadedEditorConfig || !loadedEditorConfig.preloadUrls) {
            updateEditorStatus("No preloadUrls in editor config. Manual file inputs remain active.", false);
            if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
            return;
        }
        const { viewerConfigUrl, csvDataUrl, cumulativeLogUrl } = loadedEditorConfig.preloadUrls;

        if (viewerConfigUrl) {
            const config = await loadFileFromUrl(viewerConfigUrl, 'ViewerConfig', 'defaultConfig');
            if (config) {
                try {
                    setViewerConfig(config);
                    viewerConfigLocal = getViewerConfig();
                    const vcFileName = viewerConfigUrl.substring(viewerConfigUrl.lastIndexOf('/') + 1);
                    updateEditorStatus(`Viewer Config preloaded from: ${vcFileName}`);
                    if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = 'none';
                } catch (e) {
                    handleConfigLoadError('Viewer Config from URL', e);
                    if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
                }
            } else {
                if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
            }
        } else {
            updateEditorStatus("No Viewer Config URL for preload. Manual input active.", false);
            if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        }

        if (cumulativeLogUrl) {
            const logContent = await loadFileFromUrl(cumulativeLogUrl, 'CumulativeLog');
            if (logContent !== null) {
                cachedCumulativeLogContent = logContent;
                const logFileName = cumulativeLogUrl.substring(cumulativeLogUrl.lastIndexOf('/') + 1);
                updateEditorStatus(`Cumulative changelog preloaded from: ${logFileName}. Length: ${logContent.length}`);
            } else {
                updateEditorStatus(`Failed to load cumulative changelog from URL. Proceeding with new changes only. (URL: ${cumulativeLogUrl.substring(cumulativeLogUrl.lastIndexOf('/') + 1)})`, true);
                cachedCumulativeLogContent = null;
            }
        } else {
            console.log("EDITOR_APP: No cumulativeLogUrl provided in editor config.");
            cachedCumulativeLogContent = null;
        }

        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());

        if (csvDataUrl) {
            const edCfg = getEditorConfig();
            const viewerCfg = getViewerConfig();
            if (edCfg) {
                const csvText = await loadFileFromUrl(csvDataUrl, 'CSVData');
                if (csvText !== null) {
                    try {
                        const csvFileName = csvDataUrl.substring(csvDataUrl.lastIndexOf('/') + 1);
                        if (processCsvTextOnly(csvText, `URL (${csvFileName})`)) {
                            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = 'none';
                            if (!viewerCfg) {
                                updateEditorStatus("CSV Data preloaded. Viewer Config (for full display/sort) may need manual load or a working URL.", true);
                            }
                        } else {
                            throw new Error("CSV text processing failed during preload.");
                        }
                    } catch (e) {
                        updateEditorStatus(`Error processing preloaded CSV: ${e.message}`, true);
                        clearCsvData();
                        if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
                    }
                } else {
                    if (csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
                }
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

    /**
         * Generates a textual digest of changes made to the CSV data compared to its initial state,
         * formatted in a Markdown-friendly way that's also readable in a <pre> tag.
         * @returns {string} A string detailing additions, deletions, and modifications.
         */
   function generateChangeDigestOnDemand() {
        console.log("EDITOR_APP: generateChangeDigestOnDemand - Generating Markdown change digest...");
        const editorCfg = getEditorConfig();
        if (!editorCfg || !editorCfg.columns || !initialCsvData) {
            console.warn("EDITOR_APP: generateChangeDigestOnDemand - Config or initial data not available.");
            return "*Cannot generate change digest: Configuration or initial data is missing.*\n";
        }
        const pkColumnName = editorCfg.changeTrackingPrimaryKeyColumn;
        const columnDefs = editorCfg.columns;
        let digestLines = [];
        let changesFound = false;
        const currentDataMapByOriginalIndex = new Map();
        csvDataMain.forEach(row => {
            if (row._originalIndex !== -1 && row._originalIndex !== undefined) {
                currentDataMapByOriginalIndex.set(row._originalIndex, row);
            }
        });

        // 1. Detect Deletions
        initialCsvData.forEach(initialRow => {
            if (!currentDataMapByOriginalIndex.has(initialRow._originalIndex)) {
                changesFound = true;
                const identifier = pkColumnName ? (initialRow[pkColumnName] || `Original PK missing, Index: ${initialRow._originalIndex}`) : `Original Index: ${initialRow._originalIndex}`;
                digestLines.push(`### Initiative: ${identifier}`);
                digestLines.push(`Action: DELETED`);
                digestLines.push("Original Values:");
                columnDefs.forEach(colDef => {
                    const valueToFormat = initialRow[colDef.name];
                    // Format values from relational columns
                    const formattedValue = colDef.deriveOptionsFrom
                        ? formatRelationalValueForDigest(valueToFormat, colDef)
                        : formatValueForDigest(valueToFormat);
                    digestLines.push(`  - ${colDef.label || colDef.name}: ${formattedValue}`);
                });
                digestLines.push("");
            }
        });

        // 2. Detect Additions and Modifications
        csvDataMain.forEach(currentRow => {
            const originalRowIndex = currentRow._originalIndex;
            if (originalRowIndex === -1 || originalRowIndex === undefined) { // New row
                changesFound = true;
                const identifier = pkColumnName ? (currentRow[pkColumnName] || "New Item (PK Missing/Not Set)") : `New Item (Added at runtime)`;
                digestLines.push(`### Initiative: ${identifier}`);
                digestLines.push(`Action: ADDED`);
                digestLines.push("Values:");
                columnDefs.forEach(colDef => {
                    const valueToFormat = currentRow[colDef.name];
                     // Format values from relational columns
                    const formattedValue = colDef.deriveOptionsFrom
                        ? formatRelationalValueForDigest(valueToFormat, colDef)
                        : formatValueForDigest(valueToFormat);
                    digestLines.push(`  - ${colDef.label || colDef.name}: ${formattedValue}`);
                });
                digestLines.push("");
            } else { // Existing row, check for modifications
                const initialRow = initialCsvData.find(r => r._originalIndex === originalRowIndex);
                if (!initialRow) {
                    console.warn(`Consistency issue: Current row with _originalIndex ${originalRowIndex} not found in initialCsvData.`);
                    return;
                }
                let rowModificationsList = [];
                const currentActualPK = pkColumnName ? currentRow[pkColumnName] : null;
                const originalActualPK = pkColumnName ? initialRow._originalPkValue : null;

                if (pkColumnName && String(originalActualPK ?? '') !== String(currentActualPK ?? '')) {
                    rowModificationsList.push(`  - Identifier (${pkColumnName}): ${formatValueForDigest(originalActualPK)} --> ${formatValueForDigest(currentActualPK)}`);
                }

                columnDefs.forEach(colDef => {
                    const columnName = colDef.name;
                    if (pkColumnName && columnName === pkColumnName) return;
                    const initialValue = initialRow[columnName];
                    const currentValue = currentRow[columnName];
                    let valueChanged = false;
                    if (colDef.type === 'multi-select') {
                        const initialArray = Array.isArray(initialValue) ? initialValue.map(String).sort() : (initialValue ? [String(initialValue)].sort() : []);
                        const currentArray = Array.isArray(currentValue) ? currentValue.map(String).sort() : (currentValue ? [String(currentValue)].sort() : []);
                        if (JSON.stringify(initialArray) !== JSON.stringify(currentArray)) {
                            valueChanged = true;
                        }
                    } else {
                        if (String(initialValue ?? '') !== String(currentValue ?? '')) {
                            valueChanged = true;
                        }
                    }
                    if (valueChanged) {
                        // Format values from relational columns
                        const formattedInitial = colDef.deriveOptionsFrom
                            ? formatRelationalValueForDigest(initialValue, colDef)
                            : formatValueForDigest(initialValue);
                        const formattedCurrent = colDef.deriveOptionsFrom
                            ? formatRelationalValueForDigest(currentValue, colDef)
                            : formatValueForDigest(currentValue);
                        rowModificationsList.push(`  - ${colDef.label || columnName}: ${formattedInitial} --> ${formattedCurrent}`);
                    }
                });

                if (rowModificationsList.length > 0) {
                    changesFound = true;
                    const displayIdentifier = pkColumnName ? (currentActualPK || originalActualPK || `Original Index: ${originalRowIndex}`) : `Original Index: ${originalRowIndex}`;
                    digestLines.push(`### Initiative: ${displayIdentifier}`);
                    if (pkColumnName && String(originalActualPK ?? '') !== String(currentActualPK ?? '') && String(originalActualPK ?? '') !== displayIdentifier) {
                        digestLines.push(`(Originally identified as: ${formatValueForDigest(originalActualPK)})`);
                    }
                    digestLines.push(`Action: MODIFIED`);
                    digestLines.push("Modifications:");
                    rowModificationsList.forEach(change => digestLines.push(change));
                    digestLines.push("");
                }
            }
        });

        if (!changesFound) {
            return "*No changes detected since the initial data load.*\n";
        }
        return digestLines.join("\n");
    }

    // formatValueForDigest and formatSingleValueForDigest remain unchanged from your previous complete file.
    // They are assumed to be here or accessible.
    function formatValueForDigest(value) {
        if (value === null || value === undefined) return "(not set)";
        if (value === '') return "(empty string)";
        if (Array.isArray(value)) {
            if (value.length === 0) return "(empty list)";
            return `[${value.map(v => formatSingleValueForDigest(String(v))).join(', ')}]`;
        }
        return formatSingleValueForDigest(String(value));
    }

    function formatSingleValueForDigest(stringValue) {
        // For plain text readability in <pre> and basic Markdown, escaping backticks is good.
        // More complex Markdown injection is less likely if values don't usually contain Markdown.
        return stringValue.replace(/`/g, '\\`'); // Escape backticks for potential code span issues
    }

    function formatValueForDigest(value) {
        if (value === null || value === undefined) return "(not set)";
        if (value === '') return "(empty string)";
        if (Array.isArray(value)) {
            if (value.length === 0) return "(empty list)";
            return `[${value.map(v => formatSingleValueForDigest(String(v))).join(', ')}]`;
        }
        return formatSingleValueForDigest(String(value));
    }

    function formatSingleValueForDigest(stringValue) {
        return stringValue.replace(/"/g, '""');
    }

    // Populate the display filter dropdown
    function populateDisplayFilterDropdown() {
        const editorCfg = getEditorConfig();
        const filters = editorCfg?.editorDisplaySettings?.displayFilters;
        const filterContainer = document.getElementById('displayFilterContainer');

        // Clear existing options from the global displayFilterDropdown element
        displayFilterDropdown.innerHTML = '';

        if (!filterContainer) {
            console.warn("EDITOR_APP: Display filter container 'displayFilterContainer' not found in DOM. Dropdown cannot be placed.");
            displayFilterDropdown.style.display = 'none'; // Ensure it's hidden if container is missing
            return;
        }

        if (filters && Array.isArray(filters) && filters.length > 0) {
            console.log("EDITOR_APP: Populating display filter dropdown with", filters.length, "filters.");
            let defaultSelected = false;
            activeDisplayFilterId = null; // Reset active filter before repopulating

            filters.forEach(filter => {
                const option = document.createElement('option');
                option.value = filter.id;
                option.textContent = filter.label;
                if (filter.isDefault && !defaultSelected) {
                    option.selected = true;
                    activeDisplayFilterId = filter.id;
                    defaultSelected = true;
                }
                displayFilterDropdown.appendChild(option);
            });

            if (!defaultSelected && displayFilterDropdown.options.length > 0) {
                displayFilterDropdown.options[0].selected = true;
                activeDisplayFilterId = displayFilterDropdown.options[0].value;
            }

            // Ensure the dropdown is only added to the container once
            // And only if it's not already there (e.g. if this function is called multiple times)
            if (!filterContainer.contains(displayFilterDropdown)) {
                filterContainer.appendChild(displayFilterDropdown);
            }
            displayFilterDropdown.style.display = ''; // Make it visible
            console.log("EDITOR_APP: Display filter dropdown populated and visible. Active filter:", activeDisplayFilterId);

        } else {
            console.log("EDITOR_APP: No display filters defined in config or filters array is empty. Hiding dropdown.");
            activeDisplayFilterId = null;
            // If the dropdown was previously in the container, remove it or hide it
            if (filterContainer.contains(displayFilterDropdown)) {
                filterContainer.removeChild(displayFilterDropdown); // Or displayFilterDropdown.style.display = 'none';
            }
            displayFilterDropdown.style.display = 'none';
        }
    }

    // Apply CSS-based display filtering
    function applyDisplayFilter() {
        console.log(`EDITOR_APP: applyDisplayFilter - Applying filter: ${activeDisplayFilterId || 'None (Show All)'}`);
        const editorCfg = getEditorConfig();
        const viewerCfg = getViewerConfig(); // Needed for checkCondition's trueValues
        const tableBody = editorDomElements.editorGridTbody;

        if (!tableBody || !editorCfg || !editorCfg.columns || !csvDataMain) {
            console.warn("EDITOR_APP: applyDisplayFilter - Missing table body, config, or data. Cannot apply filter.");
            return;
        }

        const filters = editorCfg.editorDisplaySettings?.displayFilters;
        const selectedFilterConfig = filters?.find(f => f.id === activeDisplayFilterId);
        const filterCriteria = selectedFilterConfig?.criteria; // This is the {logic, conditions} object or null

        // Config for checkCondition (needs csvHeaders and trueValues)
        const headersForCheck = editorCfg.columns.map(c => c.name); // Use editor-defined column names
        const configForCheck = {
            csvHeaders: headersForCheck,
            generalSettings: {
                trueValues: viewerCfg?.generalSettings?.trueValues || ["true", "yes", "1", "y", "x", "on", "âœ“"]
            }
        };

        for (let i = 0; i < tableBody.rows.length; i++) {
            const tr = tableBody.rows[i];
            const rowIndex = parseInt(tr.dataset.rowIndex, 10); // Relies on renderGridData setting this

            if (isNaN(rowIndex) || rowIndex < 0 || rowIndex >= csvDataMain.length) {
                console.warn(`EDITOR_APP: applyDisplayFilter - Skipping row ${i} due to invalid or missing data-row-index or data mismatch.`);
                tr.classList.remove('editor-filter-hidden'); // Show by default if error
                continue;
            }
            const rowData = csvDataMain[rowIndex];
            let matchesFilter = true; // Default to true (visible)

            if (filterCriteria && filterCriteria.conditions && filterCriteria.conditions.length > 0) {
                // Evaluate the row against the filterCriteria
                const logicIsOr = filterCriteria.logic && filterCriteria.logic.toUpperCase() === 'OR';
                try {
                    if (logicIsOr) {
                        matchesFilter = filterCriteria.conditions.some(condition =>
                            checkCondition(rowData, condition, configForCheck)
                        );
                    } else { // Default to AND
                        matchesFilter = filterCriteria.conditions.every(condition =>
                            checkCondition(rowData, condition, configForCheck)
                        );
                    }
                } catch (e) {
                    console.error(`EDITOR_APP: applyDisplayFilter - Error checking condition for row ${rowIndex}:`, e, rowData, filterCriteria);
                    matchesFilter = true; // Show on error to be safe
                }
            }
            // If filterCriteria is null (e.g., "Show All"), matchesFilter remains true.
            tr.classList.toggle('editor-filter-hidden', !matchesFilter);
        }
        console.log("EDITOR_APP: applyDisplayFilter - CSS filter application complete.");
    }

    async function initializeEditor() {
        console.log("EDITOR_APP: initializeEditor - Starting editor initialization.");
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
                if (editorConfigFileInput) {
                    editorConfigFileInput.parentElement.style.display = '';
                    editorConfigFileInput.disabled = false;
                    editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
                }
            }
        } else {
            updateEditorStatus("Load Editor Configuration file to begin (or ensure it's embedded and defines window.editorConfig).");
            if (editorConfigFileInput) {
                editorConfigFileInput.parentElement.style.display = '';
                editorConfigFileInput.disabled = false;
                editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
            }
        }
        console.log("EDITOR_APP: initializeEditor - Calling finalizeConfigAndDataLoad after initial setup attempt.");
        finalizeConfigAndDataLoad();
        console.log("EDITOR_APP: initializeEditor - Initialization process finished.");
    }

    initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal);
    await initializeEditor();

    window.addEventListener('editorDataChanged', () => {
        console.log("EDITOR_APP: 'editorDataChanged' event received.");
        checkAndEnableActions();
        // No need to re-apply display filter here, as data changes don't affect which filter is selected.
        // The visual update for the changed row is handled by grid logic.
    });

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
                    viewerConfigLocal = getViewerConfig();
                    initDataGridReferences(csvDataMain, getEditorConfig(), viewerConfigLocal);
                    updateEditorTitles(viewerConfigLocal);
                    updateEditorStatus(`Viewer Config "${file.name}" loaded manually.`);
                    finalizeConfigAndDataLoad();
                } catch (error) {
                    handleConfigLoadError('Viewer Config (manual)', error);
                    resetEditorTitles();
                }
            } else {
                event.target.value = '';
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
                await attemptPreloadsFromEditorConfig(editorConfigLocal); // This will also try to load cumulative log
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
            console.log("EDITOR_APP: csvDataFileInput - Manual 'change' event triggered.");
            const file = event.target.files[0];
            if (!file) return;
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Load Editor Config before CSV data.", true);
                event.target.value = ''; return;
            }
            if (initialCsvData.length > 0 && !confirm("Loading a new CSV file will replace current data and change history. Proceed?")) {
                event.target.value = ''; return;
            }
            updateEditorStatus(`Loading CSV Data from file: ${file.name}...`);
            try {
                const csvText = await readFileContent(file);
                if (processCsvTextOnly(csvText, `"${file.name}" (manual)`)) {
                    finalizeConfigAndDataLoad();
                } else {
                    renderGridData();
                    applyDisplayFilter(); // Apply filter even if processing had issues (e.g. empty file)
                }
            } catch (error) {
                updateEditorStatus(`Error loading CSV Data from file: ${error.message}`, true);
                clearCsvData(); renderGridData(); applyDisplayFilter();
            }
            checkAndEnableActions();
        });
    }

    // Event listener for the display filter dropdown
    displayFilterDropdown.addEventListener('change', (event) => {
        activeDisplayFilterId = event.target.value;
        console.log(`EDITOR_APP: Display filter changed to: ${activeDisplayFilterId}`);
        updateEditorStatus(`Applying display filter: ${displayFilterDropdown.options[displayFilterDropdown.selectedIndex].text}`);
        applyDisplayFilter();
        // No need to call checkAndEnableActions as this doesn't change underlying data count
    });

    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Cannot add row: Editor config not loaded.", true); return;
            }
            if (addNewRow()) { // addNewRow already calls renderGridData
                updateEditorStatus("Row added.");
                applyDisplayFilter(); // Re-apply filter after new row is rendered
            } else {
                updateEditorStatus("Failed to add new row (see console for details).", true);
            }
        });
    }

    if (sortDataBtn) {
        sortDataBtn.addEventListener('click', () => {
            const viewerCfg = getViewerConfig();
            const editorCfg = getEditorConfig();
            if (!csvDataMain || csvDataMain.length === 0) {
                updateEditorStatus("No data to sort.", true); return;
            }
            if (!viewerCfg?.generalSettings?.defaultItemSortBy?.length && !editorCfg?.editorDisplaySettings?.partitionBy?.enabled) {
                updateEditorStatus("No default sort criteria in Viewer Config and partitioning is not enabled.", true); return;
            }
            if (!editorCfg?.columns?.length) {
                updateEditorStatus("Editor Config not loaded.", true); return;
            }
            updateEditorStatus("Re-applying default sort and partitioning...");
            try {
                applySortAndPartition(); // This modifies _csvDataInstance
                renderGridData();        // Re-renders the grid based on new order
                applyDisplayFilter();    // Re-applies current display filter
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
            if (!currentEdConfig || (!csvDataMain.length && !(currentEdConfig.columns?.length > 0))) {
                updateEditorStatus("Cannot export: Config or data not loaded.", true); return;
            }
            updateEditorStatus("Generating export files...");

            const now = new Date(); // Use a single 'now' for all timestamps
            const timestampForFilename = getFormattedUTCTimestamp(now, true); // For YYYYMMDD_HHMM filename part

            // Use helper to format timestamps for the log
            const contentTimestamps = getFormattedTimestampsForLog(now);
            const newChangesTimestampForContent = `${contentTimestamps.utc} | ${contentTimestamps.newYork} | ${contentTimestamps.phoenix}`;

            const baseFilenameSuffix = `_${timestampForFilename}_UTC`; // Suffix for filenames

            // CSV Export
            const outputOptions = currentEdConfig.csvOutputOptions || {};
            const csvString = generateCsvForExport(csvDataMain, currentEdConfig.columns, outputOptions);
            const csvFileBase = currentEdConfig.csvDataFileName || "edited_data";
            const csvFilename = `${csvFileBase}${baseFilenameSuffix}.csv`;

            if (csvString === null && (csvDataMain.length > 0 || (currentEdConfig.columns?.length > 0))) {
                updateEditorStatus("Error during CSV generation for export. CSV not exported.", true);
            } else {
                triggerDownload(csvString, csvFilename, 'text/csv;charset=utf-8;');
                updateEditorStatus(`Data exported to ${csvFilename}.`);
            }

            // Changelog Export
            let newChangesDigest = "*No new changes detected since last CSV load.*\n";
            if (initialCsvData.length > 0) {
                newChangesDigest = generateChangeDigestOnDemand();
            }

            // Construct Markdown changelog content using the new timestamp format
            let combinedLogContent = `## Changes Recorded: ${newChangesTimestampForContent}\n\n`;
            const user = getConfluenceUser();
            if (user) {
                combinedLogContent += `Editor - User ID: ${user.id} | UserName: ${user.name}\n\n`;
            } else {
                combinedLogContent += `Editor - User ID : Not available outside of confluence\n\n`;
            }
            combinedLogContent += newChangesDigest + "\n\n";
            combinedLogContent += "---\n\n";

            if (cachedCumulativeLogContent !== null) {
                combinedLogContent += cachedCumulativeLogContent;
            } else if (currentEdConfig.cumulativeLogUrl) {
                combinedLogContent += `*Note: Previous cumulative log from ${currentEdConfig.cumulativeLogUrl} could not be loaded.*\n`;
            }

            const changelogFileBase = currentEdConfig.cumulativeLogName || `${csvFileBase}_CHANGES`;
            const changelogFilename = `${changelogFileBase}${baseFilenameSuffix}.md`;

            triggerDownload(combinedLogContent, changelogFilename, 'text/markdown;charset=utf-8;');
            updateEditorStatus(`Changelog exported to ${changelogFilename}. Export process complete.`);
        });
    }

    if (uploadConfluenceBtn) {
        uploadConfluenceBtn.addEventListener('click', async () => {
            const cfg = getEditorConfig();
            if (!cfg) { updateEditorStatus('Editor config not loaded.', true); return; }
            if (!confluenceAvailable()) { updateEditorStatus('Confluence integration not available.', true); return; }

            updateEditorStatus('Uploading attachments to Confluence...');
            try {
                const csvOptions = cfg.csvOutputOptions || {};
                const csvString = generateCsvForExport(csvDataMain, cfg.columns, csvOptions);
                const csvName = cfg.confluenceAttachmentSettings?.csvAttachmentName || 'editor_data.csv';

                const now = new Date();
                const ts = getFormattedTimestampsForLog(now);
                const newChangesStamp = `${ts.utc} | ${ts.newYork} | ${ts.phoenix}`;
                let changesDigest = '*No new changes detected since last CSV load.*\n';
                if (initialCsvData.length > 0) changesDigest = generateChangeDigestOnDemand();

                let combined = `## Changes Recorded: ${newChangesStamp}\n\n` + changesDigest + "\n\n";
                const user = getConfluenceUser();
                if (user) {
                    combined += `Editor - User ID: ${user.id} | UserName: ${user.name}\n\n`;
                } else {
                    combined += `Editor - User ID : Not available outside of confluence\n\n`;
                }
                combined += "---\n\n";
                if (cachedCumulativeLogContent !== null) {
                    combined += cachedCumulativeLogContent;
                } else if (cfg.cumulativeLogUrl) {
                    combined += `*Note: Previous cumulative log from ${cfg.cumulativeLogUrl} could not be loaded.*\n`;
                }
                const logName = cfg.confluenceAttachmentSettings?.changelogAttachmentName || 'changelog.md';

                await saveOrUpdateConfluenceAttachment(csvName, csvString);
                await saveOrUpdateConfluenceAttachment(logName, combined);
                updateEditorStatus('Attachments saved to Confluence.');
            } catch (err) {
                console.error('Confluence upload failed', err);
                const msg = err.statusText || err.message || 'Unknown error';
                updateEditorStatus(`Error uploading to Confluence: ${msg}`, true);
            }
        });
    }

    if (viewChangesBtn && changesModal && changeDigestOutput) {
        viewChangesBtn.addEventListener('click', () => {
            const editorCfg = getEditorConfig();
            if (!editorCfg || (initialCsvData.length === 0 && cachedCumulativeLogContent === null)) {
                updateEditorStatus("Load Editor Config and ensure initial CSV data is present or a cumulative log is loaded to view changes.", true);
                return;
            }
            updateEditorStatus("Generating change digest for viewing...");

            let newChangesDigest = "*No new changes detected since last CSV load.*\n";
            if (initialCsvData.length > 0) {
                newChangesDigest = generateChangeDigestOnDemand();
            }

            // Use helper to format timestamps for the log
            const nowForView = new Date();
            const contentTimestamps = getFormattedTimestampsForLog(nowForView);
            const newChangesTimestampForContent = `${contentTimestamps.utc} | ${contentTimestamps.newYork} | ${contentTimestamps.phoenix}`;

            // Construct Markdown changelog content for modal
            let combinedDigestText = `## Changes Recorded: ${newChangesTimestampForContent}\n\n`;
            const user = getConfluenceUser();
            if (user) {
                combinedDigestText += `Editor - User ID: ${user.id} | UserName: ${user.name}\n\n`;
            } else {
                combinedDigestText += `Editor - User ID : Not available outside of confluence\n\n`;
            }
            combinedDigestText += newChangesDigest + "\n\n";
            combinedDigestText += "---\n\n";

            if (cachedCumulativeLogContent !== null) {
                combinedDigestText += cachedCumulativeLogContent;
            } else if (editorCfg.cumulativeLogUrl) {
                combinedDigestText += `*Note: Previous cumulative log from ${editorCfg.cumulativeLogUrl} could not be loaded.*\n`;
            }

            changeDigestOutput.textContent = combinedDigestText;
            changesModal.style.display = 'block';
            updateEditorStatus("Change digest displayed in modal.");
        });

        if (closeChangesModalBtn) {
            closeChangesModalBtn.onclick = function () {
                changesModal.style.display = "none";
            }
        }
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

function triggerDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    if (content === null || content === undefined) {
        console.warn(`EDITOR_APP: triggerDownload - No content provided for filename "${filename}". Download aborted.`);
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
        console.error("EDITOR_APP: triggerDownload - HTML5 download attribute not supported.");
        console.log(`Data for manual copy (${filename}):\n----------\n${content}\n----------`);
    }
}