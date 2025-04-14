// --- START OF FILE js/app.js ---

// --- Wait for DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // --- Get STATIC DOM Elements ---
    const fileInput = document.getElementById('cdg-csvFileInput');
    const uploadContainer = document.getElementById('cdg-uploadContainer');
    const tabControls = document.getElementById('cdg-tabControls'); // Container for dynamic buttons
    const viewContentContainer = document.getElementById('cdg-viewContentContainer'); // Container for dynamic views
    const mainHeading = document.querySelector('h1');
    const iconKeyContainer = document.getElementById('cdg-iconKeyContainer'); // Keep global icon key
    const globalSearchInput = document.getElementById('cdg-globalSearchInput');

    // Check if essential containers were found
    if (!fileInput || !tabControls || !viewContentContainer || !mainHeading || !globalSearchInput) {
        console.error("Essential DOM elements missing (controls/containers). Dashboard cannot initialize.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Critical Error: Required HTML structure is missing. Cannot load dashboard.</h1>';
        return;
    }

    // Collect static DOM elements for View Manager
    const domElements = {
        fileInput, uploadContainer, tabControls, viewContentContainer,
        mainHeading, iconKeyContainer , globalSearchInput
    };


    // --- State ---
    // Access defaultConfig from config.js (loaded globally)
    let currentConfig = JSON.parse(JSON.stringify(defaultConfig));
    let parsedData = []; // Holds the full dataset
    let activeTabId = null; // Track the ID of the currently visible tab

    // --- State Object for View Manager & Renderers ---
    const appState = {
        get parsedData() { return parsedData; },
        get currentConfig() { return currentConfig; },
        get activeTabId() { return activeTabId; },
        set activeTabId(id) { activeTabId = id; }
    };

    // --- Initialization ---
    initViewManager(domElements, appState); // Pass static elements & state ref
    initializeDashboard();

    // --- Debounce Timer ---
    let searchDebounceTimer;

    // --- Event Listeners ---
    if (fileInput) fileInput.addEventListener('change', handleFileSelectEvent);
    if (tabControls) tabControls.addEventListener('click', handleTabClick);

    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                handleGlobalSearch(globalSearchInput.value);
            }, 300); // 300ms debounce delay
        });
   }

    // --- Core Application Functions ---

    /**
     * Initializes the dashboard: applies config, generates tabs, attempts URL load or enables upload.
     */
    function initializeDashboard() {
        console.log("Initializing Dashboard...");
        applyCustomTitle(currentConfig, mainHeading);
        applyConfigStyles(currentConfig); // Apply global dynamic styles initially
        renderIconKey(currentConfig);     // Render global icon key

        // --- Dynamically create Tabs and View Containers ---
        generateTabsAndContainers(currentConfig.tabs); // Use imported function

        // --- Determine Default Tab ---
        const firstEnabledTab = currentConfig.tabs?.find(tab => tab.enabled !== false);
        if (firstEnabledTab) {
            appState.activeTabId = firstEnabledTab.id; // Set initial active tab ID
            console.log(`Default active tab set to: ${appState.activeTabId}`);
        } else {
            console.warn("No enabled tabs found in configuration.");
             if(tabControls) tabControls.innerHTML = '<p style="color: red; padding: 10px;">Error: No enabled tabs configured.</p>';
             if(viewContentContainer) viewContentContainer.innerHTML = ''; // Clear content area too
            return; // Stop initialization if no tabs
        }

        // --- Load Data ---
        const csvUrl = currentConfig.generalSettings?.csvUrl?.trim();
        if (csvUrl) {
            console.log(`Configuration specifies CSV URL: ${csvUrl}`);
            updateUiForLoadMode('url');
            showMessageOnLoad(appState.activeTabId, 'Loading data from URL...'); // Show loading in default tab
            loadAndProcessData(() => loadDataFromUrl(csvUrl));
        } else {
            console.log("No CSV URL configured. Enabling file upload.");
            updateUiForLoadMode('file');
            showMessageOnLoad(appState.activeTabId); // Show "Upload CSV" in default tab
            showView(appState.activeTabId); // Ensure the default tab view structure is displayed correctly initially
        }
    }


    /**
     * Central function to trigger data loading, parse, filter, and render tabs.
     * @param {Function} loadFunction Async function returning CSV content string.
     */
    async function loadAndProcessData(loadFunction) {
        clearAllViews(true); // Clear previous view content, keep placeholders
        showMessageOnLoad(appState.activeTabId, "Processing data..."); // Show in active tab

        try {
            // 1. Load Data
            const csvContent = await loadFunction();
            console.log("loadAndProcessData: CSV content loaded.");

            // 2. Parse Data (Updates global config with headers)
            const { data, headers } = parseCSV(csvContent, currentConfig);
            parsedData = data; // Update global state
            currentConfig.csvHeaders = headers; // Update global config state

            console.log(`loadAndProcessData: CSV parsed. Headers: ${headers.length}, Rows: ${parsedData.length}.`);

            // 3. Render All Tabs
            if (parsedData.length > 0 || headers.length > 0) {
                console.log("loadAndProcessData: Rendering all configured tabs...");
                renderAllTabs(); // Render content for each tab based on its config and filters
                renderIconKey(currentConfig); // Re-render icon key
                console.log("loadAndProcessData: Tab rendering complete.");
            } else {
                console.warn("loadAndProcessData: CSV parsed but resulted in 0 data rows and 0 headers.");
                const parseFailMsg = `CSV empty or data could not be extracted. Check delimiter ("${currentConfig.generalSettings?.csvDelimiter || ','}") and file/URL content.`;
                // Show error message in all tab placeholders
                currentConfig.tabs?.forEach(tab => {
                    if (tab.enabled !== false) showMessage(parseFailMsg, tab.id);
                });
                clearAllViews(true); // Ensure views are clear but placeholders show message
            }

        } catch (error) {
             console.error("ERROR during data loading or processing:", error);
             parsedData = []; // Reset data
             currentConfig.csvHeaders = [];
             const errorMsg = `Error: ${error.message}. Check console (F12) and verify CSV/config.`;
             // Show error in all tab placeholders
             currentConfig.tabs?.forEach(tab => {
                 if (tab.enabled !== false) showMessage(errorMsg, tab.id);
             });
             clearAllViews(true); // Keep placeholders visible with error
             if (typeof alert !== 'undefined') alert(errorMsg); // Also alert user

        } finally {
             // Ensure the correct default/active view is visible after processing
             const targetTab = appState.activeTabId || currentConfig.tabs?.find(t => t.enabled !== false)?.id;
             if (targetTab) {
                showView(targetTab);
             }
             if (fileInput) fileInput.value = ''; // Reset file input
        }
    }

    /**
     * Iterates through configured tabs, applies filters, and calls the appropriate renderer.
     */
    function renderAllTabs() {
        if (!currentConfig.tabs) {
            console.error("renderAllTabs: No tabs defined in configuration.");
            return;
        }

        currentConfig.tabs.forEach(tabConfig => {
            if (tabConfig.enabled === false) return; // Skip disabled tabs

            const targetElement = document.getElementById(`tab-content-${tabConfig.id}`);
            if (!targetElement) {
                console.warn(`renderAllTabs: Target element for tab ${tabConfig.id} not found.`);
                return;
            }

            try {
                 // 1. Filter Data for this specific tab
                 const filteredData = applyTabFilter(parsedData, tabConfig.filter, currentConfig);
                 console.log(`Tab "${tabConfig.title}" (${tabConfig.id}): ${filteredData.length} rows after filtering.`);

                 // 2. Basic Config Validation
                 let configValid = true;
                 let errorMsg = '';
                 if (!currentConfig.csvHeaders || currentConfig.csvHeaders.length === 0 && parsedData.length > 0) {
                      configValid = false; errorMsg = 'CSV Headers not available for validation.'
                 } else {
                     if (tabConfig.type === 'kanban' && (!tabConfig.config?.groupByColumn || !currentConfig.csvHeaders.includes(tabConfig.config.groupByColumn))) {
                         configValid = false; errorMsg = `Kanban 'groupByColumn' ("${tabConfig.config?.groupByColumn || ''}") is missing or invalid.`;
                     }
                     if (tabConfig.type === 'counts' && (!tabConfig.config?.groupByColumn || !currentConfig.csvHeaders.includes(tabConfig.config.groupByColumn))) {
                         configValid = false; errorMsg = `Counts 'groupByColumn' ("${tabConfig.config?.groupByColumn || ''}") is missing or invalid.`;
                     }
                     // Add more validation checks as needed for other types/configs
                 }


                 if (!configValid) {
                     throw new Error(`Invalid configuration: ${errorMsg}`);
                 }

                 // 3. Call the correct renderer
                 switch (tabConfig.type) {
                    case 'table':
                        renderTable(filteredData, tabConfig, currentConfig, targetElement, showMessage);
                        break;
                    case 'kanban':
                        renderKanban(filteredData, tabConfig, currentConfig, targetElement, showMessage);
                        break;
                    case 'summary':
                        renderSummaryView(filteredData, tabConfig, currentConfig, targetElement, showMessage);
                        break;
                    case 'counts':
                        renderCountsView(filteredData, tabConfig, currentConfig, targetElement, showMessage);
                        break;
                    // *** NEW CASE ***
                    case 'graph':
                        renderGraph(filteredData, tabConfig, currentConfig, targetElement, showMessage);
                        break;
                    // *** END NEW CASE ***                        
                    default:
                        console.warn(`renderAllTabs: Unknown tab type "${tabConfig.type}" for tab "${tabConfig.title}".`);
                        showMessage(`Unknown view type configured: "${tabConfig.type}"`, tabConfig.id);
                }
            } catch (renderError) {
                 console.error(`Error rendering tab "${tabConfig.title}" (${tabConfig.id}):`, renderError);
                 showMessage(`Error rendering tab: ${renderError.message}`, tabConfig.id);
            }
        });
         // After rendering, ensure styles reflecting config (like column widths) are applied
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

        // Reset config might not be needed if structure is stable, but can be done
        // currentConfig = JSON.parse(JSON.stringify(defaultConfig));
        // applyConfigStyles(currentConfig); // Re-apply styles if config reset

        showMessageOnLoad(appState.activeTabId, `Reading file: ${file.name}...`);
        loadAndProcessData(() => readFileContent(file));
    }

    /**
     * Handles clicks on the dynamically generated tab buttons.
     * @param {Event} event The click event.
     */
    function handleTabClick(event) {
         const button = event.target.closest('.tab-button'); // Find the button element  
         if (button) {
             const tabId = button.getAttribute('data-tab-id');
             if (tabId && tabId !== appState.activeTabId) {
                 console.log(`Switching view to tab: ${tabId}`);
                 // appState.activeTabId = tabId; // Let showView update the state

                 if (globalSearchInput) {
                    globalSearchInput.value = ''; // Clear the input field
                 }

                 showView(tabId); // Show the new view (updates activeTabId internally)
                 // Optionally re-apply styles if they depend heavily on active state
                 // applyConfigStyles(currentConfig);
             }
         }
     }

    // *** NEW: Search Handler Function ***
    /**
     * Filters the currently visible elements based on the search term.
     * @param {string} searchTerm The text to search for.
     */
    function handleGlobalSearch(searchTerm) {
        const term = searchTerm.trim().toLowerCase();
        console.log(`Performing search for: "${term}" on tab: ${appState.activeTabId}`);

        if (!appState.activeTabId) return; // Should not happen if initialized correctly

        const activeContainer = document.getElementById(`tab-content-${appState.activeTabId}`);
        if (!activeContainer) return;

        const tabConfig = appState.currentConfig.tabs?.find(t => t.id === appState.activeTabId);
        if (!tabConfig) return;

        const searchableTypes = ['table', 'kanban', 'summary'];
        if (!searchableTypes.includes(tabConfig.type)) {
            console.log(`Search skipped: Tab type "${tabConfig.type}" is not searchable.`);
            // Optionally disable the search input visually here
            return;
        }

        let targetElementsSelector;
        switch (tabConfig.type) {
            case 'table':
                targetElementsSelector = 'tbody tr'; // Keep targeting table rows
                break;
            case 'kanban':
                targetElementsSelector = '.kanban-group-block'; // Target the whole group block
                break;
            case 'summary':
                // Target the group block *within* the summary section grid/list
                // Note: This assumes renderGroupedItemsAsGrid was used.
                // If no grouping is used in summary, this might need adjustment,
                // but typically summary benefits from grouping.
                targetElementsSelector = '.summary-group-block';
                break;
            default:
                return;
        }

        const elementsToSearch = activeContainer.querySelectorAll(targetElementsSelector);
        let visibleCount = 0;

        let searchRegex = null;
        let isPlainTextSearch = false;

        // Don't try regex for empty strings
        if (term !== '') {
            try {
                // Create a case-insensitive regex
                searchRegex = new RegExp(term, 'i');
                console.log("Search mode: Regex");
            } catch (e) {
                // Invalid Regex syntax - fall back to plain text search
                console.warn(`Invalid regex pattern "${term}". Falling back to plain text search. Error: ${e.message}`);
                isPlainTextSearch = true;
                // Lowercase the term *now* for plain text search
                const termLower = term.toLowerCase();
                console.log("Search mode: Plain Text (due to invalid regex)");
            }
        } else {
        // Empty search term means plain text mode (show all)
            isPlainTextSearch = true;
                console.log("Search mode: Plain Text (empty term)");
        }

        elementsToSearch.forEach(element => {
            const elementText = element.textContent || ''; // No need to lowercase text content for regex 'i' flag
            let isMatch = false;

            // --- *** UPDATED: Matching Logic *** ---
            if (term === '') {
                // Empty search always matches (shows all)
                isMatch = true;
            } else if (searchRegex && !isPlainTextSearch) {
                // Valid regex exists, use it
                isMatch = searchRegex.test(elementText);
            } else {
                // Plain text search (either fallback or empty term)
                 // Lowercase element text only for plain text search
                isMatch = elementText.toLowerCase().includes(term.toLowerCase());
            }
             // --- *** END UPDATED *** ---

            element.classList.toggle('cdg-search-hidden', !isMatch);

            if (isMatch) {
                visibleCount++;
            }
        });

        console.log(`Search complete. ${visibleCount} groups/rows visible.`);
        // Optional: Update a status message showing search results count
        // Optional: Add logic here to hide empty Kanban/Summary groups if needed
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