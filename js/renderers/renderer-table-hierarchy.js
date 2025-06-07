// --- START OF FILE js/renderers/renderer-table-hierarchy.js ---

/**
 * Renders data into a hierarchical table view.
 * @param {object[]} filteredData The data rows already filtered for this tab.
 * @param {object} tabConfig The configuration for this specific tab.
 * @param {object} globalConfig The global application configuration.
 * @param {HTMLElement} targetElement The container element for this tab's content.
 * @param {Function} showMessage Function to display messages in the view.
 */
function renderTableHierarchy(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
    if (!targetElement) {
        console.error("renderTableHierarchy: Target element not provided.");
        return;
    }
    targetElement.innerHTML = '';

    const config = tabConfig.config;
    const { idColumn, parentColumn, displayColumns, columnWidths, headerOrientations, columnLabels } = config; // Include columnLabels for custom headers
    const validHeaders = globalConfig.csvHeaders || [];

    if (!idColumn || !validHeaders.includes(idColumn)) {
        showMessage(`Hierarchical table tab "${tabConfig.title}" has invalid or missing 'idColumn'.`, tabConfig.id);
        return;
    }
    if (!parentColumn || !validHeaders.includes(parentColumn)) {
        showMessage(`Hierarchical table tab "${tabConfig.title}" has invalid or missing 'parentColumn'.`, tabConfig.id);
        return;
    }
    if (!displayColumns || displayColumns.length === 0) {
        showMessage(`Hierarchical table tab "${tabConfig.title}" has no 'displayColumns' configured.`, tabConfig.id);
        return;
    }
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches the filter criteria for tab "${tabConfig.title}".`, tabConfig.id);
        return;
    }

    const itemMap = new Map();
    const rootItems = [];
    filteredData.forEach(row => {
        const id = row[idColumn];
        if (id !== null && typeof id !== 'undefined' && id !== '') {
            row.children = [];
            itemMap.set(String(id), row);
        }
    });
    filteredData.forEach(row => {
        const parentIdValue = row[parentColumn];
        let parentId = null;
        if (Array.isArray(parentIdValue) && parentIdValue.length > 0) {
            parentId = String(parentIdValue[0]);
        } else if (parentIdValue !== null && typeof parentIdValue !== 'undefined' && String(parentIdValue) !== '') {
            parentId = String(parentIdValue);
        }
        if (parentId && itemMap.has(parentId)) {
            const parentItem = itemMap.get(parentId);
            if (parentItem) {
                parentItem.children.push(row);
            }
        } else {
            rootItems.push(row);
        }
    });

    if (rootItems.length === 0 && filteredData.length > 0) {
        console.warn("No root items found for hierarchy. Displaying as a flat list.");
        renderTable(filteredData, tabConfig, globalConfig, targetElement, showMessage);
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');
    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);
    targetElement.appendChild(table);

    const validDisplayCols = displayColumns.filter(header => validHeaders.includes(header));
    const labels = columnLabels || {}; // Use passed in labels or empty object

    validDisplayCols.forEach(header => {
        const th = document.createElement('th');
        const orientation = (headerOrientations && (headerOrientations[header] || headerOrientations['default'])) || 'vertical';
        th.classList.add(orientation === 'horizontal' ? 'header-horizontal' : 'header-vertical');
        const span = document.createElement('span');
        span.className = 'header-text';
        // Use the label from columnLabels, or fall back to the header name
        span.textContent = labels[header] || header;
        span.title = header;
        th.appendChild(span);
        if (columnWidths && columnWidths[header]) {
            th.style.width = columnWidths[header];
        }
        headerRow.appendChild(th);
    });

    const sortByConfig = config.sortBy ?? globalConfig.generalSettings?.defaultItemSortBy ?? null;
    const sortedRootItems = sortData(rootItems, sortByConfig, globalConfig);

    const renderRowRecursive = (item, level) => {
        const tr = tbody.insertRow();
        tr.classList.add(`hierarchy-row-level-${level}`);
        validDisplayCols.forEach((header, colIndex) => {
            const td = tr.insertCell();
            const value = item[header];
            let cellContentWrapper = document.createElement('div');
            cellContentWrapper.className = 'cell-content-wrapper';
            if (colIndex === 0 && level > 0) {
                cellContentWrapper.style.paddingLeft = `${level * 25}px`;
            }
            const indicatorHtmlArray = generateIndicatorsHTML(item, header, globalConfig, filteredData);
            if (indicatorHtmlArray.length > 0) {
                const indicatorContainer = document.createElement('span');
                indicatorContainer.innerHTML = indicatorHtmlArray.join(' ');
                cellContentWrapper.appendChild(indicatorContainer);
                td.style.textAlign = 'center';
            } else {
                const textSpan = document.createElement('span');
                textSpan.className = 'cell-text';
                textSpan.textContent = Array.isArray(value) ? value.join(', ') : String(value ?? '');
                cellContentWrapper.appendChild(textSpan);
            }
            td.appendChild(cellContentWrapper);
        });

        if (item.children && item.children.length > 0) {
            const sortedChildren = sortData([...item.children], sortByConfig, globalConfig);
            sortedChildren.forEach(child => {
                renderRowRecursive(child, level + 1);
            });
        }
    };

    sortedRootItems.forEach(root => renderRowRecursive(root, 0));
    hideMessages(tabConfig.id);
}
// --- END OF FILE js/renderers/renderer-table-hierarchy.js ---