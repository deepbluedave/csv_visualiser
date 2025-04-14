// --- START OF FILE js/view-manager.js ---

// Keep track of fetched DOM elements and shared state/functions
let domElements = {};
let appState = { parsedData: [], currentConfig: {}, activeTabId: null }; // Default structure
let searchHandler = null; // Variable to store the search function reference

/**
 * Initializes the View Manager with necessary DOM elements, state reference,
 * and a reference to the global search handler function.
 * @param {object} elements Object containing references to key DOM elements.
 * @param {object} state Object containing references to shared state.
 * @param {Function} searchHandlerFunction Reference to the handleGlobalSearch function from app.js.
 */
 function initViewManager(elements, state, searchHandlerFunction) {
    domElements = elements;
    appState = state; // Get reference to shared state object
    searchHandler = searchHandlerFunction; // Store the function reference
    if (typeof searchHandler !== 'function') {
        console.warn("initViewManager: Provided searchHandlerFunction is not a function.");
        searchHandler = null; // Ensure it's null if invalid
    }
}

/**
 * Generates tab buttons and view content containers based on config.
 * @param {Array} tabsConfig Array of tab configuration objects from global config.
 */
function generateTabsAndContainers(tabsConfig = []) {
    const { tabControls, viewContentContainer } = domElements;
    if (!tabControls || !viewContentContainer) {
        console.error("generateTabsAndContainers: Tab controls or view content container not found.");
        return;
    }

    tabControls.innerHTML = ''; // Clear existing buttons
    viewContentContainer.innerHTML = ''; // Clear existing content

    tabsConfig.forEach(tab => {
        if (tab.enabled === false) return; // Skip disabled tabs

        // Create Tab Button
        const button = document.createElement('button');
        button.className = 'tab-button';
        button.setAttribute('data-tab-id', tab.id);
        button.textContent = tab.title || tab.id;

        // Apply custom colors using CSS variables
        if (tab.bgColor) {
            button.style.setProperty('--cdg-tab-bg-color', tab.bgColor);
        }
        if (tab.textColor) {
            button.style.setProperty('--cdg-tab-text-color', tab.textColor);
        }

        tabControls.appendChild(button);

        // Create View Content Container
        const container = document.createElement('div');
        container.id = `tab-content-${tab.id}`;
        container.className = 'view-container';
        container.setAttribute('data-view-type', tab.type);
        container.style.display = 'none'; // Hide initially

        const placeholder = document.createElement('div');
        placeholder.className = 'message-placeholder';
        placeholder.textContent = 'Initializing...';
        container.appendChild(placeholder);

        viewContentContainer.appendChild(container);
    });
}


/**
 * Shows the specified tab's content view and hides others. Updates tab button states.
 * Manages content/message visibility and resets global search.
 * @param {string} tabId The ID of the tab to show (e.g., 'all-tasks-table').
 */
 function showView(tabId) {
    // Now includes globalSearchInput from domElements passed in initViewManager
    const { tabControls, viewContentContainer, globalSearchInput } = domElements;
    console.log(`showView attempting to activate tabId: ${tabId}`);
    appState.activeTabId = tabId; // Update shared state tracker

    if (!viewContentContainer || !tabControls) {
         console.error("showView: View content container or tab controls not found.");
         return;
    }

    // --- Hide all view containers first ---
    const viewContainers = viewContentContainer.querySelectorAll('.view-container');
    viewContainers.forEach(c => {
        if (c) {
            c.classList.remove('active');
            c.style.display = 'none';
        }
    });

    // --- Determine which container to show ---
    const activeContainer = document.getElementById(`tab-content-${tabId}`);
    // Access config through shared state
    const tabConfig = appState.currentConfig.tabs?.find(t => t.id === tabId);

    // Debugging logs
    // console.log(`showView - Found container for ${tabId}:`, activeContainer);
    // console.log(`showView - Found config for ${tabId}:`, tabConfig ? 'Yes' : 'No', tabConfig);

    if (activeContainer && tabConfig) {
        // console.log(`showView - Entering IF block for tabId: ${tabId}`); // Keep for debugging if needed

        activeContainer.classList.add('active');
        // Set display type based on view TYPE (matches CSS)
        let displayType = 'block'; // Default
        if (tabConfig.type === 'kanban' || tabConfig.type === 'counts') {
            displayType = 'grid';
        } else if (tabConfig.type === 'summary') {
            displayType = 'flex'; // Summary container is flex column
        } else if (tabConfig.type === 'graph') {
            displayType = 'block'; // Graph container is typically block
        }
        activeContainer.style.display = displayType;

        // --- Reset search state using the stored function reference ---
        if (searchHandler) {
             if(domElements.globalSearchInput) { // Check if element exists in shared domElements
                 domElements.globalSearchInput.value = '';
             }
            searchHandler(''); // Trigger search with empty term to show all in the new view
        } else {
            console.warn("showView: searchHandler function reference is missing. Cannot reset search.");
        }
        // --- End search reset ---

        // console.log(`showView successfully activated tab: ${tabId}`); // Keep for debugging if needed

    } else {
        // If container OR config was NOT found, THEN show warning and fallback
        console.warn(`showView: Container or config for tabId '${tabId}' not found.`);
        const firstEnabledTab = appState.currentConfig.tabs?.find(t => t.enabled !== false);
        if (firstEnabledTab && firstEnabledTab.id !== tabId) {
            console.log(`Falling back to first enabled tab: ${firstEnabledTab.id}`);
            showView(firstEnabledTab.id); // Recursive call with fallback
        } else {
             showMessage(`View '${tabId}' not found or is disabled.`, null); // Show generic message
        }
        return; // Exit early as the intended view wasn't shown
    }

    // --- Update tab button styling ---
    tabControls.querySelectorAll('.tab-button').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab-id') === tabId);
    });

    // --- Update message visibility ---
    // Access parsedData through shared state
    const hasData = appState.parsedData && appState.parsedData.length > 0;
    const activeContentDiv = activeContainer.querySelector(':not(.message-placeholder)');

    if (!hasData) {
        showMessageOnLoad(tabId); // Show "Upload CSV" message in the active tab
    } else if (!activeContentDiv) {
        // Data exists, but this specific tab's container has no rendered content (likely an error)
        // The error message should already be visible via showMessage.
    } else {
        // Data exists AND content exists: Hide the message placeholder in this tab.
        hideMessages(tabId);
    }
}

/**
 * Clears data display areas in ALL dynamically generated tab views.
 * @param {boolean} [keepPlaceholders=false] If true, keeps message placeholders visible.
 */
 function clearAllViews(keepPlaceholders = false) {
    console.log("Clearing all tab views content...");
    const { viewContentContainer, iconKeyContainer } = domElements;
    if (!viewContentContainer) return;

    const viewContainers = viewContentContainer.querySelectorAll('.view-container');
    viewContainers.forEach(container => {
        const placeholder = container.querySelector('.message-placeholder');
        // Clear all children EXCEPT the placeholder
        let child = container.firstChild;
        while (child) {
            const nextChild = child.nextSibling; // Store next sibling before removing current
            if (child !== placeholder) {
                container.removeChild(child);
            }
            child = nextChild;
        }
         // If placeholder exists and we should NOT keep placeholders, hide it
        if (placeholder && !keepPlaceholders) {
             placeholder.classList.remove('visible');
        }
        // If placeholder DOESN'T exist, add a default one
        if (!placeholder) {
             const newPlaceholder = document.createElement('div');
             newPlaceholder.className = 'message-placeholder';
             newPlaceholder.textContent = 'Initializing...';
             container.appendChild(newPlaceholder); // Append (order doesn't strictly matter now)
             if (!keepPlaceholders) newPlaceholder.classList.remove('visible');
        } else if (placeholder && keepPlaceholders) {
            // Ensure placeholder is visible if kept
            placeholder.classList.add('visible');
            placeholder.textContent = 'Upload CSV File or Fetching Data...'; // Set appropriate message
        }
    });

    if(iconKeyContainer) iconKeyContainer.style.display = 'none'; // Hide icon key
}

/**
 * Creates or updates the message placeholder in a specific tab's content area.
 * Internal helper function.
 * @param {string} tabId The ID of the target tab.
 * @param {string} [message="Upload CSV File"] The message to display.
 * @param {boolean} [makeVisible=true] Whether the placeholder should be visible.
 */
 function setMessagePlaceholder(tabId, message = "Upload CSV File", makeVisible = true) {
    const container = document.getElementById(`tab-content-${tabId}`);
    if (!container) {
        // console.warn(`setMessagePlaceholder: Container for tab ${tabId} not found.`); // Can be noisy during init
        return;
    }
    let placeholder = container.querySelector('.message-placeholder');
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'message-placeholder';
        // Insert placeholder - append is fine as other content is removed/hidden
        container.appendChild(placeholder);
    }
    placeholder.textContent = message;
    placeholder.classList.toggle('visible', makeVisible);
 }


/**
 * Shows the initial "Upload CSV File" or "Loading..." message in the specified tab's placeholder.
 * If no tabId is provided, attempts to show in the currently active tab.
 * @param {string|null} tabId The ID of the tab or null for active tab.
 * @param {string} [message="Upload CSV File"] The message to display.
 */
  function showMessageOnLoad(tabId = null, message = "Upload CSV File") {
    const targetTabId = tabId ?? appState.activeTabId;
    if (!targetTabId) {
         // console.warn("showMessageOnLoad: Cannot show message - no targetTabId available.");
         return;
    }

    // Ensure ONLY the target tab's message is visible initially
    appState.currentConfig.tabs?.forEach(tab => {
        if (tab.enabled !== false && tab.id !== targetTabId) {
            setMessagePlaceholder(tab.id, '', false); // Hide message in other tabs
        }
    });
    // Show message in the target tab
    setMessagePlaceholder(targetTabId, message, true);
}


/**
 * Displays a message in a specific tab's placeholder. Hides other content in that tab.
 * @param {string} messageText The message to display.
 * @param {string|null} targetTabId The ID of the target tab, or null to use the active tab.
 */
 function showMessage(messageText, targetTabId = null) {
     const idToShow = targetTabId ?? appState.activeTabId;
     if (!idToShow) {
          console.warn("showMessage: Cannot show message - no targetTabId provided and no activeTabId set.");
          if (typeof alert !== 'undefined') alert(`Message: ${messageText}`);
          return;
     }

     const container = document.getElementById(`tab-content-${idToShow}`);
     if (!container) {
          console.warn(`showMessage: Container for tab ${idToShow} not found.`);
          if (typeof alert !== 'undefined') alert(`Message (Tab ${idToShow}): ${messageText}`);
          return;
     }

     // Hide all direct children except the placeholder itself
     Array.from(container.children).forEach(child => {
         if (!child.classList.contains('message-placeholder')) {
             child.style.display = 'none';
         }
     });
     // Ensure placeholder exists and display message
     setMessagePlaceholder(idToShow, messageText, true);
 }

 /**
  * Hides the message placeholder in a specific tab.
  * @param {string|null} targetTabId The ID of the target tab, or null for the active tab.
  */
  function hideMessages(targetTabId = null) {
     const idToHide = targetTabId ?? appState.activeTabId;
      if (!idToHide) {
          return;
      }
      setMessagePlaceholder(idToHide, '', false); // Hide by setting makeVisible to false
 }


/**
 * Renders an icon key based on icon indicators defined in GLOBAL 'indicatorStyles'
 * AND adds a generic entry for configured GLOBAL link columns.
 * @param {object} config The GLOBAL application configuration object.
 */
 function renderIconKey(config) {
    const { iconKeyContainer } = domElements; // Use global container element
    if (!iconKeyContainer) { return; }
    if (!config) { iconKeyContainer.innerHTML = ''; iconKeyContainer.style.display = 'none'; return; }

    const iconEntries = [];
    const processedKeys = new Set();

    // Process indicatorStyles (Global)
    if (config.indicatorStyles) {
        for (const columnName in config.indicatorStyles) {
            const styleConfig = config.indicatorStyles[columnName];
            if (styleConfig?.type === 'icon') {
                // trueCondition
                if (styleConfig.trueCondition?.value) {
                    const entry = { icon: styleConfig.trueCondition.value, title: styleConfig.trueCondition.title || `${columnName} is True`, cssClass: styleConfig.trueCondition.cssClass || '' };
                    const key = `${entry.icon}|${entry.title}`;
                    if (!processedKeys.has(key)) { iconEntries.push(entry); processedKeys.add(key); }
                }
                // valueMap
                if (styleConfig.valueMap) {
                    for (const valueKey in styleConfig.valueMap) {
                         if (valueKey === 'default') continue;
                         const mapping = styleConfig.valueMap[valueKey];
                         if (mapping?.value) {
                            const entry = { icon: mapping.value, title: mapping.title || `${columnName}: ${valueKey}`, cssClass: mapping.cssClass || '' };
                            const key = `${entry.icon}|${entry.title}`;
                            if (!processedKeys.has(key)) { iconEntries.push(entry); processedKeys.add(key); }
                         }
                    }
                     // 'default'
                    if (styleConfig.valueMap.default?.value) {
                        const defaultMapping = styleConfig.valueMap.default;
                        const entry = { icon: defaultMapping.value, title: defaultMapping.title || `${columnName}: Default`, cssClass: defaultMapping.cssClass || '' };
                        const key = `${entry.icon}|${entry.title}`;
                        if (!processedKeys.has(key)) { iconEntries.push(entry); processedKeys.add(key); }
                    }
                }
            }
        }
    }

    // Add Link Icon Entry (Global)
    const linkColumns = config.generalSettings?.linkColumns || [];
    if (linkColumns.length > 0) {
        const linkKeyEntry = { icon: '🔗', title: 'Link to URL', cssClass: 'icon-key-link' }; // Changed to actual emoji
        const key = `${linkKeyEntry.icon}|${linkKeyEntry.title}`;
        if (!processedKeys.has(key)) {
            iconEntries.push(linkKeyEntry);
            processedKeys.add(key);
        }
    }

    // Sort and Render
    iconEntries.sort((a, b) => a.title.localeCompare(b.title));

    if (iconEntries.length > 0) {
        let keyHTML = '<h4>Icon Key:</h4><ul>';
        iconEntries.forEach(entry => {
            keyHTML += `<li><span class="csv-dashboard-icon ${entry.cssClass || ''}" title="${entry.title}">${entry.icon}</span> = ${entry.title}</li>`;
        });
        keyHTML += '</ul>';
        iconKeyContainer.innerHTML = keyHTML;
        iconKeyContainer.style.display = 'block'; // Use block or flex depending on desired layout
    } else {
        iconKeyContainer.innerHTML = '';
        iconKeyContainer.style.display = 'none';
    }
}

// --- END OF FILE js/view-manager.js ---