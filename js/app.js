// --- START OF FILE js/app.js ---

// --- Wait for DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // --- Get STATIC DOM Elements ---
    const fileInput = document.getElementById('cdg-csvFileInput');
    const uploadContainer = document.getElementById('cdg-uploadContainer');
    const tabControls = document.getElementById('cdg-tabControls');
    const viewContentContainer = document.getElementById('cdg-viewContentContainer');
    const mainHeading = document.querySelector('h1');
    const iconKeyContainer = document.getElementById('cdg-iconKeyContainer');
    const globalSearchInput = document.getElementById('cdg-globalSearchInput');
    const exportButton = document.getElementById('cdg-exportButton');


    // Check if essential containers were found
    if (!fileInput || !tabControls || !viewContentContainer || !mainHeading || !globalSearchInput || !exportButton) {
        console.error("Essential DOM elements missing (controls/containers/search). Dashboard cannot initialize.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Critical Error: Required HTML structure is missing. Cannot load dashboard.</h1>';
        return;
    }

    // Collect static DOM elements to pass around
    const domElements = {
        fileInput, uploadContainer, tabControls, viewContentContainer,
        mainHeading, iconKeyContainer, globalSearchInput, exportButton  // Pass search input
    };


    // --- State ---
    let currentConfig = JSON.parse(JSON.stringify(defaultConfig));
    let parsedData = [];
    let activeTabId = null;

    // --- State Object (Reference passed to other modules) ---
    const appState = {
        get parsedData() { return parsedData; },
        get currentConfig() { return currentConfig; },
        get activeTabId() { return activeTabId; },
        set activeTabId(id) { activeTabId = id; }
    };

    // --- Debounce Timer ---
    let searchDebounceTimer;

    // --- Search Handler Definition ---
    /**
     * Filters the currently visible elements based on the search term.
     * Attempts to use the search term as a case-insensitive regular expression.
     * Falls back to plain text substring search if the regex is invalid.
     * Targets table rows, or entire group blocks in Kanban/Summary views.
     * @param {string} searchTerm The text or regex pattern to search for.
     */
    function handleGlobalSearch(searchTerm) {
        const term = searchTerm.trim(); // Don't lowercase yet for regex
        // console.log(`Performing search for: "${term}" on tab: ${appState.activeTabId}`); // Debug logging

        if (!appState.activeTabId) return;

        const activeContainer = document.getElementById(`tab-content-${appState.activeTabId}`);
        if (!activeContainer) return;

        const tabConfig = appState.currentConfig.tabs?.find(t => t.id === appState.activeTabId);
        if (!tabConfig) return;

        const searchableTypes = ['table', 'kanban', 'summary'];
        if (!searchableTypes.includes(tabConfig.type)) {
            // console.log(`Search skipped: Tab type "${tabConfig.type}" is not searchable.`);
            return;
        }

        let targetElementsSelector;
        switch (tabConfig.type) {
            case 'table': targetElementsSelector = 'tbody tr'; break;
            case 'kanban': targetElementsSelector = '.kanban-group-block'; break;
            case 'summary': targetElementsSelector = '.summary-group-block'; break;
            default: return;
        }

        const elementsToSearch = activeContainer.querySelectorAll(targetElementsSelector);
        let visibleCount = 0;

        // Regex Handling Logic
        let searchRegex = null;
        let isPlainTextSearch = false;
        let termLower = ''; // Keep lowercase version for plain text

        if (term !== '') {
            try {
                searchRegex = new RegExp(term, 'i');
                // console.log("Search mode: Regex"); // Debug
            } catch (e) {
                console.warn(`Invalid regex pattern "${term}". Falling back to plain text search. Error: ${e.message}`);
                isPlainTextSearch = true;
                termLower = term.toLowerCase(); // Lowercase now for plain search
                // console.log("Search mode: Plain Text (due to invalid regex)"); // Debug
            }
        } else {
            isPlainTextSearch = true;
            // console.log("Search mode: Plain Text (empty term)"); // Debug
        }

        // Apply filtering
        elementsToSearch.forEach(element => {
            const elementText = element.textContent || '';
            let isMatch = false;

            if (term === '') {
                isMatch = true; // Empty search shows all
            } else if (searchRegex && !isPlainTextSearch) {
                isMatch = searchRegex.test(elementText); // Regex test (case-insensitive flag 'i')
            } else {
                // Plain text fallback or empty search
                isMatch = elementText.toLowerCase().includes(termLower); // Case-insensitive plain text search
            }

            element.classList.toggle('cdg-search-hidden', !isMatch);

            if (isMatch) {
                visibleCount++;
            }
        });

        // console.log(`Search complete. ${visibleCount} groups/rows visible.`); // Debug
    }
    // --- End Search Handler Definition ---


    // --- Initialization ---
    // Pass dependencies to View Manager
    initViewManager(domElements, appState, handleGlobalSearch);
    initializeDashboard(); // Calls view manager functions


    // --- Event Listeners ---
    if (fileInput) fileInput.addEventListener('change', handleFileSelectEvent);
    if (tabControls) tabControls.addEventListener('click', handleTabClick);
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                handleGlobalSearch(globalSearchInput.value); // Calls the function defined above
            }, 300); // 300ms debounce delay
        });
    }
    if (exportButton) exportButton.addEventListener('click', handleExportClick);

    // --- Core Application Functions ---

    /**
     * Initializes the dashboard: applies config, generates tabs, attempts URL load or enables upload.
     */
    function initializeDashboard() {
        console.log("Initializing Dashboard...");
        applyCustomTitle(currentConfig, mainHeading);
        applyConfigStyles(currentConfig);
        renderIconKey(currentConfig);

        generateTabsAndContainers(currentConfig.tabs); // Creates tab buttons and view divs

        const firstEnabledTab = currentConfig.tabs?.find(tab => tab.enabled !== false);
        if (firstEnabledTab) {
            appState.activeTabId = firstEnabledTab.id;
            console.log(`Default active tab set to: ${appState.activeTabId}`);
        } else {
            console.warn("No enabled tabs found in configuration.");
            if (tabControls) tabControls.innerHTML = '<p style="color: red; padding: 10px;">Error: No enabled tabs configured.</p>';
            if (viewContentContainer) viewContentContainer.innerHTML = '';
            return;
        }

        const csvUrl = currentConfig.generalSettings?.csvUrl?.trim();
        if (csvUrl) {
            console.log(`Configuration specifies CSV URL: ${csvUrl}`);
            updateUiForLoadMode('url');
            showMessageOnLoad(appState.activeTabId, 'Loading data from URL...');
            loadAndProcessData(() => loadDataFromUrl(csvUrl));
        } else {
            console.log("No CSV URL configured. Enabling file upload.");
            updateUiForLoadMode('file');
            showMessageOnLoad(appState.activeTabId); // Show "Upload CSV" in default tab
            // No need to call showView here, messageOnLoad handles initial state
        }
    }


    /**
     * Central function to trigger data loading, parse, filter, and render tabs.
     * @param {Function} loadFunction Async function returning CSV content string.
     */
    async function loadAndProcessData(loadFunction) {
        clearAllViews(true); // Clear views, keep placeholders visible with a message
        showMessageOnLoad(appState.activeTabId, "Processing data...");

        try {
            // 1. Load Data
            const csvContent = await loadFunction();
            console.log("loadAndProcessData: CSV content loaded.");

            // 2. Parse Data
            const { data, headers } = parseCSV(csvContent, currentConfig);
            parsedData = data;
            currentConfig.csvHeaders = headers;
            console.log(`loadAndProcessData: CSV parsed. Headers: ${headers.length}, Rows: ${parsedData.length}.`);

            // 3. Render All Tabs
            if (parsedData.length > 0 || headers.length > 0) {
                console.log("loadAndProcessData: Rendering all configured tabs...");
                renderAllTabs(); // This populates content in hidden divs
                renderIconKey(currentConfig);
                console.log("loadAndProcessData: Tab rendering complete.");
            } else {
                console.warn("loadAndProcessData: CSV parsed but resulted in 0 data rows.");
                const parseFailMsg = `CSV empty or data could not be extracted. Check delimiter ("${currentConfig.generalSettings?.csvDelimiter || ','}") and file/URL content.`;
                currentConfig.tabs?.forEach(tab => {
                    if (tab.enabled !== false) showMessage(parseFailMsg, tab.id);
                });
                clearAllViews(true); // Ensure views are clear, placeholders show message
            }

        } catch (error) {
            // --- THIS IS THE BLOCK TO MODIFY ---
            console.error("ERROR during data loading or processing:", error);
            parsedData = [];
            currentConfig.csvHeaders = [];

            // --- START MODIFICATION ---

            // Check if the error likely came from a URL load attempt
            // (We know loadFunction is loadDataFromUrl if config.generalSettings.csvUrl was set)
            const wasUrlLoadAttempt = !!currentConfig.generalSettings?.csvUrl;

            if (wasUrlLoadAttempt) {
                // Specific handling for URL load failure: Fallback to file upload
                console.log("URL load failed. Falling back to file upload mode.");
                updateUiForLoadMode('file'); // Re-enable the file input UI

                const friendlyErrorMsg = `Failed to load data from URL. Please upload a CSV file instead. (Error: ${error.message})`;
                // Show the user-friendly message only in the *currently active* tab's placeholder
                if (appState.activeTabId) {
                    showMessage(friendlyErrorMsg, appState.activeTabId);
                } else {
                    // Fallback if active tab isn't set (less likely here, but safe)
                    currentConfig.tabs?.forEach(tab => {
                        if (tab.enabled !== false) showMessage(friendlyErrorMsg, tab.id);
                    });
                }
                // Clear views but keep placeholders visible for the message
                clearAllViews(true);

            } else {
                // Handling for errors during file upload processing or parsing
                const errorMsg = `Error processing file: ${error.message}. Check console (F12) and verify CSV/config.`;
                currentConfig.tabs?.forEach(tab => {
                    if (tab.enabled !== false) showMessage(errorMsg, tab.id);
                });
                clearAllViews(true);
                if (typeof alert !== 'undefined') alert(errorMsg); // Alert for file processing errors might be okay
            }
            // --- END MODIFICATION ---

        } finally {
            // Ensure the correct default/active view is visible after processing
            // Use the activeTabId already set, or find the first enabled one as fallback
            const targetTab = appState.activeTabId || currentConfig.tabs?.find(t => t.enabled !== false)?.id;
            if (targetTab) {
                showView(targetTab); // Call view-manager's showView to make the active tab visible
            }
            if (fileInput) fileInput.value = ''; // Reset file input regardless of success/failure
        }
    }

    /**
     * Iterates through configured tabs, applies filters, and calls the appropriate renderer.
     * Assumes other JS files (renderers, view-manager, etc.) are loaded.
     */
    function renderAllTabs() {
        if (!currentConfig.tabs) {
            console.error("renderAllTabs: No tabs defined in configuration.");
            return;
        }

        currentConfig.tabs.forEach(tabConfig => {
            if (tabConfig.enabled === false) return;

            const targetElement = document.getElementById(`tab-content-${tabConfig.id}`);
            if (!targetElement) {
                console.warn(`renderAllTabs: Target element for tab ${tabConfig.id} not found.`);
                return;
            }

            try {
                const filteredData = applyTabFilter(parsedData, tabConfig.filter, currentConfig);
                // console.log(`Tab "${tabConfig.title}" (${tabConfig.id}): ${filteredData.length} rows after filtering.`); // Debug

                // Basic Config Validation (Example)
                let configValid = true;
                let errorMsg = '';
                if (!currentConfig.csvHeaders || currentConfig.csvHeaders.length === 0 && parsedData.length > 0) {
                    // Allow rendering if headers are empty but data might be too (e.g. graph from non-tabular source?)
                    // configValid = false; errorMsg = 'CSV Headers not available for validation.'
                } else {
                    // Specific validations
                    if (tabConfig.type === 'kanban' && (!tabConfig.config?.groupByColumn || !currentConfig.csvHeaders.includes(tabConfig.config.groupByColumn))) {
                        configValid = false; errorMsg = `Kanban 'groupByColumn' ("${tabConfig.config?.groupByColumn || ''}") is missing or invalid.`;
                    }
                    if (tabConfig.type === 'counts' && (!tabConfig.config?.groupByColumn || !currentConfig.csvHeaders.includes(tabConfig.config.groupByColumn))) {
                        configValid = false; errorMsg = `Counts 'groupByColumn' ("${tabConfig.config?.groupByColumn || ''}") is missing or invalid.`;
                    }
                    if (tabConfig.type === 'graph' && (!tabConfig.config?.primaryNodeIdColumn || !currentConfig.csvHeaders.includes(tabConfig.config.primaryNodeIdColumn))) {
                        configValid = false; errorMsg = `Graph 'primaryNodeIdColumn' ("${tabConfig.config?.primaryNodeIdColumn || ''}") is missing or invalid.`;
                    }
                }

                if (!configValid) { throw new Error(`Invalid configuration: ${errorMsg}`); }

                // Call the correct renderer based on type
                switch (tabConfig.type) {
                    case 'table': renderTable(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    case 'kanban': renderKanban(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    case 'summary': renderSummaryView(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    case 'counts': renderCountsView(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    case 'graph': renderGraph(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    default:
                        console.warn(`renderAllTabs: Unknown tab type "${tabConfig.type}" for tab "${tabConfig.title}".`);
                        showMessage(`Unknown view type configured: "${tabConfig.type}"`, tabConfig.id);
                }
            } catch (renderError) {
                console.error(`Error rendering tab "${tabConfig.title}" (${tabConfig.id}):`, renderError);
                showMessage(`Error rendering tab: ${renderError.message}`, tabConfig.id);
                // Ensure targetElement is cleared on error to prevent showing partial/broken content
                if (targetElement) targetElement.innerHTML = '';
                setMessagePlaceholder(tabConfig.id, `Error rendering tab: ${renderError.message}`, true); // Show error in placeholder
            }
        });
        // After rendering all tabs, apply dynamic styles based on config
        applyConfigStyles(currentConfig);
    }


    // --- Event Handlers ---

    /**
     * Handles the file selection event.
     * @param {Event} event The file input change event.
     */
    function handleFileSelectEvent(event) {
        console.log("handleFileSelectEvent: File selected.");
        const file = event.target.files[0];
        if (!file) {
            console.log("handleFileSelectEvent: No file selected.");
            return;
        }
        showMessageOnLoad(appState.activeTabId, `Reading file: ${file.name}...`);
        loadAndProcessData(() => readFileContent(file));
    }

    /**
     * Handles clicks on the dynamically generated tab buttons.
     * @param {Event} event The click event.
     */
    function handleTabClick(event) {
        const button = event.target.closest('.tab-button');
        if (button) {
            const tabId = button.getAttribute('data-tab-id');
            if (tabId && tabId !== appState.activeTabId) {
                console.log(`Switching view to tab: ${tabId}`);
                // Clear search input VISUALLY when changing tabs
                if (globalSearchInput) {
                    globalSearchInput.value = '';
                }
                // Show the new view (which will also clear the search filter via handleGlobalSearch(''))
                showView(tabId); // Calls view-manager's showView
            }
        }
    }

    /**
         * Handles the click event for the export button.
         * Determines the active tab, filters/sorts data, generates CSV, and triggers download.
         */
    function handleExportClick() {
        console.log("Export button clicked.");
        if (!appState.activeTabId) {
            console.warn("handleExportClick: No active tab selected.");
            alert("Please select a tab to export.");
            return;
        }
        if (!appState.parsedData || appState.parsedData.length === 0) {
            console.warn("handleExportClick: No data loaded to export.");
            alert("Please load data before exporting.");
            return;
        }

        const tabConfig = appState.currentConfig.tabs?.find(t => t.id === appState.activeTabId);
        if (!tabConfig) {
            console.error(`handleExportClick: Config not found for active tab ${appState.activeTabId}`);
            alert("Error: Could not find configuration for the active tab.");
            return;
        }

        const exportableTypes = ['table', 'kanban', 'summary', 'counts']; // Add 'summary' later if implemented
        if (!exportableTypes.includes(tabConfig.type)) {
            console.log(`Export skipped: Tab type "${tabConfig.type}" is not exportable yet.`);
            alert(`Export is not currently supported for the "${tabConfig.title}" view type.`);
            return;
        }

        // Disable button temporarily to prevent double-clicks
        if (exportButton) exportButton.disabled = true;
        // Optional: Show a loading indicator

        // Use setTimeout to allow UI to update (button disable) before potentially long processing
        setTimeout(() => {
            try {
                console.log(`Exporting tab: ${tabConfig.title} (${tabConfig.id}), Type: ${tabConfig.type}`);

                // 1. Get Data (use current parsed data)
                const fullData = appState.parsedData;

                // 2. Apply Tab Filter
                const filteredData = applyTabFilter(fullData, tabConfig.filter, appState.currentConfig);
                console.log(`Export - ${filteredData.length} rows after filtering.`);

                // 3. Apply Item Sorting (for consistency, even if table renderer has its own sort)
                // Resolve sort config using defaults
                let dataForExport = [...filteredData]; // Start with filtered data

                // Apply item sorting for types that use it visually before grouping/sectioning
                if (['table', 'kanban', 'summary'].includes(tabConfig.type)) {
                    const itemSortConfig = tabConfig.config?.itemSortBy ?? appState.currentConfig.generalSettings?.defaultItemSortBy ?? null;
                    dataForExport = sortData(dataForExport, itemSortConfig, appState.currentConfig); // Sort a copy
                }

                // 4. Generate CSV Content
                let csvContent = '';
                let baseFilename = `dashboard-export-${tabConfig.id}`;

                switch (tabConfig.type) {
                    case 'table':
                        if (typeof generateTableCsv === 'function') {
                            csvContent = generateTableCsv(dataForExport, tabConfig, appState.currentConfig);
                        } else { throw new Error("generateTableCsv function not found."); }
                        break;
                    case 'kanban':
                        if (typeof generateKanbanCsv === 'function') {
                            csvContent = generateKanbanCsv(dataForExport, tabConfig, appState.currentConfig);
                        } else { throw new Error("generateKanbanCsv function not found."); }
                        break;
                    case 'summary':
                        if (typeof generateSummaryCsv === 'function') {
                            csvContent = generateSummaryCsv(dataForExport, tabConfig, appState.currentConfig);
                        } else { throw new Error("generateSummaryCsv function not found."); }
                        break;
                    case 'counts':
                        if (typeof generateCountsCsv === 'function') {
                            // Counts export function handles its own aggregation from filtered data
                            csvContent = generateCountsCsv(filteredData, tabConfig, appState.currentConfig); // Pass originally filtered data
                        } else { throw new Error("generateCountsCsv function not found."); }
                        break;
                    // No default needed as we checked exportableTypes earlier
                }

                // 5. Trigger Download
                if (csvContent) {
                    // Check if triggerCsvDownload exists
                    if (typeof triggerCsvDownload === 'function') {
                        const filename = `${baseFilename}.csv`;
                        triggerCsvDownload(csvContent, filename);
                    } else {
                        throw new Error("triggerCsvDownload function not found.");
                    }
                } else {
                    console.warn("Export generation resulted in empty content.");
                    alert("Could not generate export data for this view. It might be empty after filtering.");
                }

            } catch (error) {
                console.error("Error during export:", error);
                alert(`An error occurred during export: ${error.message}`);
            } finally {
                // Re-enable button and hide loading indicator
                if (exportButton) exportButton.disabled = false;
            }
        }, 10); // Small delay for UI update
    }


    // --- UI Update Functions ---

    /**
     * Updates UI elements based on load mode (URL vs File).
     * @param {'url' | 'file'} mode The loading mode.
     */
    function updateUiForLoadMode(mode) {
        if (!uploadContainer || !fileInput) return;
        const fileLabel = uploadContainer.querySelector('label[for="csvFileInput"]');

        if (mode === 'url') {
            if (fileLabel) fileLabel.style.display = 'none';
            if (fileInput) fileInput.style.display = 'none';
        } else { // mode === 'file'
            if (fileLabel) fileLabel.style.display = '';
            if (fileInput) fileInput.style.display = '';
        }
    }



}); // End of DOMContentLoaded listener
// --- END OF FILE js/app.js ---