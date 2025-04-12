// --- START OF FILE js/renderers/renderer-kanban.js ---

/**
 * Renders data into a Kanban view within the specified target element.
 * Uses configuration specific to the tab.
 * Includes sorting for groups and items within groups.
 * @param {object[]} filteredData The data rows already filtered for this tab.
 * @param {object} tabConfig The configuration object for this specific kanban tab.
 * @param {object} globalConfig The global application configuration.
 * @param {HTMLElement} targetElement The container element for this tab.
 * @param {Function} showMessage Function to display messages.
 */
function renderKanban(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
    if (!targetElement) {
        console.error("renderKanban: Target element not provided.");
        return;
    }
    targetElement.innerHTML = ''; // Clear previous content
    setMessagePlaceholder(tabConfig.id, '', false); // Add hidden placeholder

    // --- Apply layout styles dynamically ---
    const layoutConf = tabConfig.config?.layout;
    if (layoutConf) {
        targetElement.style.setProperty('--kanban-min-col-width', layoutConf.minColumnWidth || '280px');
        targetElement.style.setProperty('--kanban-gap', layoutConf.columnGap || '15px');
        targetElement.style.setProperty('--kanban-item-gap', layoutConf.itemGap || '12px');
    }
    targetElement.style.display = 'grid'; // Ensure grid display

    // --- Validate Basic Config ---
    const groupCol = tabConfig.config?.groupByColumn;
    const titleCol = tabConfig.config?.cardTitleColumn; // Optional, but good practice
    const validHeaders = globalConfig.csvHeaders || [];

    if (!groupCol || !validHeaders.includes(groupCol)) {
         showMessage(`Kanban tab "${tabConfig.title}" has invalid or missing 'groupByColumn'.`, tabConfig.id);
         return;
    }
     if (titleCol && !validHeaders.includes(titleCol)) {
          console.warn(`renderKanban (Tab "${tabConfig.title}"): Configured 'cardTitleColumn' ("${titleCol}") not found in CSV headers.`);
     }

    // --- Handle Empty Filtered Data ---
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches the filter criteria for tab "${tabConfig.title}".`, tabConfig.id);
        return;
    }

    // --- Group Filtered Data ---
    const grouped = filteredData.reduce((acc, row) => {
        const categoryValue = (validHeaders.includes(groupCol) ? row[groupCol] : undefined) ?? 'Uncategorized';
        // Handle potential array values from multi-value groupBy columns (though less common for Kanban)
        const category = Array.isArray(categoryValue) ? categoryValue.join(', ') : String(categoryValue);
        if (!acc[category]) acc[category] = [];
        acc[category].push(row);
        return acc;
    }, {});

    // --- Sort Group Keys ---
    let sortedGroupKeys = Object.keys(grouped);
    const groupSortConfig = tabConfig.config?.groupSortBy;

    if (groupSortConfig) {
        if (Array.isArray(groupSortConfig)) { // Predefined fixed order
            const predefinedOrder = groupSortConfig.map(String); // Ensure strings
            const fixedOrderKeys = [];
            const remainingKeys = [];

            // Separate keys into fixed order and remaining
            sortedGroupKeys.forEach(key => {
                if (predefinedOrder.includes(key)) {
                    // Will be placed according to predefinedOrder index
                } else {
                    remainingKeys.push(key);
                }
            });

            // Add keys found in predefined order first, maintaining the order
            predefinedOrder.forEach(pKey => {
                if (grouped[pKey]) { // Check if the key actually exists in the grouped data
                    fixedOrderKeys.push(pKey);
                }
            });

             // Sort remaining keys alphabetically (or could add another config option)
             remainingKeys.sort((a, b) => String(a).localeCompare(String(b)));

             // Combine the arrays
             sortedGroupKeys = [...fixedOrderKeys, ...remainingKeys];

        } else if (typeof groupSortConfig === 'string') {
            // Sort based on string commands
            switch (groupSortConfig.toLowerCase()) {
                case 'keyasc':
                    sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b)));
                    break;
                case 'keydesc':
                    sortedGroupKeys.sort((a, b) => String(b).localeCompare(String(a)));
                    break;
                case 'countasc':
                    sortedGroupKeys.sort((a, b) => (grouped[a]?.length || 0) - (grouped[b]?.length || 0));
                    break;
                case 'countdesc':
                    sortedGroupKeys.sort((a, b) => (grouped[b]?.length || 0) - (grouped[a]?.length || 0));
                    break;
                default:
                     console.warn(`renderKanban: Unknown groupSortBy value "${groupSortConfig}". Defaulting to keyAsc.`);
                     sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b)));
                     break;
            }
        } else {
            console.warn(`renderKanban: Invalid groupSortBy type "${typeof groupSortConfig}". Defaulting to keyAsc.`);
            sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b)));
        }
    } else {
        // Default sort if no config provided (e.g., keyAsc)
        sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b)));
    }

    // --- Render into Columns (using sortedGroupKeys) ---
    const maxGroupsPerColumn = Math.max(1, parseInt(layoutConf?.maxItemsPerGroupInColumn, 10) || 1); // Default to 1 if not specified
    const largeGroupThreshold = Math.max(0, parseInt(layoutConf?.preventStackingAboveItemCount, 10) || 0); // Default 0 means no threshold

    let currentColumnWrapper = null;
    let groupsInCurrentColumn = 0;
    let currentColumnIsFull = false; // Flag to force new column

    sortedGroupKeys.forEach((groupKey) => {
        const groupData = grouped[groupKey];
        if (!groupData || groupData.length === 0) return; // Skip empty groups

        // --- Sort Items Within This Group ---
        const itemSortConfig = tabConfig.config?.itemSortBy;
        // Use sortData helper, passing a copy of groupData to avoid modifying original
        const itemsToRender = sortData([...groupData], itemSortConfig, globalConfig);
        // --- End Sort Items Within Group ---

        const itemCountInGroup = itemsToRender.length;
        // Determine if this group forces a new column due to size threshold
        const isLargeGroup = largeGroupThreshold > 0 && itemCountInGroup > largeGroupThreshold;

        // Determine if a new column wrapper is needed
        if (currentColumnWrapper === null || currentColumnIsFull || (maxGroupsPerColumn > 1 && isLargeGroup && groupsInCurrentColumn > 0) || (maxGroupsPerColumn > 1 && groupsInCurrentColumn >= maxGroupsPerColumn) ) {
            currentColumnWrapper = document.createElement('div');
            currentColumnWrapper.className = 'kanban-column';
            // Apply item gap between group blocks within the column wrapper
            if (layoutConf?.itemGap) currentColumnWrapper.style.gap = layoutConf.itemGap;
            targetElement.appendChild(currentColumnWrapper);
            groupsInCurrentColumn = 0; // Reset count for new column
            currentColumnIsFull = false; // Reset flag
        }

        // --- Create the group block ---
        const groupBlockDiv = document.createElement('div');
        groupBlockDiv.className = 'kanban-group-block';
        const header = document.createElement('h3');
        header.textContent = `${groupKey} (${itemCountInGroup})`; // Include count in header
        groupBlockDiv.appendChild(header);

        // --- Add cards (using sorted itemsToRender) ---
        itemsToRender.forEach(row => {
            // Pass the specific tab's config object (tabConfig.config)
            // createInitiativeCard is assumed to be available (likely from renderer-shared.js)
            groupBlockDiv.appendChild(createInitiativeCard(row, tabConfig.config, globalConfig, 'kanban-card'));
        });

        // Append the group block to the current column wrapper
        if (!currentColumnWrapper) {
             // This shouldn't happen due to the logic above, but safety check
             console.error(`renderKanban (Tab "${tabConfig.title}"): Fatal logic error - currentColumnWrapper is null before appending group block.`);
             currentColumnWrapper = document.createElement('div'); currentColumnWrapper.className = 'kanban-column'; targetElement.appendChild(currentColumnWrapper); // Fallback
        }
        currentColumnWrapper.appendChild(groupBlockDiv);
        groupsInCurrentColumn++;

        // Check if the current column should now be considered full
        if (isLargeGroup || (maxGroupsPerColumn > 1 && groupsInCurrentColumn >= maxGroupsPerColumn)) {
             currentColumnIsFull = true;
        }
    });

    // --- Final Message Handling ---
    if (targetElement.querySelector('.kanban-column')) {
        hideMessages(tabConfig.id); // Hide placeholder if columns were rendered
    } else if (!filteredData || filteredData.length === 0) {
         // Message "No data matches filter" already shown
    } else {
        // Data exists, groups exist, but somehow no columns rendered (shouldn't happen with valid config)
        showMessage(`Could not render Kanban columns for tab "${tabConfig.title}". Check configuration and data.`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-kanban.js ---