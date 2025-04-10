// --- START OF FILE js/renderers/renderer-table.js ---

/**
 * Renders data into a table within the specified target element.
 * Uses configuration specific to the tab.
 * @param {object[]} filteredData The data rows already filtered for this tab.
 * @param {object} tabConfig The configuration object for this specific table tab.
 * @param {object} globalConfig The global application configuration.
 * @param {HTMLElement} targetElement The container element (e.g., div#tab-content-...) for this tab.
 * @param {Function} showMessage Function (likely from view-manager via app.js) to display messages.
 */
function renderTable(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
    if (!targetElement) {
        console.error("renderTable: Target element not provided.");
        return;
    }
    targetElement.innerHTML = ''; // Clear previous content

    // Create table structure
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');
    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);
    targetElement.appendChild(table);

    // Add placeholder AFTER table structure (managed by view-manager)
    // Ensure placeholder is hidden if data exists (done later)

    // Validate config
    const displayCols = tabConfig.config?.displayColumns;
    if (!displayCols || !Array.isArray(displayCols) || displayCols.length === 0) {
         showMessage(`Table tab "${tabConfig.title}" has no 'displayColumns' configured.`, tabConfig.id);
         table.style.display = 'none';
         return;
    }

    // Handle empty filtered data
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches the filter criteria for tab "${tabConfig.title}".`, tabConfig.id);
        table.style.display = 'none';
        return;
    }

    const validHeaders = globalConfig.csvHeaders || [];
    const linkColumns = globalConfig.generalSettings?.linkColumns || [];
    const colWidths = tabConfig.config?.columnWidths || {};
    const headerOrientations = tabConfig.config?.headerOrientations || {};
    let displayedHeaderCount = 0;

    // --- Render Header ---
    displayCols.forEach(header => {
        if (validHeaders.includes(header)) {
            const th = document.createElement('th');
            const orientation = headerOrientations[header] || headerOrientations['default'] || 'vertical';
            th.classList.add(orientation === 'horizontal' ? 'header-horizontal' : 'header-vertical');

            const span = document.createElement('span');
            span.className = 'header-text';
            span.textContent = header;
            span.title = header;
            th.appendChild(span);

            // Apply Width
            const width = colWidths[header] || colWidths['default'] || 'auto';
            if (width && width !== 'auto') {
                th.style.width = width;
                if (orientation === 'horizontal') th.style.maxWidth = width;
            } else {
                 th.style.width = 'auto';
                 th.style.minWidth = '60px'; // Default min-width for auto
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
    filteredData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        displayCols.forEach(header => {
            if (validHeaders.includes(header)) {
                const td = document.createElement('td');
                const value = row[header];
                let cellHTML = '';
                let cellTitle = '';
                let cellTextAlign = 'left'; // Default cell alignment

                // Link Column Handling
                if (linkColumns.includes(header)) {
                    const url = String(value || '').trim();
                    if (url.startsWith('http://') || url.startsWith('https://')) {
                        cellHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" title="Open Link: ${url}" class="table-link-csv-dashboard-icon">🔗</a>`;
                        cellTitle = `Link: ${url}`;
                        cellTextAlign = 'center'; // Center link icons
                    } else if (url) {
                        cellHTML = `<span class="cell-text">${url}</span>`; // Wrap non-URL text
                        cellTitle = url;
                        td.classList.add('link-column-invalid-url');
                    } else {
                       // Ensure empty cell if no URL
                       cellHTML = '';
                       cellTitle = header; // Set default title for empty cell
                    }
                }
                // Standard Column Handling
                else {
                    // Generate indicators (icons/tags). This might return "" for falsey icons.
                    cellHTML = generateIndicatorsHTML(row, header, globalConfig);

                    // Get the raw value for potential fallback display and title attribute
                    if (Array.isArray(value)) cellTitle = value.join(', ');
                    else cellTitle = String(value ?? ''); // Use ?? to handle null/undefined -> ""


                    // --- Check if we should fallback to showing raw value ---
                    const columnStyle = globalConfig.indicatorStyles?.[header];
                    const isIconColumn = columnStyle?.type === 'icon';
                    const isValueFalsey = !isTruthy(value, globalConfig); // Use helper from shared

                    let applyRawValueFallback = true; // Assume we show raw value if indicator is empty

                    // Disable fallback ONLY if it's an icon column, the value is falsey,
                    // AND the indicator logic correctly returned an empty string.
                    if (isIconColumn && isValueFalsey && !cellHTML?.trim()) {
                        applyRawValueFallback = false;
                    }
                    // --- End Fallback Check ---


                    // Apply display logic based on fallback flag and indicator content
                    if (applyRawValueFallback && !cellHTML?.trim() && cellTitle !== '') {
                        // Fallback allowed, indicator is empty, and raw value is not empty
                        cellHTML = `<span class="cell-text">${cellTitle}</span>`;
                        // Align based on header orientation
                        const headerOrientation = headerOrientations[header] || headerOrientations['default'] || 'vertical';
                        cellTextAlign = headerOrientation === 'horizontal' ? 'left' : 'center';
                    } else if (cellHTML?.trim()) {
                         // Indicator HTML *is* present (icon, tag, or stacked tags)
                         // Determine title and alignment based on the indicator
                         const tempDiv = document.createElement('div'); tempDiv.innerHTML = cellHTML;
                         // Use title from indicator if present, fallback to raw value, then header
                         cellTitle = tempDiv.firstChild?.title || cellTitle || header;
                         cellTextAlign = 'center'; // Usually center indicators/tags
                    } else {
                        // This case means indicator is empty AND fallback is disabled (or cellTitle was empty)
                        // Leave cellHTML as "" (empty cell)
                        cellTitle = cellTitle || header; // Set title attribute anyway for empty cell
                    }
                }

                td.innerHTML = cellHTML;
                td.title = cellTitle; // Set tooltip
                td.style.textAlign = cellTextAlign; // Apply alignment
                tr.appendChild(td);
            }
        });
        if (tr.children.length === displayedHeaderCount) {
             tbody.appendChild(tr);
         } else {
             console.warn(`renderTable (Tab "${tabConfig.title}"): Row ${rowIndex+1} cell count mismatch.`);
         }
    });

    // Hide the placeholder message now that the table is populated (or should be)
    // Use the message hiding function passed from the caller (likely view-manager via app.js)
     hideMessages(tabConfig.id); // Standard way to hide placeholder
}
// --- END OF FILE js/renderers/renderer-table.js ---