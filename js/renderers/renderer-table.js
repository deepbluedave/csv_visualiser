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

    // --- *** NEW: Apply Sorting *** ---
    // Resolve the sort configuration: Use tab-specific 'sortBy' if defined,
    // otherwise fallback to global 'defaultItemSortBy', else null.
    const sortByConfig = tabConfig.config?.sortBy ?? globalConfig.generalSettings?.defaultItemSortBy ?? null;
    
    const dataToRender = sortData([...filteredData], sortByConfig, globalConfig); // Use helper, sort a copy

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
    dataToRender.forEach((row, rowIndex) => {
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
                    // --- START REPLACEMENT ---
                    const prefixes = globalConfig.generalSettings?.linkPrefixes || {};
                    const prefix = prefixes[header]; // Get prefix for this specific column
                    const valuesToCheck = Array.isArray(value) ? value : [value]; // Handle potential multi-value

                    const linksHtmlArray = [];
                    const linksTitleArray = [];

                    valuesToCheck.forEach(singleValue => {
                        const cellValue = String(singleValue ?? '').trim(); // Get the ID or potential URL
                        let fullUrl = null;
                        let linkTitle = '';
                        let isInvalid = false;

                        if (prefix && cellValue) {
                            // Prefix exists AND cell value is not empty
                            fullUrl = prefix + cellValue; // Construct the URL
                            linkTitle = `Open Link: ${fullUrl}`;
                        } else if (!prefix && cellValue) {
                            // No prefix defined for this column, treat cellValue as potential full URL
                            if (cellValue.startsWith('http://') || cellValue.startsWith('https://')) {
                                fullUrl = cellValue;
                                linkTitle = `Open Link: ${fullUrl}`;
                            } else {
                                // Value exists, but no prefix and not a URL - treat as invalid link data for table display
                                isInvalid = true;
                                linksHtmlArray.push(`<span class="cell-text">${cellValue}</span>`); // Show raw ID/text
                                linksTitleArray.push(cellValue); // Use raw value for title
                            }
                        }
                        // If empty value, do nothing (no link, no text)

                        // Add the link HTML if a valid URL was constructed/found
                        if (fullUrl) {
                            // *** Use the correct class for table links ***
                            linksHtmlArray.push(`<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" title="${linkTitle}" class="table-link-icon">🔗</a>`);
                            linksTitleArray.push(linkTitle);
                        }
                        // If invalid, we already pushed the raw text above
                    });

                    // Join the HTML and titles (handle multiple links in one cell if needed, though less common for tables)
                    cellHTML = linksHtmlArray.join('<br>'); // Use line break if multiple links possible
                    cellTitle = linksTitleArray.join('; ');

                    // Set alignment and potentially invalid class
                    if (linksHtmlArray.length > 0 && !linksHtmlArray.some(html => html.includes('cell-text'))) {
                        // If we have links and none are just raw text spans
                        cellTextAlign = 'center'; // Center link icons
                    } else if (linksHtmlArray.some(html => html.includes('cell-text'))) {
                        td.classList.add('link-column-invalid-url'); // Mark cell if it contains non-URL text
                        cellTextAlign = 'left'; // Align left if showing raw text/IDs
                    } else {
                         // Cell is empty (no value or prefix didn't apply)
                         cellTitle = header; // Default title for empty cell
                         cellTextAlign = 'center'; // Center empty cell
                    }
                     // --- END REPLACEMENT ---
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
                    let indicatorsPresent = Array.isArray(cellHTML) && cellHTML.length > 0;

                    // Disable fallback ONLY if it's an icon column, the value is falsey,
                    // AND the indicator logic correctly returned an empty array.
                    if (isIconColumn && isValueFalsey && !indicatorsPresent) {
                        applyRawValueFallback = false;
                    }
                    // --- End Fallback Check ---


                    // Apply display logic based on fallback flag and indicator content
                    if (applyRawValueFallback && !indicatorsPresent && cellTitle !== '') {
                        // Fallback allowed, indicator array is empty, and raw value is not empty
                        // Prepare cellHTML as a string for direct display
                        cellHTML = `<span class="cell-text">${cellTitle}</span>`;
                        // Align based on header orientation
                        const headerOrientation = headerOrientations[header] || headerOrientations['default'] || 'vertical';
                        cellTextAlign = headerOrientation === 'horizontal' ? 'left' : 'center';
                    } else if (indicatorsPresent) {
                         // Indicator HTML array *is* present
                         // *** JOIN the array into a single string for table cell display ***
                         // A simple space join is usually appropriate for table cells.
                         const joinedIndicators = cellHTML.join(' ');

                         // Determine title and alignment based on the first indicator
                         const tempDiv = document.createElement('div'); tempDiv.innerHTML = joinedIndicators;
                         cellTitle = tempDiv.firstChild?.title || cellTitle || header;
                         cellTextAlign = 'center'; // Usually center indicators/tags

                         // Update cellHTML to the joined string
                         cellHTML = joinedIndicators;
                    } else 
                    {
                        // This case means indicator is empty AND fallback is disabled (or cellTitle was empty)
                        // Ensure cellHTML is an empty string for td.innerHTML
                        cellHTML = '';
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