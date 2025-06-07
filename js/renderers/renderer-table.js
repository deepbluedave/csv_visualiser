// --- START OF FILE js/renderers/renderer-table.js ---

/**
 * Renders data into a table within the specified target element.
 * Uses configuration specific to the tab.
 * @param {object[]} filteredData The data rows already filtered for this tab.
 * @param {object} tabConfig The configuration object for this specific table tab.
 * @param {object} globalConfig The global application configuration.
 * @param {HTMLElement} targetElement The container element for this tab.
 * @param {Function} showMessage Function to display messages in the view.
 */
function renderTable(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
    if (!targetElement) {
        console.error("renderTable: Target element not provided.");
        return;
    }
    targetElement.innerHTML = '';

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');
    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);
    targetElement.appendChild(table);

    const displayCols = tabConfig.config?.displayColumns;
    if (!displayCols || !Array.isArray(displayCols) || displayCols.length === 0) {
         showMessage(`Table tab "${tabConfig.title}" has no 'displayColumns' configured.`, tabConfig.id);
         table.style.display = 'none';
         return;
    }

    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches the filter criteria for tab "${tabConfig.title}".`, tabConfig.id);
        table.style.display = 'none';
        return;
    }

    const sortByConfig = tabConfig.config?.sortBy ?? globalConfig.generalSettings?.defaultItemSortBy ?? null;
    const dataToRender = sortData([...filteredData], sortByConfig, globalConfig);

    const validHeaders = globalConfig.csvHeaders || [];
    const linkColumns = globalConfig.generalSettings?.linkColumns || [];
    const colWidths = tabConfig.config?.columnWidths || {};
    const headerOrientations = tabConfig.config?.headerOrientations || {};
    const columnLabels = tabConfig.config?.columnLabels || {}; // Optional column label overrides
    let displayedHeaderCount = 0;

    // --- Render Header ---
    displayCols.forEach(header => {
        if (validHeaders.includes(header)) {
            const th = document.createElement('th');
            const orientation = headerOrientations[header] || headerOrientations['default'] || 'vertical';
            th.classList.add(orientation === 'horizontal' ? 'header-horizontal' : 'header-vertical');

            const span = document.createElement('span');
            span.className = 'header-text';
            // Use the label from columnLabels, or fall back to the header name
            span.textContent = columnLabels[header] || header;
            span.title = header; // Tooltip still shows the original column name
            th.appendChild(span);

            const width = colWidths[header] || colWidths['default'] || 'auto';
            if (width && width !== 'auto') {
                th.style.width = width;
                if (orientation === 'horizontal') th.style.maxWidth = width;
            } else {
                 th.style.width = 'auto';
                 th.style.minWidth = '60px';
                 if (orientation === 'horizontal') th.style.maxWidth = '400px';
            }
            headerRow.appendChild(th);
            displayedHeaderCount++;
        } else {
            console.warn(`renderTable (Tab "${tabConfig.title}"): Configured displayColumn "${header}" not found.`);
        }
    });

    if (displayedHeaderCount === 0) {
        showMessage(`No valid columns found to display for tab "${tabConfig.title}".`, tabConfig.id);
        table.style.display = 'none';
        return;
    }

    // --- Render Body ---
    dataToRender.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        displayCols.forEach(header => {
            if (validHeaders.includes(header)) {
                const td = tr.insertCell();
                const value = row[header];
                let cellHTML = '';
                let cellTitle = '';
                let cellTextAlign = 'left';

                if (linkColumns.includes(header)) {
                    const prefixes = globalConfig.generalSettings?.linkPrefixes || {};
                    const prefix = prefixes[header];
                    const valuesToCheck = Array.isArray(value) ? value : [value];
                    const linksHtmlArray = [];
                    const linksTitleArray = [];
                    valuesToCheck.forEach(singleValue => {
                        const cellValue = String(singleValue ?? '').trim();
                        let fullUrl = null;
                        if (prefix && cellValue) {
                            fullUrl = prefix + cellValue;
                        } else if (!prefix && cellValue && (cellValue.startsWith('http://') || cellValue.startsWith('https://'))) {
                            fullUrl = cellValue;
                        }
                        if (fullUrl) {
                            linksHtmlArray.push(`<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" title="Open Link: ${fullUrl}" class="table-link-icon">🔗</a>`);
                            linksTitleArray.push(`Open Link: ${fullUrl}`);
                        } else if (cellValue) {
                            linksHtmlArray.push(`<span class="cell-text">${cellValue}</span>`);
                            linksTitleArray.push(cellValue);
                        }
                    });
                    cellHTML = linksHtmlArray.join('<br>');
                    cellTitle = linksTitleArray.join('; ');
                    if (linksHtmlArray.length > 0 && !linksHtmlArray.some(html => html.includes('cell-text'))) {
                        cellTextAlign = 'center';
                    } else if (linksHtmlArray.some(html => html.includes('cell-text'))) {
                        td.classList.add('link-column-invalid-url');
                        cellTextAlign = 'left';
                    }
                } else {
                    const columnStyle = globalConfig.indicatorStyles?.[header];
                    if (columnStyle && (columnStyle.type === 'icon' || columnStyle.type === 'tag' || columnStyle.type === 'lookup')) {
                        const indicatorHtmlArray = generateIndicatorsHTML(row, header, globalConfig, dataToRender);
                        if (indicatorHtmlArray.length > 0) {
                            cellHTML = indicatorHtmlArray.join(' ');
                            cellTextAlign = 'center';
                        } else {
                            cellHTML = '';
                        }
                    } else {
                        cellHTML = `<span class="cell-text">${Array.isArray(value) ? value.join(', ') : String(value ?? '')}</span>`;
                        const headerOrientation = headerOrientations[header] || headerOrientations['default'] || 'vertical';
                        cellTextAlign = headerOrientation === 'horizontal' ? 'left' : 'center';
                    }
                    cellTitle = Array.isArray(value) ? value.join(', ') : String(value ?? '');
                }

                td.innerHTML = cellHTML;
                td.title = cellTitle;
                td.style.textAlign = cellTextAlign;
                tr.appendChild(td);
            }
        });
        if (tr.children.length === displayedHeaderCount) {
             tbody.appendChild(tr);
         } else {
             console.warn(`renderTable (Tab "${tabConfig.title}"): Row ${rowIndex+1} cell count mismatch.`);
         }
    });

    hideMessages(tabConfig.id);
}
// --- END OF FILE js/renderers/renderer-table.js ---