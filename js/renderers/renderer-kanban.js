// --- START OF FILE js/renderers/renderer-kanban.js ---

/**
 * Renders data into a Kanban view within the specified target element.
 * Uses configuration specific to the tab.
 * Includes sorting for groups and items within groups.
 * Resolves itemSortBy and cardIndicatorColumns using defaults from generalSettings if not specified in tab config.
 * @param {object[]} filteredData The data rows already filtered for this tab.
 * @param {object} tabConfig The configuration object for this specific kanban tab.
 * @param {object} globalConfig The global application configuration.
 * @param {HTMLElement} targetElement The container element for this tab.
 * @param {Function} showMessage Function to display messages.
 * @param {object[]} fullDataset The entire unfiltered dataset, used for lookups.
 */
function renderKanban(filteredData, tabConfig, globalConfig, targetElement, showMessage, fullDataset) {
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
    const titleCol = tabConfig.config?.cardTitleColumn;
    const validHeaders = globalConfig.csvHeaders || [];
    const lookupConfig = tabConfig.config?.groupHeaderLookup; // Get lookup config

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

    // --- Create Lookup Map ONLY if configured ---
    let parentNameMap = null;
    if (lookupConfig && lookupConfig.sourceColumn && lookupConfig.displayColumn) {
        parentNameMap = new Map();
        // Use the new fullDataset argument to build the map
        fullDataset.forEach(row => {
            const id = row[lookupConfig.sourceColumn];
            const name = row[lookupConfig.displayColumn];
            if (id !== null && id !== undefined && name !== null && name !== undefined) {
                parentNameMap.set(String(id), String(name));
            }
        });
    }

    // --- Group Filtered Data (MODIFIED with conditional logic) ---
    const grouped = filteredData.reduce((acc, row) => {
        if (parentNameMap) {
            // BEHAVIOR 1: Use the parent lookup logic
            const parentIdValue = row[groupCol] ?? null;
            let parentIds = [];

            if (Array.isArray(parentIdValue)) {
                parentIds = parentIdValue.map(id => String(id).trim()).filter(id => id);
            } else if (parentIdValue !== null && String(parentIdValue).trim() !== '') {
                parentIds = [String(parentIdValue).trim()];
            }

            let categories = [];
            if (parentIds.length > 0) {
                parentIds.forEach(id => {
                    if (parentNameMap.has(id)) {
                        categories.push(parentNameMap.get(id)); // Use looked-up name
                    } else {
                        categories.push(`Parent ID: ${id} (Not Found)`); // Fallback
                    }
                });
            } else {
                categories.push('Top-Level Items');
            }

            categories.forEach(category => {
                if (!acc[category]) acc[category] = [];
                acc[category].push(row);
            });
        } else {
            // BEHAVIOR 2: Original grouping logic (no lookup)
            const categoryValue = row[groupCol] ?? 'Uncategorized';
            const category = Array.isArray(categoryValue) ? categoryValue.join(', ') : String(categoryValue);
            if (!acc[category]) acc[category] = [];
            acc[category].push(row);
        }
        return acc;
    }, {});


    // --- Sort Group Keys ---
    let sortedGroupKeys = Object.keys(grouped);
    const groupSortConfig = tabConfig.config?.groupSortBy;

    if (!Array.isArray(groupSortConfig) && sortedGroupKeys.includes('Top-Level Items')) {
        sortedGroupKeys = ['Top-Level Items', ...sortedGroupKeys.filter(k => k !== 'Top-Level Items').sort()];
    }

    if (groupSortConfig) {
        if (Array.isArray(groupSortConfig)) {
            const predefinedOrder = groupSortConfig.map(String);
            const fixedOrderKeys = [];
            const remainingKeys = [];

            sortedGroupKeys.forEach(key => {
                if (predefinedOrder.includes(key)) {
                } else {
                    remainingKeys.push(key);
                }
            });

            predefinedOrder.forEach(pKey => {
                if (grouped[pKey]) {
                    fixedOrderKeys.push(pKey);
                }
            });

             remainingKeys.sort((a, b) => String(a).localeCompare(String(b)));
             sortedGroupKeys = [...fixedOrderKeys, ...remainingKeys];

        } else if (typeof groupSortConfig === 'string') {
            switch (groupSortConfig.toLowerCase()) {
                case 'keyasc': sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b))); break;
                case 'keydesc': sortedGroupKeys.sort((a, b) => String(b).localeCompare(String(a))); break;
                case 'countasc': sortedGroupKeys.sort((a, b) => (grouped[a]?.length || 0) - (grouped[b]?.length || 0)); break;
                case 'countdesc': sortedGroupKeys.sort((a, b) => (grouped[b]?.length || 0) - (grouped[a]?.length || 0)); break;
                default:
                     console.warn(`renderKanban: Unknown groupSortBy value "${groupSortConfig}". Defaulting to keyAsc.`);
                     sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b)));
                     break;
            }
        }
    } else if (!sortedGroupKeys.includes('Top-Level Items')) {
        sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b)));
    }


    // --- Render into Columns (using sortedGroupKeys) ---
    const maxGroupsPerColumn = Math.max(1, parseInt(layoutConf?.maxItemsPerGroupInColumn, 10) || 1);
    const largeGroupThreshold = Math.max(0, parseInt(layoutConf?.preventStackingAboveItemCount, 10) || 0);

    let currentColumnWrapper = null;
    let groupsInCurrentColumn = 0;
    let currentColumnIsFull = false;

    sortedGroupKeys.forEach((groupKey) => {
        const groupData = grouped[groupKey];
        if (!groupData || groupData.length === 0) return;

        const itemSortConfig = tabConfig.config?.itemSortBy ?? globalConfig.generalSettings?.defaultItemSortBy ?? null;
        const itemsToRender = sortData([...groupData], itemSortConfig, globalConfig);

        const itemCountInGroup = itemsToRender.length;
        const isLargeGroup = largeGroupThreshold > 0 && itemCountInGroup > largeGroupThreshold;

        if (currentColumnWrapper === null || currentColumnIsFull || (maxGroupsPerColumn > 1 && isLargeGroup && groupsInCurrentColumn > 0) || (maxGroupsPerColumn > 1 && groupsInCurrentColumn >= maxGroupsPerColumn) ) {
            currentColumnWrapper = document.createElement('div');
            currentColumnWrapper.className = 'kanban-column';
            if (layoutConf?.itemGap) currentColumnWrapper.style.gap = layoutConf.itemGap;
            targetElement.appendChild(currentColumnWrapper);
            groupsInCurrentColumn = 0;
            currentColumnIsFull = false;
        }

        const groupBlockDiv = document.createElement('div');
        groupBlockDiv.className = 'kanban-group-block';
        const header = document.createElement('h3');
        header.textContent = `${groupKey} (${itemCountInGroup})`;
        groupBlockDiv.appendChild(header);

        itemsToRender.forEach(row => {
            const indicatorsToUse = tabConfig.config?.cardIndicatorColumns ?? globalConfig.generalSettings?.defaultCardIndicatorColumns ?? [];
            const cardCreationConfig = {
                ...tabConfig.config,
                cardIndicatorColumns: indicatorsToUse
            };
            // Pass fullDataset to createInitiativeCard
            groupBlockDiv.appendChild(createInitiativeCard(row, cardCreationConfig, globalConfig, fullDataset, 'kanban-card'));
        });
        
        if (!currentColumnWrapper) {
             console.error(`renderKanban (Tab "${tabConfig.title}"): Fatal logic error - currentColumnWrapper is null before appending group block.`);
             currentColumnWrapper = document.createElement('div'); currentColumnWrapper.className = 'kanban-column'; targetElement.appendChild(currentColumnWrapper);
        }
        currentColumnWrapper.appendChild(groupBlockDiv);
        groupsInCurrentColumn++;

        if (isLargeGroup || (maxGroupsPerColumn > 1 && groupsInCurrentColumn >= maxGroupsPerColumn)) {
             currentColumnIsFull = true;
        }
    });

    if (targetElement.querySelector('.kanban-column')) {
        hideMessages(tabConfig.id);
    } else if (!filteredData || filteredData.length === 0) {
        // message is already handled
    } else {
        showMessage(`Could not render Kanban columns for tab "${tabConfig.title}". Check configuration and data.`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-kanban.js ---