// Utility functions for exporting data

/**
 * Gets the display text/icon for a data value based on indicatorStyles configuration.
 * Handles links, icons, and tags (valueMap and styleRules).
 * Returns the visual representation string, suitable for CSV export.
 * Handles multi-value arrays by processing each value and joining with ", ".
 *
 * @param {*} value The raw value from the data row (can be string, number, boolean, array, null, undefined).
 * @param {string} columnName The name of the column this value belongs to.
 * @param {object} globalConfig The global application configuration object.
 * @returns {string} The formatted display text/icon string, or the raw value if no format applies.
 */
function getFormattedIndicatorText(value, columnName, globalConfig) {
    const linkColumns = globalConfig.generalSettings?.linkColumns || [];
    const styleConfig = globalConfig.indicatorStyles ? globalConfig.indicatorStyles[columnName] : null;

    // --- Handle Multi-Value Arrays Recursively ---
    if (Array.isArray(value)) {
        // Process each item in the array and join the results
        return value
            .map(singleValue => getFormattedIndicatorText(singleValue, columnName, globalConfig)) // Recursive call
            .filter(formatted => formatted !== '') // Remove empty results if any item formatted to nothing
            .join(', '); // Join non-empty results with comma-space
    }

    // --- Handle Single Value ---
    const stringValue = String(value ?? ''); // Use empty string for null/undefined

    // --- Global Link Column Check ---
    if (linkColumns.includes(columnName)) {
        // --- START REPLACEMENT ---
        const prefixes = globalConfig.generalSettings?.linkPrefixes || {};
        const prefix = prefixes[columnName];
        const cellValue = stringValue.trim(); // stringValue is already defined from single value handling

        if (prefix && cellValue) {
            // Prefix exists and value is not empty: return the constructed URL
            return prefix + cellValue;
        } else if (!prefix && cellValue) {
            // No prefix: check if the cell value itself is a URL
            if (cellValue.startsWith('http://') || cellValue.startsWith('https://')) {
                return cellValue; // Return the full URL
            } else {
                // It's in linkColumns, but has no prefix and isn't a URL - return the raw value (the ID)
                return cellValue;
            }
        } else {
             // Value is empty, return empty string
             return '';
        }
         // --- END REPLACEMENT ---
    }
    
    try {
        // --- ICON type ---
        if (styleConfig.type === 'icon') {
            // 1. Check trueCondition
            if (styleConfig.trueCondition && isTruthy(stringValue, globalConfig)) {
                return styleConfig.trueCondition.value || '?'; // Return the icon value
            }

            // 2. Check valueMap
            if (styleConfig.valueMap) {
                const valueLower = stringValue.toLowerCase();
                let mapping = null;

                // Find mapping (case-sensitive, then insensitive, then specific falsey values)
                if (styleConfig.valueMap.hasOwnProperty(stringValue)) mapping = styleConfig.valueMap[stringValue];
                else if (styleConfig.valueMap.hasOwnProperty(valueLower)) mapping = styleConfig.valueMap[valueLower];
                // Check specific falsey mappings to allow hiding "FALSE" text etc.
                 if (!mapping) {
                    if (styleConfig.valueMap.hasOwnProperty(stringValue) && styleConfig.valueMap[stringValue]?.value === "") mapping = styleConfig.valueMap[stringValue]; // Explicitly empty mapping
                    else if (styleConfig.valueMap.hasOwnProperty('false') && valueLower === 'false') mapping = styleConfig.valueMap['false'];
                    else if (styleConfig.valueMap.hasOwnProperty('FALSE') && stringValue === 'FALSE') mapping = styleConfig.valueMap['FALSE'];
                    else if (styleConfig.valueMap.hasOwnProperty('0') && stringValue === '0') mapping = styleConfig.valueMap['0'];
                    else if (styleConfig.valueMap.hasOwnProperty('') && stringValue === '') mapping = styleConfig.valueMap[''];
                }

                // Apply mapping if found and has a 'value'
                if (mapping && mapping.value !== undefined) {
                    return mapping.value; // Return the icon value (could be "" for hidden)
                }
                 // 3. Check default if no specific mapping found
                 else if (styleConfig.valueMap.default && styleConfig.valueMap.default.value !== undefined) {
                    return styleConfig.valueMap.default.value; // Return default icon value
                 }
            }
             // 4. Fallback if trueCondition/valueMap didn't apply (shouldn't happen if default exists)
             return stringValue; // Fallback to raw value if icon logic didn't yield anything
        }
        // --- TAG type ---
        else if (styleConfig.type === 'tag') {
            let tagStyle = null;

            // 1. Check styleRules
            if (Array.isArray(styleConfig.styleRules)) {
                for (const rule of styleConfig.styleRules) {
                    let match = false;
                    try {
                        if (rule.matchType === 'regex' && rule.pattern && new RegExp(rule.pattern).test(stringValue)) match = true;
                        else if (rule.matchType === 'exact' && stringValue === rule.value) match = true;
                    } catch (e) { /* Ignore regex errors here */ }
                    if (match && rule.style) { tagStyle = rule.style; break; }
                }
                if (!tagStyle) tagStyle = styleConfig.defaultStyle || null;
            }
            // 2. Fallback to valueMap
            else if (!tagStyle && styleConfig.valueMap) {
                const lowerValue = stringValue.toLowerCase();
                tagStyle = styleConfig.valueMap.hasOwnProperty(stringValue) ? styleConfig.valueMap[stringValue] :
                           styleConfig.valueMap.hasOwnProperty(lowerValue) ? styleConfig.valueMap[lowerValue] :
                           styleConfig.valueMap['default'];
            }

            // 3. Determine display text based on found style
            if (tagStyle) {
                // Check if style explicitly wants to hide the tag
                if (tagStyle.text === "" || tagStyle.value === "") return "";
                // Return overridden text if present, otherwise raw value
                return tagStyle.text !== undefined ? tagStyle.text : stringValue;
            } else {
                // No style found, return raw value (unless empty)
                 return stringValue === '' ? '' : stringValue;
            }
        }
    } catch (e) {
        console.error(`Error getting formatted indicator text for column "${columnName}", value "${stringValue}":`, e);
    }

    // Final fallback: return the raw string value if anything went wrong or no style applied
    return stringValue;
}

/**
 * Escapes a value for inclusion in a CSV cell.
 * Wraps the value in double quotes if it contains a comma, double quote, or newline.
 * Escapes existing double quotes within the value by doubling them.
 * @param {*} value The value to escape.
 * @returns {string} The CSV-safe string.
 */
function escapeCsvValue(value) {
    const stringValue = String(value ?? ''); // Convert null/undefined to empty string

    // Check if quoting is necessary
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        // Escape existing double quotes by doubling them
        const escapedValue = stringValue.replace(/"/g, '""');
        // Wrap the entire string in double quotes
        return `"${escapedValue}"`;
    }
    // Return the original string if no special characters are found
    return stringValue;
}

/**
 * Generates a CSV string representation of the Table view data.
 * Uses the specified display columns and formats indicators.
 * @param {object[]} dataToExport The filtered and sorted data for the table tab.
 * @param {object} tabConfig The configuration object for the specific table tab.
 * @param {object} globalConfig The global application configuration.
 * @returns {string} The generated CSV content as a string.
 */
function generateTableCsv(dataToExport, tabConfig, globalConfig) {
    const displayCols = tabConfig.config?.displayColumns;
    if (!displayCols || displayCols.length === 0) {
        console.warn("generateTableCsv: No displayColumns configured.");
        return ''; // Return empty string if no columns
    }
    if (!dataToExport || dataToExport.length === 0) {
        console.log("generateTableCsv: No data to export.");
        return ''; // Return empty string if no data
    }

    const validHeaders = globalConfig.csvHeaders || [];
    // Filter displayCols to only include valid headers found in the data
    const csvHeaders = displayCols.filter(col => validHeaders.includes(col));

    if (csvHeaders.length === 0) {
        console.warn("generateTableCsv: No valid columns found to export.");
        return '';
    }

    const csvRows = [];

    // Add Header Row
    csvRows.push(csvHeaders.map(escapeCsvValue).join(','));

    // Add Data Rows
    dataToExport.forEach(row => {
        const rowData = [];
        csvHeaders.forEach(header => {
            const rawValue = row[header];
            // Use the helper to get the formatted text/icon representation
            const formattedValue = getFormattedIndicatorText(rawValue, header, globalConfig);
            rowData.push(escapeCsvValue(formattedValue));
        });
        csvRows.push(rowData.join(','));
    });

    // Join all rows with CRLF for better Windows compatibility
    return csvRows.join('\r\n');
}

/**
 * Generates a CSV string representation of the Kanban view data.
 * Exports a linear list including the Kanban group, card title, and formatted indicators.
 * @param {object[]} dataToExport The filtered data for the Kanban tab (sorting within groups happens here).
 * @param {object} tabConfig The configuration object for the specific Kanban tab.
 * @param {object} globalConfig The global application configuration.
 * @returns {string} The generated CSV content as a string.
 */
function generateKanbanCsv(dataToExport, tabConfig, globalConfig) {
    const kanbanConf = tabConfig.config;
    const groupByCol = kanbanConf?.groupByColumn;
    const cardTitleCol = kanbanConf?.cardTitleColumn;
    // Resolve indicators using defaults
    const cardIndicatorCols = kanbanConf?.cardIndicatorColumns ?? globalConfig.generalSettings?.defaultCardIndicatorColumns ?? [];
    // Resolve item sort config using defaults
    const itemSortConfig = kanbanConf?.itemSortBy ?? globalConfig.generalSettings?.defaultItemSortBy ?? null;

    const validHeaders = globalConfig.csvHeaders || [];

    // Basic validation
    if (!groupByCol || !validHeaders.includes(groupByCol)) {
        console.warn("generateKanbanCsv: Invalid groupByColumn."); return '';
    }
    if (!cardTitleCol || !validHeaders.includes(cardTitleCol)) {
        console.warn("generateKanbanCsv: Invalid cardTitleColumn."); return ''; // Title is essential for export
    }
    if (!dataToExport || dataToExport.length === 0) {
        console.log("generateKanbanCsv: No data to export."); return '';
    }

    // --- Group Data ---
    const grouped = dataToExport.reduce((acc, row) => {
        const categoryValue = row[groupByCol] ?? 'Uncategorized';
        const category = Array.isArray(categoryValue) ? categoryValue.join(', ') : String(categoryValue);
        if (!acc[category]) acc[category] = [];
        acc[category].push(row);
        return acc;
    }, {});

    // --- Define CSV Columns ---
    // Filter indicator columns to only include valid ones
    const validIndicatorCols = cardIndicatorCols.filter(col => validHeaders.includes(col));
    const csvHeaders = [
        groupByCol, // First column is the Kanban Group Key
        cardTitleCol, // Second is the Card Title
        ...validIndicatorCols // Add columns for each valid indicator
    ];

    const csvRows = [];
    // Add Header Row
    csvRows.push(csvHeaders.map(escapeCsvValue).join(','));

    // --- Sort Group Keys (using same logic as renderKanban) ---
    let sortedGroupKeys = Object.keys(grouped);
    const groupSortConfig = kanbanConf?.groupSortBy;
     if (groupSortConfig) {
         if (Array.isArray(groupSortConfig)) {
             const predefinedOrder = groupSortConfig.map(String);
             sortedGroupKeys = sortedGroupKeys.sort((a, b) => {
                 const indexA = predefinedOrder.indexOf(a);
                 const indexB = predefinedOrder.indexOf(b);
                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                 if (indexA !== -1) return -1; // a is in order, b is not -> a comes first
                 if (indexB !== -1) return 1;  // b is in order, a is not -> b comes first
                 return String(a).localeCompare(String(b)); // Neither in order, sort alphabetically
             });
         } else if (typeof groupSortConfig === 'string') {
             switch (groupSortConfig.toLowerCase()) {
                 case 'keyasc': sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b))); break;
                 case 'keydesc': sortedGroupKeys.sort((a, b) => String(b).localeCompare(String(a))); break;
                 case 'countasc': sortedGroupKeys.sort((a, b) => (grouped[a]?.length || 0) - (grouped[b]?.length || 0)); break;
                 case 'countdesc': sortedGroupKeys.sort((a, b) => (grouped[b]?.length || 0) - (grouped[a]?.length || 0)); break;
                 default: sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b))); break;
             }
         } else { sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b))); }
     } else { sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b))); }
    // --- End Sort Group Keys ---


    // --- Add Data Rows ---
    sortedGroupKeys.forEach(groupKey => {
        let itemsInGroup = grouped[groupKey];

        // --- Sort Items within Group ---
        if (itemSortConfig) {
            itemsInGroup = sortData([...itemsInGroup], itemSortConfig, globalConfig); // Sort a copy
        }
        // --- End Sort Items ---

        itemsInGroup.forEach(row => {
            const rowData = [];
            // 1. Kanban Group
            rowData.push(escapeCsvValue(groupKey));
            // 2. Card Title
            rowData.push(escapeCsvValue(row[cardTitleCol] ?? ''));
            // 3. Indicators
            validIndicatorCols.forEach(indicatorCol => {
                const rawValue = row[indicatorCol];
                const formattedValue = getFormattedIndicatorText(rawValue, indicatorCol, globalConfig);
                rowData.push(escapeCsvValue(formattedValue));
            });
            csvRows.push(rowData.join(','));
        });
    });

    // Join all rows with CRLF
    return csvRows.join('\r\n');
}

/**
 * Generates a CSV string representation of the Summary view data.
 * Exports a linear list: Section Title, Group Key (optional), Card Title, Indicator1, Indicator2...
 * Respects section filtering and item sorting.
 * @param {object[]} dataToExport The filtered and sorted data for the summary tab.
 * @param {object} tabConfig The configuration object for the specific summary tab.
 * @param {object} globalConfig The global application configuration.
 * @returns {string} The generated CSV content as a string.
 */
function generateSummaryCsv(dataToExport, tabConfig, globalConfig) {
    const summaryConf = tabConfig.config;
    const sections = summaryConf?.sections;
    const groupByCol = summaryConf?.groupByColumn; // Optional grouping within sections
    const cardTitleCol = summaryConf?.cardTitleColumn;
    // Resolve indicators using defaults
    const cardIndicatorCols = summaryConf?.cardIndicatorColumns ?? globalConfig.generalSettings?.defaultCardIndicatorColumns ?? [];

    const validHeaders = globalConfig.csvHeaders || [];
    const isGroupingEnabled = groupByCol && validHeaders.includes(groupByCol);

    // Basic validation
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
        console.warn("generateSummaryCsv: No sections configured."); return '';
    }
    if (!cardTitleCol || !validHeaders.includes(cardTitleCol)) {
        console.warn("generateSummaryCsv: Invalid cardTitleColumn."); return ''; // Title is essential
    }
    if (!dataToExport || dataToExport.length === 0) {
        console.log("generateSummaryCsv: No data to export for this tab."); return '';
    }

    // Filter indicator columns to only include valid ones
    const validIndicatorCols = cardIndicatorCols.filter(col => validHeaders.includes(col));

    // --- Define CSV Columns ---
    const csvHeaders = [
        "Section Title",
        ...(isGroupingEnabled ? [groupByCol] : []), // Add group column header if grouping
        cardTitleCol,
        ...validIndicatorCols
    ];

    const csvRows = [];
    // Add Header Row
    csvRows.push(csvHeaders.map(escapeCsvValue).join(','));

    // --- Process Data Section by Section ---
    let itemsProcessed = new Set(); // Keep track of rows already added

    // Pass 1: Specific Sections
    sections.forEach(sectionConf => {
        if (sectionConf.filterType === 'catchAll') return; // Skip catchAll for now

        const sectionTitle = sectionConf.title || 'Unnamed Section';
        // Find items matching this section's filter *within* the already filtered/sorted dataToExport
        const itemsInSection = dataToExport.filter(row =>
            !itemsProcessed.has(row) // Only consider items not yet processed
            && checkSummarySectionFilter(row, sectionConf, globalConfig)
        );

        itemsInSection.forEach(row => {
            itemsProcessed.add(row); // Mark as processed
            const rowData = [];
            rowData.push(escapeCsvValue(sectionTitle)); // Section Title

            if (isGroupingEnabled) { // Add Group Key if grouping
                const groupKeyValue = row[groupByCol] ?? '';
                rowData.push(escapeCsvValue(Array.isArray(groupKeyValue) ? groupKeyValue.join(', ') : groupKeyValue));
            }

            rowData.push(escapeCsvValue(row[cardTitleCol] ?? '')); // Card Title

            validIndicatorCols.forEach(indicatorCol => { // Indicators
                const formattedValue = getFormattedIndicatorText(row[indicatorCol], indicatorCol, globalConfig);
                rowData.push(escapeCsvValue(formattedValue));
            });
            csvRows.push(rowData.join(','));
        });
    });

    // Pass 2: Catch-All Section
    const catchAllSectionConf = sections.find(s => s.filterType === 'catchAll');
    if (catchAllSectionConf) {
        const sectionTitle = catchAllSectionConf.title || 'Other';
        const itemsForCatchAll = dataToExport.filter(row => !itemsProcessed.has(row)); // Get remaining items

        itemsForCatchAll.forEach(row => {
            // itemsProcessed.add(row); // Not strictly necessary to mark here
            const rowData = [];
            rowData.push(escapeCsvValue(sectionTitle)); // Section Title

            if (isGroupingEnabled) { // Add Group Key
                const groupKeyValue = row[groupByCol] ?? '';
                rowData.push(escapeCsvValue(Array.isArray(groupKeyValue) ? groupKeyValue.join(', ') : groupKeyValue));
            }

            rowData.push(escapeCsvValue(row[cardTitleCol] ?? '')); // Card Title

            validIndicatorCols.forEach(indicatorCol => { // Indicators
                const formattedValue = getFormattedIndicatorText(row[indicatorCol], indicatorCol, globalConfig);
                rowData.push(escapeCsvValue(formattedValue));
            });
            csvRows.push(rowData.join(','));
        });
    }

    // Join all rows with CRLF
    return csvRows.join('\r\n');
}

/**
 * Generates a CSV string representation of the Counts view data.
 * - If "countAllValues" counters are present, exports a "long" format breakdown
 *   (GroupBy, CountedColumn, CountedValue, Count). It will ignore predefined counters in this mode.
 * - If ONLY predefined counters are present, exports a "wide" format grid
 *   (Rows: Counters, Columns: GroupBy Values).
 *
 * @param {object[]} dataToExport The filtered data for the counts tab.
 * @param {object} tabConfig The configuration object for the specific counts tab.
 * @param {object} globalConfig The global application configuration.
 * @returns {string} The generated CSV content as a string.
 */
function generateCountsCsv(dataToExport, tabConfig, globalConfig) {
    const countsConf = tabConfig.config;
    const groupByCol = countsConf?.groupByColumn;
    const counters = countsConf?.counters;
    const validHeaders = globalConfig.csvHeaders || [];

    // Basic validation
    if (!groupByCol || !validHeaders.includes(groupByCol)) {
        console.warn("generateCountsCsv: Invalid groupByColumn."); return '';
    }
    if (!counters || !Array.isArray(counters) || counters.length === 0) {
        console.warn("generateCountsCsv: No counters configured."); return '';
    }
    if (!dataToExport || dataToExport.length === 0) {
        console.log("generateCountsCsv: No data to export for this tab."); return '';
    }

    // --- Separate counter types ---
    const predefinedCounters = counters.filter(c => c.filterType !== 'countAllValues');
    const countAllCounters = counters.filter(c => c.filterType === 'countAllValues');

    // --- Decide Export Mode ---
    const exportBreakdown = countAllCounters.length > 0; // Prioritize breakdown if configured

    if (exportBreakdown) {
        console.log("generateCountsCsv: Exporting 'countAllValues' breakdown (long format).");
        if (predefinedCounters.length > 0) {
             console.warn("generateCountsCsv: Both 'countAllValues' and predefined counters found. Export will only include the breakdown.");
        }
        // Aggregate data specifically for breakdown
        const dynamicCounts = {}; // { columnToCount: { groupByValue: { uniqueValue: count } } }
        const countAllColumns = countAllCounters.map(c => c.column).filter(Boolean);

        dataToExport.forEach(row => {
            let groupByValuesForRow = ['Uncategorized'];
            const rawGroupByValue = row[groupByCol];
            if (Array.isArray(rawGroupByValue)) {
                const meaningfulValues = rawGroupByValue.map(v => String(v ?? '').trim()).filter(v => v !== '');
                groupByValuesForRow = meaningfulValues.length > 0 ? meaningfulValues : ['Uncategorized'];
            } else if (rawGroupByValue !== null && typeof rawGroupByValue !== 'undefined' && String(rawGroupByValue).trim() !== '') {
                groupByValuesForRow = [String(rawGroupByValue)];
            }
             // NOTE: For simplicity in CSV, we'll just use the first group-by value if multiple exist
             const primaryGroupByValue = groupByValuesForRow[0];

            countAllColumns.forEach(columnToCount => {
                if (!validHeaders.includes(columnToCount)) return;

                const valuesInCell = row[columnToCount];
                const valuesToCount = Array.isArray(valuesInCell)
                    ? valuesInCell.map(v => String(v ?? 'N/A').trim()).filter(v => v !== '')
                    : [(valuesInCell === null || typeof valuesInCell === 'undefined' || String(valuesInCell).trim() === '') ? 'N/A' : String(valuesInCell).trim()];

                if (!dynamicCounts[columnToCount]) dynamicCounts[columnToCount] = {};
                if (!dynamicCounts[columnToCount][primaryGroupByValue]) dynamicCounts[columnToCount][primaryGroupByValue] = {};

                valuesToCount.forEach(uniqueVal => {
                    if (!dynamicCounts[columnToCount][primaryGroupByValue][uniqueVal]) {
                        dynamicCounts[columnToCount][primaryGroupByValue][uniqueVal] = 0;
                    }
                    dynamicCounts[columnToCount][primaryGroupByValue][uniqueVal]++;
                });
            });
        });

        // --- Generate Long Format CSV ---
        const csvRows = [];
        const breakdownHeaders = [groupByCol, "Counted Column", "Counted Value", "Count"];
        csvRows.push(breakdownHeaders.map(escapeCsvValue).join(','));

        // Iterate through the aggregated data
        Object.keys(dynamicCounts).sort().forEach(columnToCount => {
            const groups = dynamicCounts[columnToCount];
            Object.keys(groups).sort().forEach(groupByValue => {
                const uniqueValues = groups[groupByValue];
                Object.keys(uniqueValues).sort().forEach(uniqueValue => {
                    const count = uniqueValues[uniqueValue];
                    const rowData = [
                        groupByValue,
                        columnToCount,
                        // Use getFormattedIndicatorText for the counted value itself
                        getFormattedIndicatorText(uniqueValue, columnToCount, globalConfig),
                        count
                    ];
                    csvRows.push(rowData.map(escapeCsvValue).join(','));
                });
            });
        });
        return csvRows.join('\r\n');

    } else if (predefinedCounters.length > 0) {
        // --- Export Predefined Counters (Wide Format - Original Logic) ---
        console.log("generateCountsCsv: Exporting predefined counters (wide format).");
        const counts = {}; // { counterTitle: { groupByValue: count } }
        const allGroupByValues = new Set();

        dataToExport.forEach(row => {
            let groupByValuesForRow = ['Uncategorized'];
            // ... (same group-by value extraction as above) ...
             const rawGroupByValue = row[groupByCol];
             if (Array.isArray(rawGroupByValue)) {
                 const meaningfulValues = rawGroupByValue.map(v => String(v ?? '').trim()).filter(v => v !== '');
                 groupByValuesForRow = meaningfulValues.length > 0 ? meaningfulValues : ['Uncategorized'];
             } else if (rawGroupByValue !== null && typeof rawGroupByValue !== 'undefined' && String(rawGroupByValue).trim() !== '') {
                 groupByValuesForRow = [String(rawGroupByValue)];
             }
             groupByValuesForRow.forEach(gbVal => allGroupByValues.add(gbVal));
             const primaryGroupByValue = groupByValuesForRow[0];

            predefinedCounters.forEach(counterConfig => {
                 if (!counterConfig.column || !counterConfig.title || !counterConfig.filterType || !validHeaders.includes(counterConfig.column)) return;
                 const rowValueToCheck = row[counterConfig.column];
                 if (checkCounterFilter(rowValueToCheck, counterConfig, globalConfig)) {
                     const counterTitle = counterConfig.title;
                     if (!counts[counterTitle]) counts[counterTitle] = {};
                     if (!counts[counterTitle][primaryGroupByValue]) counts[counterTitle][primaryGroupByValue] = 0;
                     counts[counterTitle][primaryGroupByValue]++;
                 }
            });
        });

        const sortedCounterTitles = Object.keys(counts).sort((a, b) => a.localeCompare(b));
        const sortedGroupByValues = Array.from(allGroupByValues).sort((a, b) => a.localeCompare(b));

        if (sortedCounterTitles.length === 0 || sortedGroupByValues.length === 0) {
            console.log("generateCountsCsv: No counts recorded for predefined counters or no group-by values found.");
            return '';
        }

        const csvRows = [];
        const headerRowData = [groupByCol, ...sortedGroupByValues];
        csvRows.push(headerRowData.map(escapeCsvValue).join(','));

        sortedCounterTitles.forEach(counterTitle => {
            const rowData = [counterTitle];
            sortedGroupByValues.forEach(groupByValue => {
                const count = counts[counterTitle]?.[groupByValue] || 0;
                rowData.push(count);
            });
            csvRows.push(rowData.map(escapeCsvValue).join(','));
        });
        return csvRows.join('\r\n');

    } else {
        // No counters of either type found after filtering
        console.warn("generateCountsCsv: No valid counters configuration found for export.");
        return '';
    }
}

/**
 * Triggers a browser download for the given text content.
 * @param {string} content The text content to download.
 * @param {string} filename The desired filename for the downloaded file.
 * @param {string} [mimeType='text/csv;charset=utf-8;'] The MIME type for the file.
 */
function triggerCsvDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    if (!content) {
        console.warn("triggerCsvDownload: No content provided.");
        // Optionally show an alert to the user
        // alert("Nothing to download.");
        return;
    }

    // Add BOM for better Excel compatibility (especially with non-ASCII characters)
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + content], { type: mimeType });

    // Create a temporary link element
    const link = document.createElement("a");

    if (link.download !== undefined) { // Check if HTML5 download attribute is supported
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up
        console.log(`CSV download triggered: ${filename}`);
    } else {
        // Fallback for older browsers (might open in new window/tab)
        console.warn("triggerCsvDownload: Download attribute not supported. Trying fallback.");
        try {
             // Try navigator.msSaveBlob for IE/Edge
             if (navigator.msSaveBlob) {
                 navigator.msSaveBlob(blob, filename);
                 console.log(`CSV download triggered using msSaveBlob: ${filename}`);
             } else {
                 // Generic fallback (might not work well)
                 const url = URL.createObjectURL(blob);
                 window.open(url);
                 // No good way to revoke URL here reliably
             }
        } catch(e) {
             console.error("Error during CSV download fallback:", e);
             alert("Could not trigger download. Please check browser compatibility or console.");
        }
    }
}



