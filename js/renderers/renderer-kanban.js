// --- START OF FILE js/renderers/renderer-kanban.js ---

/**
 * Renders data into a Kanban view within the specified target element.
 * Uses configuration specific to the tab.
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

    // Apply grid styles dynamically based on tab config's layout settings
    const layoutConf = tabConfig.config?.layout;
    if (layoutConf) {
        targetElement.style.setProperty('--kanban-min-col-width', layoutConf.minColumnWidth || '280px');
        targetElement.style.setProperty('--kanban-gap', layoutConf.columnGap || '15px');
        targetElement.style.setProperty('--kanban-item-gap', layoutConf.itemGap || '12px');
    }
    targetElement.style.display = 'grid'; // Ensure grid display

    // Validate config
    const groupCol = tabConfig.config?.groupByColumn;
    const titleCol = tabConfig.config?.cardTitleColumn;
    const validHeaders = globalConfig.csvHeaders || [];

    if (!groupCol || !validHeaders.includes(groupCol)) {
         showMessage(`Kanban tab "${tabConfig.title}" has invalid 'groupByColumn'.`, tabConfig.id);
         return;
    }
     if (titleCol && !validHeaders.includes(titleCol)) {
          console.warn(`renderKanban (Tab "${tabConfig.title}"): 'cardTitleColumn' ("${titleCol}") not found.`);
     }

    // Handle empty filtered data
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches the filter criteria for tab "${tabConfig.title}".`, tabConfig.id);
        return;
    }

    // Get Layout Settings
    const maxGroupsPerColumn = Math.max(1, parseInt(layoutConf?.maxItemsPerGroupInColumn, 10) || 1);
    const largeGroupThreshold = Math.max(0, parseInt(layoutConf?.preventStackingAboveItemCount, 10) || 10000);

    // Group Filtered Data
    const grouped = filteredData.reduce((acc, row) => {
        const categoryValue = (validHeaders.includes(groupCol) ? row[groupCol] : undefined) ?? 'Uncategorized';
        const category = Array.isArray(categoryValue) ? categoryValue.join(', ') : String(categoryValue);
        if (!acc[category]) acc[category] = [];
        acc[category].push(row);
        return acc;
    }, {});

    // Sort Groups
    const sortedGroupKeys = Object.keys(grouped).sort((keyA, keyB) => {
        return (grouped[keyB]?.length || 0) - (grouped[keyA]?.length || 0);
    });

    // Render into Columns
    let currentColumnWrapper = null;
    let groupsInCurrentColumn = 0;
    let currentColumnIsFull = false;

    sortedGroupKeys.forEach((groupKey) => {
        const groupData = grouped[groupKey];
        if (!groupData || groupData.length === 0) return;

        const itemCountInGroup = groupData.length;
        const isLargeGroup = largeGroupThreshold > 0 && itemCountInGroup > largeGroupThreshold;

        if (currentColumnWrapper === null || currentColumnIsFull) {
            currentColumnWrapper = document.createElement('div');
            currentColumnWrapper.className = 'kanban-column';
            // Apply item gap to wrapper
            if (layoutConf?.itemGap) currentColumnWrapper.style.gap = layoutConf.itemGap;
            targetElement.appendChild(currentColumnWrapper);
            groupsInCurrentColumn = 0;
            currentColumnIsFull = false;
        }

        const groupBlockDiv = document.createElement('div');
        groupBlockDiv.className = 'kanban-group-block';
        const header = document.createElement('h3');
        header.textContent = groupKey;
        groupBlockDiv.appendChild(header);

        // Add cards (passing tab config and global config)
        groupData.forEach(row => {
            groupBlockDiv.appendChild(createInitiativeCard(row, tabConfig.config, globalConfig, 'kanban-card', 'csv-dashboard-icon'));
        });

        if (!currentColumnWrapper) {
             console.error(`renderKanban (Tab "${tabConfig.title}"): Fatal logic error - currentColumnWrapper is null.`);
             currentColumnWrapper = document.createElement('div'); currentColumnWrapper.className = 'kanban-column'; targetElement.appendChild(currentColumnWrapper); // Fallback
        }
        currentColumnWrapper.appendChild(groupBlockDiv);
        groupsInCurrentColumn++;

        if (isLargeGroup || groupsInCurrentColumn >= maxGroupsPerColumn) {
             currentColumnIsFull = true;
        }
    });

    // Hide message placeholder if content rendered
    if (targetElement.querySelector('.kanban-column')) {
        hideMessages(tabConfig.id);
    } else if (!filteredData || filteredData.length === 0) {
         // Message handled above
    } else {
        showMessage(`Could not render Kanban columns for tab "${tabConfig.title}".`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-kanban.js ---