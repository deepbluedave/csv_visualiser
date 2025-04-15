// --- START OF FILE js/renderers/renderer-shared.js ---

/**
 * Checks if a value represents a "truthy" state based on config.generalSettings.trueValues.
 * Case-insensitive comparison.
 * @param {*} value The value to check.
 * @param {object} config The application configuration (global).
 * @returns {boolean} True if the value matches a configured true value.
 */
function isTruthy(value, config) {
    if (value === null || typeof value === 'undefined') return false;
    const stringValue = String(value).toLowerCase();
    if (stringValue === '') return false;
    const trueValsLower = (config.generalSettings?.trueValues || ["true", "yes", "1", "y", "x", "on", "✓"])
                            .map(v => String(v).toLowerCase());
    return trueValsLower.includes(stringValue);
}

/**
 * Formats a single value as an HTML tag based on indicatorStyles configuration.
 * Supports both legacy 'valueMap' and new 'styleRules' (with RegEx) for tags.
 * @param {string} value The single string value to format.
 * @param {object} config The application configuration (global).
 * @param {string} columnName The name of the column this value belongs to.
 * @param {string} [titlePrefix=''] Optional prefix for the tag's title attribute.
 * @returns {string} The HTML string for the tag, or an empty string if value is empty or no style applies.
 */
 function formatTag(value, config, columnName, titlePrefix = '') {
    const stringValue = String(value || '');
    // Skip truly empty strings unless config explicitly styles them via valueMap[''] or a rule matching empty
    // We'll check for explicit empty match later. If style is not found for empty, it returns ''.
    if (stringValue === '' && !(config.indicatorStyles?.[columnName]?.valueMap?.['']) && !(config.indicatorStyles?.[columnName]?.styleRules?.some(r => r.matchType === 'exact' && r.value === ''))) {
        // Only return empty if there isn't an explicit style defined for an empty string value
         if (!config.indicatorStyles?.[columnName]?.styleRules?.some(r => r.matchType === 'regex' && new RegExp(r.pattern).test(''))) {
              return '';
         }
    }


    const columnStyle = config.indicatorStyles?.[columnName];
    let tagStyle = null; // This will hold the final style object to apply

    // --- NEW: Check for styleRules first ---
    if (columnStyle && columnStyle.type === 'tag' && Array.isArray(columnStyle.styleRules)) {
        for (const rule of columnStyle.styleRules) {
            let match = false;
            try {
                if (rule.matchType === 'regex' && rule.pattern) {
                    const regex = new RegExp(rule.pattern); // Consider adding flags from config? e.g., 'i'
                    if (regex.test(stringValue)) {
                        match = true;
                    }
                } else if (rule.matchType === 'exact') {
                    // Exact match should be case-sensitive unless specified otherwise
                    if (stringValue === rule.value) {
                        match = true;
                    }
                }
            } catch (e) {
                 console.error(`Error processing styleRule for column "${columnName}", pattern "${rule.pattern || rule.value}":`, e);
            }

            if (match && rule.style) {
                tagStyle = rule.style;
                break; // First matching rule wins
            }
        }
        // If no rule matched, use the defaultStyle defined alongside styleRules
        if (!tagStyle) {
            tagStyle = columnStyle.defaultStyle || null; // Use configured default or null
        }
    }
    // --- FALLBACK: Check legacy valueMap if styleRules didn't match or don't exist ---
    else if (columnStyle && columnStyle.type === 'tag' && !tagStyle && columnStyle.valueMap) {
       const lowerValue = stringValue.toLowerCase();
       tagStyle = columnStyle.valueMap.hasOwnProperty(stringValue) ? columnStyle.valueMap[stringValue] :
                  columnStyle.valueMap.hasOwnProperty(lowerValue) ? columnStyle.valueMap[lowerValue] :
                  columnStyle.valueMap['default']; // Use valueMap's default
    }

    // --- Apply the determined style ---
    if (!tagStyle) {
        // If absolutely no style found (no rules, no valueMap, no defaults configured)
        // render a basic default tag to show *something* unless the value was empty string
         if (stringValue === '') return ''; // Don't render tag for empty string if no style matched
         return `<span class="tag tag-default" title="${titlePrefix}${stringValue}">${stringValue}</span>`;
    }

    // Allow style to explicitly define empty output (e.g., for hiding certain values)
    if (tagStyle.text === "" || tagStyle.value === "") return "";

    // Apply styles from the tagStyle object
    const displayText = tagStyle.text !== undefined ? tagStyle.text : stringValue; // Use defined text or original value
    const bgColor = tagStyle.bgColor || 'var(--color-tag-default-bg, #eee)';
    const textColor = tagStyle.textColor || 'var(--color-tag-default-text, #555)';
    const customTitle = tagStyle.title !== undefined ? tagStyle.title : `${titlePrefix || ''}${stringValue}`;
    const borderColor = tagStyle.borderColor || bgColor; // Default border to bg color

    let styleString = `background-color: ${bgColor}; color: ${textColor}; border-color: ${borderColor};`;
    if (tagStyle.borderWidth) styleString += ` border-width: ${tagStyle.borderWidth};`; // Example for extra style props
    if (tagStyle.fontWeight) styleString += ` font-weight: ${tagStyle.fontWeight};`;

    return `<span class="tag" style="${styleString}" title="${customTitle}">${displayText}</span>`;
}


/**
 * Generates an array of HTML strings for indicators (icons/tags) for a given column in a row.
 * Handles arrays for multi-value items. Prioritizes global linkColumns. Uses global indicatorStyles.
 * @param {object} row The data row object.
 * @param {string} columnName The header name of the column.
 * @param {object} config The application configuration object (global).
 * @returns {string[]} An array of HTML strings, each representing a single indicator. Returns empty array if no indicators are generated.
 */
function generateIndicatorsHTML(row, columnName, config) {
    const linkColumns = config.generalSettings?.linkColumns || [];
    const value = row[columnName];
    const styleConfig = config.indicatorStyles ? config.indicatorStyles[columnName] : null;
    const generatedHtmlArray = []; // <<< CHANGE: Initialize array

    // --- Global Link Column Check (Highest Priority) ---
    if (linkColumns.includes(columnName)) {
        const valuesToCheck = Array.isArray(value) ? value : [value];
        valuesToCheck.forEach(singleValue => {
            const url = String(singleValue || '').trim();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                // <<< CHANGE: Push link HTML to array
                generatedHtmlArray.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" title="Open Link: ${url}" class="card-link-icon">🔗</a>`);
            }
            // Optionally handle non-URL text in link columns if needed, or ignore it
        });
        return generatedHtmlArray; // <<< CHANGE: Return the array of links
    }

    // --- Standard Indicator Style Logic ---
    if (!styleConfig || styleConfig.type === 'none') return generatedHtmlArray; // <<< CHANGE: Return empty array

    const valuesToProcess = Array.isArray(value) ? value : [value];

    valuesToProcess.forEach(singleValue => {
        const currentValue = singleValue ?? '';
        let itemHtml = ''; // HTML for this specific value

        try {
            // --- ICON type --- (Logic remains largely the same)
            if (styleConfig.type === 'icon') {
                // ... (keep the existing icon logic as it generates a single span string 'currentIconHtml') ...
                 let iconApplied = false;
                 let currentIconHtml = '';
 
                 // 1. Check trueCondition
                 if (styleConfig.trueCondition && !iconApplied && isTruthy(currentValue, config)) {
                     currentIconHtml = `<span class="csv-dashboard-icon ${styleConfig.trueCondition.cssClass || ''}" title="${styleConfig.trueCondition.title || columnName}">${styleConfig.trueCondition.value || '?'}</span>`;
                     iconApplied = true;
                 }
                 // 2. Check valueMap...
                 if (styleConfig.valueMap && !iconApplied) {
                     // ... (valueMap logic remains the same) ...
                      const valueLower = String(currentValue).toLowerCase();
                      let mapping = null;
                      if (styleConfig.valueMap.hasOwnProperty(currentValue)) mapping = styleConfig.valueMap[currentValue];
                      else if (styleConfig.valueMap.hasOwnProperty(valueLower)) mapping = styleConfig.valueMap[valueLower];
                      // ... (falsey checks) ...
                      if (!mapping) {
                         if (styleConfig.valueMap.hasOwnProperty(currentValue) && styleConfig.valueMap[currentValue]?.value === "") mapping = styleConfig.valueMap[currentValue];
                         else if (styleConfig.valueMap.hasOwnProperty('false') && valueLower === 'false') mapping = styleConfig.valueMap['false'];
                         else if (styleConfig.valueMap.hasOwnProperty('FALSE') && String(currentValue) === 'FALSE') mapping = styleConfig.valueMap['FALSE'];
                         else if (styleConfig.valueMap.hasOwnProperty('0') && String(currentValue) === '0') mapping = styleConfig.valueMap['0'];
                         else if (styleConfig.valueMap.hasOwnProperty('') && currentValue === '') mapping = styleConfig.valueMap[''];
                     }
                     // Apply mapping if found...
                     if (mapping && mapping !== styleConfig.valueMap.default && mapping.value !== undefined) {
                          if (mapping.value !== "") currentIconHtml = `<span class="csv-dashboard-icon ${mapping.cssClass || ''}" title="${mapping.title || columnName + ': ' + currentValue}">${mapping.value}</span>`;
                          else currentIconHtml = "";
                          iconApplied = true;
                     }
                     // 3. Check default...
                      else if (styleConfig.valueMap.default && !iconApplied && styleConfig.valueMap.default.value !== undefined) {
                          const defaultMapping = styleConfig.valueMap.default;
                           if (defaultMapping.value !== "") {
                             currentIconHtml = `<span class="csv-dashboard-icon ${defaultMapping.cssClass || ''}" title="${defaultMapping.title || columnName + ': ' + currentValue}">${defaultMapping.value}</span>`;
                             iconApplied = true;
                           }
                      }
                 }
                itemHtml += currentIconHtml;
            }
            // --- TAG type --- (Now uses updated formatTag internally)
            else if (styleConfig.type === 'tag') {
                // formatTag already returns a single tag string or empty string
                const tagHTML = formatTag(currentValue, config, columnName, styleConfig.titlePrefix);
                if (tagHTML) {
                    itemHtml += tagHTML;
                }
            }
        } catch (e) {
            console.error(`Error generating standard indicator for column "${columnName}", value "${currentValue}":`, e);
        }

        // <<< CHANGE: Push the generated HTML for this single item to the array
        if (itemHtml !== '') { // Only push if something was generated
           generatedHtmlArray.push(itemHtml);
        }
    }); // End forEach value

    // <<< CHANGE: Remove separator/joining logic, just return the array
    // const separator = (styleConfig?.layout === 'stacked' && generatedHtmlArray.length > 1) ? '<br>' : ' ';
    // indicatorsHTML = generatedHtmlArray.join(separator);
    return generatedHtmlArray;
}

// --- createInitiativeCard and renderGroupedItemsAsGrid remain unchanged ---
// --- They rely on generateIndicatorsHTML which now handles stacking internally ---

/**
 * Creates the HTML structure for a single initiative card.
 * Reads configuration from the specific tab's config (`tabViewConfig`).
 * Uses global config for headers, indicators, etc. (`globalConfig`).
 * Renders indicators using flexbox layout.
 * @param {object} row The data row object.
 * @param {object} tabViewConfig The configuration object for the specific tab this card belongs to (e.g., tab.config).
 * @param {object} globalConfig The global application configuration object.
 * @param {string} [cardClass='kanban-card'] The CSS class for the card element.
 * @returns {HTMLElement} The card DOM element.
 */
function createInitiativeCard(row, tabViewConfig, globalConfig, cardClass = 'kanban-card') {
    const cardDiv = document.createElement('div');
    cardDiv.className = cardClass;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'card-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'card-title';

    // ... (Title column determination and link handling remains the same) ...
    let titleCol = 'Title';
    const validHeaders = globalConfig.csvHeaders || [];
    if (validHeaders.length > 0 && !validHeaders.includes(titleCol)) titleCol = validHeaders[0];
    const specificTitleCol = tabViewConfig?.cardTitleColumn;
    if (specificTitleCol && validHeaders.includes(specificTitleCol)) titleCol = specificTitleCol;
    const titleValue = validHeaders.includes(titleCol) ? (row[titleCol] || `[No ${titleCol}]`) : `[${titleCol} Header Missing]`;
    titleSpan.textContent = titleValue;

    const titleLinkColumn = tabViewConfig?.cardLinkColumn;
    let linkElement = null;
    if (titleLinkColumn && validHeaders.includes(titleLinkColumn) && row[titleLinkColumn]) {
        const url = String(row[titleLinkColumn]).trim();
        if (url.startsWith('http://') || url.startsWith('https://')) {
             linkElement = document.createElement('a');
             linkElement.href = url; linkElement.target = '_blank'; linkElement.rel = 'noopener noreferrer';
             linkElement.className = 'card-title-link'; linkElement.title = `Link to: ${url}`;
        }
    }
    if (linkElement) {
        titleSpan.title = titleValue; linkElement.appendChild(titleSpan); headerDiv.appendChild(linkElement);
    } else {
        titleSpan.title = titleValue; headerDiv.appendChild(titleSpan);
    }
    // --- *** END Title part *** ---


    // --- *** UPDATED: Indicators Handling *** ---
    const indicatorsSpan = document.createElement('span');
    indicatorsSpan.className = 'card-indicators'; // CSS will apply flex display to this

    const indicatorCols = tabViewConfig?.cardIndicatorColumns || []; // Use passed tab config

    indicatorCols.forEach(colName => {
        if (validHeaders.includes(colName)) {
            // Call the MODIFIED generateIndicatorsHTML which returns an ARRAY of HTML strings
            const indicatorHtmlArray = generateIndicatorsHTML(row, colName, globalConfig);

            // Append each indicator HTML string to the container
            indicatorHtmlArray.forEach(indicatorHtmlString => {
                 // Use insertAdjacentHTML for potentially better performance than repeated innerHTML+=
                 indicatorsSpan.insertAdjacentHTML('beforeend', indicatorHtmlString);
                 // Note: Spacing between indicators is now handled by CSS 'gap' property
            });
        }
    });

    if (indicatorsSpan.childNodes.length > 0) { // Check if any indicators were actually added
        headerDiv.appendChild(indicatorsSpan);
    }
     // --- *** END UPDATED: Indicators Handling *** ---

    cardDiv.appendChild(headerDiv);
    return cardDiv;
}


/**
 * Renders grouped data items into a grid structure, potentially using column wrappers for stacking.
 * Uses layoutConfig from the specific tab (`tabViewConfig`).
 * @param {HTMLElement} parentGridContainer The container element where the grid/columns will be appended.
 * @param {object} groupedData Data grouped by a key.
 * @param {object} tabViewConfig Configuration object for the specific tab (e.g., tab.config).
 * @param {object} globalConfig The main application configuration.
 * @param {string} cardClass CSS class for individual item cards.
 * @param {string} groupBlockClass CSS class for the block containing items of a single group key.
 * @param {string} columnWrapperClass CSS class for the optional wrapper div used for stacking group blocks.
 * @param {string} [groupTitleElement='h4'] HTML tag name for the group title (e.g., 'h3', 'h4').
 * @param {string[]|null} [sortedKeys=null] Optional pre-sorted array of keys from groupedData.
 */
 function renderGroupedItemsAsGrid(parentGridContainer, groupedData, tabViewConfig, globalConfig, cardClass, groupBlockClass, columnWrapperClass, groupTitleElement = 'h4', sortedKeys = null) {
    const keysToRender = sortedKeys ? sortedKeys : Object.keys(groupedData).sort();
    if (keysToRender.length === 0) return;

    // Get layout config from the specific tab config
    const layoutConfig = tabViewConfig?.layout || tabViewConfig?.internalLayout; // Check both possible names

    const maxGroupsPerColumn = Math.max(1, parseInt(layoutConfig?.maxItemsPerGroupInColumn, 10) || 1);

    let currentColumnWrapper = null;
    let groupsInCurrentColumn = 0;

    keysToRender.forEach(groupKey => {
        const groupItems = groupedData[groupKey];
        if (!groupItems || groupItems.length === 0) return;

        let targetContainer;

        // Determine if stacking wrappers are needed
        if (maxGroupsPerColumn > 1) {
             if (currentColumnWrapper === null || groupsInCurrentColumn >= maxGroupsPerColumn) {
                currentColumnWrapper = document.createElement('div');
                currentColumnWrapper.className = columnWrapperClass;
                if (layoutConfig?.itemGap) currentColumnWrapper.style.gap = layoutConfig.itemGap;
                parentGridContainer.appendChild(currentColumnWrapper);
                groupsInCurrentColumn = 0;
            }
            targetContainer = currentColumnWrapper;
        } else {
            targetContainer = parentGridContainer;
        }

        // Create the group block
        const groupBlockDiv = document.createElement('div');
        groupBlockDiv.className = groupBlockClass;

        // Add header
        const header = document.createElement(groupTitleElement);
        header.textContent = groupKey;
        groupBlockDiv.appendChild(header);

        // Add cards (passing tabViewConfig and globalConfig)
        groupItems.forEach(row => {
            // Pass the specific tab's config object which contains cardIndicatorColumns etc.
            groupBlockDiv.appendChild(createInitiativeCard(row, tabViewConfig, globalConfig, cardClass));
        });

        // Append the block
        if (targetContainer) {
            targetContainer.appendChild(groupBlockDiv);
            if (maxGroupsPerColumn > 1) groupsInCurrentColumn++;
        } else {
             console.error("renderGroupedItemsAsGrid: targetContainer is unexpectedly null.");
        }
    });
}

// --- START OF REPLACEMENT for sortData in js/renderers/renderer-shared.js ---

/**
 * Sorts an array of data objects based on multiple criteria defined in sortByConfig.
 * Handles basic string, numeric comparison, custom ordering, and null/undefined values.
 * @param {object[]} dataArray The array of data objects to sort (will be sorted in place).
 * @param {object[]} sortByConfig Array of sort criteria, e.g., [{ column: 'ColA', direction: 'asc' }, { column: 'ColB', direction: 'custom', order: ['High', 'Medium', 'Low'] }].
 * @param {object} globalConfig The global configuration, used to access csvHeaders for validation.
 * @returns {object[]} The sorted dataArray (same array instance passed in). Returns original array if sortByConfig is invalid or dataArray is not an array.
 */
function sortData(dataArray, sortByConfig, globalConfig) {
    // Basic validation of inputs
    if (!Array.isArray(dataArray)) {
        console.warn("sortData: dataArray is not an array. Returning original.");
        return dataArray;
    }
    if (!Array.isArray(sortByConfig) || sortByConfig.length === 0) {
        return dataArray; // No sorting requested
    }

    const validHeaders = globalConfig?.csvHeaders || [];

    // --- Pre-process and validate sort criteria ---
    const validSortBy = sortByConfig.map(criterion => {
        // Basic structure check
        if (!criterion || typeof criterion !== 'object' || !criterion.column) {
            console.warn(`sortData: Invalid sort criterion structure found. Ignoring criterion:`, criterion);
            return null;
        }
        // Check if column exists
        if (!validHeaders.includes(criterion.column)) {
            console.warn(`sortData: Invalid or missing sort column "${criterion.column}". Ignoring criterion.`);
            return null;
        }
        // Validate direction and custom order
        const direction = String(criterion.direction || 'asc').toLowerCase();
        let order = null;
        if (direction === 'custom') {
            if (!Array.isArray(criterion.order) || criterion.order.length === 0) {
                console.warn(`sortData: Sort direction is 'custom' for column "${criterion.column}" but 'order' array is missing or empty. Falling back to 'asc'.`);
                return { ...criterion, direction: 'asc' }; // Fallback
            }
            // Pre-process custom order to lowercase strings for efficient lookup
            order = criterion.order.map(item => String(item ?? '').toLowerCase());
        } else if (!['asc', 'desc'].includes(direction)) {
            console.warn(`sortData: Invalid sort direction "${criterion.direction}" for column "${criterion.column}". Defaulting to 'asc'.`);
            return { ...criterion, direction: 'asc' }; // Default
        }

        return { ...criterion, direction, order }; // Return processed criterion
    }).filter(Boolean); // Remove null entries from invalid criteria

    // Exit if no valid criteria remain
    if (validSortBy.length === 0) {
        console.warn("sortData: No valid sort criteria found after validation.");
        return dataArray;
    }

    // --- The Core Comparison Function ---
    const comparisonFunction = (a, b) => {
        for (const criterion of validSortBy) {
            const { column, direction, order } = criterion; // Get processed values
            const valA = a[column];
            const valB = b[column];

            // Consistent handling of null/undefined values:
            // nulls/undefined are considered "greater" than actual values,
            // so they appear last in 'asc' and first in 'desc'.
            const aIsNull = valA === null || typeof valA === 'undefined';
            const bIsNull = valB === null || typeof valB === 'undefined';

            if (aIsNull && bIsNull) {
                continue; // Both null/undefined, treat as equal for this level, move to next criterion
            }
            if (aIsNull) {
                return 1; // null/undefined ('a') is greater than non-null ('b')
            }
            if (bIsNull) {
                return -1; // non-null ('a') is less than null/undefined ('b')
            }
            // --- From here, both valA and valB are non-null/undefined ---

            let comparison = 0;

            // --- Custom Order Logic ---
            if (direction === 'custom') {
                // 'order' array is guaranteed to exist and be lowercase string array here
                const valALower = String(valA).toLowerCase();
                const valBLower = String(valB).toLowerCase();
                const indexA = order.indexOf(valALower);
                const indexB = order.indexOf(valBLower);

                if (indexA !== -1 && indexB !== -1) {
                    // Both values found in custom order: compare indices
                    comparison = indexA - indexB;
                } else if (indexA !== -1) {
                    // Only A is in the list, A comes first
                    comparison = -1;
                } else if (indexB !== -1) {
                    // Only B is in the list, B comes first
                    comparison = 1;
                } else {
                    // Neither is in the list, fall back to standard string comparison
                    // to maintain some stable order for unlisted items.
                    comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                }
            }
            // --- Standard Asc/Desc Logic ---
            else {
                // Attempt numeric comparison first
                const numA = Number(valA);
                const numB = Number(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    comparison = numA - numB;
                } else {
                    // Fallback to locale-aware string comparison (handles numbers in strings too)
                    comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                }

                // Apply descending order if specified and values differ
                if (comparison !== 0 && direction === 'desc') {
                    comparison *= -1;
                }
            } // --- End Standard Asc/Desc ---

            // If a difference was found based on this criterion, return the result
            if (comparison !== 0) {
                return comparison;
            }
            // Otherwise, values are equal for this criterion, continue to the next one
        }

        // All criteria resulted in equality
        return 0;
    }; // --- End of comparisonFunction ---

    // Sort the array in place using the comparison function
    try {
        dataArray.sort(comparisonFunction);
    } catch (error) {
        console.error("Error during dataArray.sort():", error);
        // Optionally return original array on error, or re-throw
        return dataArray;
    }

    return dataArray; // Return the sorted array (same instance)
}






// --- END OF FILE js/renderers/renderer-shared.js ---
// --- START OF FILE js/config-loader.js ---

/**
 * Applies the dashboard title from the configuration to the document and H1 tag.
 * Uses global config.
 * @param {object} config The global application configuration object.
 * @param {HTMLElement} mainHeading The H1 element.
 */
 function applyCustomTitle(config, mainHeading) {
    const titleText = config?.generalSettings?.dashboardTitle || 'CSV Dashboard';
    document.title = titleText;
    if (mainHeading) {
        mainHeading.textContent = titleText;
    } else {
        console.warn("applyCustomTitle: Could not find H1 element to update.");
    }
}

/**
 * Applies dynamic CSS styles based on the configuration (e.g., layout dimensions).
 * Iterates through tabs to apply specific layout styles to tab content containers.
 * @param {object} config The global application configuration object.
 */
 function applyConfigStyles(config) {
    try {
        // Iterate through tabs to apply specific layout styles if needed
        config.tabs?.forEach(tab => {
            if (tab.enabled === false) return; // Skip disabled tabs

            const tabContentElement = document.getElementById(`tab-content-${tab.id}`);
            if (!tabContentElement) return; // Skip if element doesn't exist yet

            // Apply Kanban layout styles from tab config
            if (tab.type === 'kanban' && tab.config?.layout) {
                const layout = tab.config.layout;
                // Set CSS variables scoped to the specific tab container
                tabContentElement.style.setProperty('--kanban-min-col-width', layout.minColumnWidth || '280px');
                tabContentElement.style.setProperty('--kanban-gap', layout.columnGap || '15px');
                tabContentElement.style.setProperty('--kanban-item-gap', layout.itemGap || '12px');
            }

            // Apply Summary internal layout styles from tab config
            if (tab.type === 'summary' && tab.config?.internalLayout) {
                const layout = tab.config.internalLayout;
                // Set CSS variables scoped to the specific tab container (or section if needed)
                tabContentElement.style.setProperty('--summary-inner-min-col-width', layout.minColumnWidth || '260px');
                tabContentElement.style.setProperty('--summary-inner-column-gap', layout.columnGap || '15px');
                tabContentElement.style.setProperty('--summary-inner-item-gap', layout.itemGap || '10px');
            }
            // Apply Counts layout styles (if any defined in future)
            // if (tab.type === 'counts' && tab.config?.layout) { ... }
        });
    } catch (e) {
        console.error("Error applying config styles:", e);
    }
}

// --- END OF FILE js/config-loader.js ---
// --- START OF FILE js/data-handler.js ---

/**
 * Parses a single line of CSV text, respecting quotes and escaped quotes.
 * @param {string} line The CSV line string.
 * @param {string} delimiter The delimiter character.
 * @returns {string[]} An array of field values.
 */
function parseCSVLine(line, delimiter = ',') {
    const values = [];
    let currentPos = 0;
    let insideQuotes = false;
    let currentValue = '';

    while (currentPos < line.length) {
        const char = line[currentPos];

        if (insideQuotes) {
            if (char === '"') {
                if (currentPos + 1 < line.length && line[currentPos + 1] === '"') {
                    currentValue += '"';
                    currentPos++;
                } else {
                    insideQuotes = false;
                }
            } else {
                currentValue += char;
            }
        } else {
            if (char === '"') {
                if (currentValue === '') {
                   insideQuotes = true;
                } else {
                   currentValue += char;
                }
            } else if (char === delimiter) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        currentPos++;
    }

    values.push(currentValue);
    return values.map(v => v.trim());
}

/**
 * Parses the entire CSV text content.
 * Handles multi-value columns specified in global config.
 * Returns the parsed data and headers.
 * @param {string} csvText The raw CSV content.
 * @param {object} config The global application configuration.
 * @returns {{data: object[], headers: string[]}} Object containing parsed data and headers.
 * @throws {Error} If CSV is empty or parsing fails critically.
 */
 function parseCSV(csvText, config) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 1) {
        console.warn("parseCSV: CSV appears empty or has no header row.");
        return { data: [], headers: [] };
    }

    // Use global settings
    const delimiter = config.generalSettings?.csvDelimiter || ',';
    const headers = parseCSVLine(lines[0], delimiter);

    if (lines.length < 2) {
        console.warn("parseCSV: CSV has headers but no data rows.");
        return { data: [], headers: headers };
    }

    const data = [];
    const multiValCols = config.generalSettings?.multiValueColumns || [];

    for (let i = 1; i < lines.length; i++) {
        const lineText = lines[i].trim();
        if (!lineText) continue;

        const values = parseCSVLine(lineText, delimiter);
         if (values.length !== headers.length && values.length > 0) {
             console.warn(`parseCSV: Row ${i + 1} has ${values.length} fields, but header has ${headers.length}. Data may be misaligned. Line: "${lineText}"`);
         }

        const rowObject = {};
        let hasContent = false;

        for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            if (header) {
                let value = values[j] ?? '';

                // Multi-Value Splitting (using global config)
                if (multiValCols.includes(header) && typeof value === 'string' && value.includes(',')) {
                    value = value.split(',')
                                 .map(part => part.trim())
                                 .filter(part => part !== '');
                    if (value.length === 1) value = value[0];
                    else if (value.length === 0) value = '';
                }

                rowObject[header] = value;
                if (value && ((typeof value === 'string' && value.length > 0) || (Array.isArray(value) && value.length > 0))) {
                     hasContent = true;
                }
            }
        }

        if (hasContent) {
            data.push(rowObject);
        }
    }
    return { data, headers };
}


/**
 * Fetches CSV data from the specified URL (using global config).
 * @param {string} url The URL to fetch the CSV from.
 * @returns {Promise<string>} Resolves with the CSV content as a string.
 * @throws {Error} If fetching fails or response is not ok.
 */
 async function loadDataFromUrl(url) {
    console.log(`Attempting to fetch data from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error fetching CSV: ${response.status} ${response.statusText} from ${url}`);
        }
        const csvContent = await response.text();
        console.log(`Successfully fetched ${csvContent.length} characters from URL.`);
        return csvContent;
    } catch (error) {
        let errorMsg = `Error loading from URL: ${error.message}.`;
         if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
              errorMsg += ` Check network connection, URL validity (${url}), and CORS policy on the server hosting the CSV.`;
         }
        console.error("Error in loadDataFromUrl:", errorMsg);
        throw new Error(errorMsg);
    }
}


/**
 * Reads CSV content from a user-selected file.
 * @param {File} file The file object selected by the user.
 * @returns {Promise<string>} Resolves with the CSV content as a string.
 * @throws {Error} If file reading fails.
 */
 function readFileContent(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error("No file provided."));
        }
        console.log(`readFileContent: Reading file: ${file.name}`);
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvContent = e.target.result;
            if (csvContent === null || csvContent === undefined) {
                 console.error("FileReader.onload: CSV content is null/undefined.");
                 return reject(new Error("Could not read file content (result was null/undefined)."));
            }
            console.log(`FileReader.onload: Read ${csvContent.length} characters.`);
            resolve(csvContent);
        };
        reader.onerror = function(evt) {
            console.error("FileReader error:", reader.error);
            reject(new Error(`Error reading file: ${reader.error.message || 'Unknown error'}`));
        };
        reader.readAsText(file);
    });
}

// --- Data Filtering Logic ---

/**
 * Checks if a single row matches a specific filter condition.
 * Handles multi-value columns based on filter type.
 * @param {object} row The data row object.
 * @param {object} condition The filter condition object {column, filterType, filterValue}.
 * @param {object} globalConfig The global application configuration (for trueValues, headers).
 * @returns {boolean} True if the row matches the condition. 
 */
//  this if needed by renderers directly, otherwise keep internal
/*  */ function checkCondition(row, condition, globalConfig) {
    const { column, filterType, filterValue } = condition;
    const headers = globalConfig.csvHeaders || [];

    // Check if filter column exists only if the filter type requires one
    const requiresColumn = ![
        'catchAll',
        /* Future types not needing a column */
    ].includes(filterType);

    if (requiresColumn && (!column || !headers.includes(column))) {
        // console.warn(`Filter condition references non-existent or missing required column: "${column}". Condition fails.`);
        return false;
    }

    const rowValue = requiresColumn ? row[column] : null; // Get value only if needed

    // Normalize rowValue to an array for consistent checks
    const valuesToCheck = Array.isArray(rowValue) ? rowValue : (rowValue === null || typeof rowValue === 'undefined' ? [rowValue] : [String(rowValue)]);

    try {
        switch (filterType) {
            case 'valueEquals': {
                const targetValue = String(filterValue ?? '').toLowerCase();
                return valuesToCheck.some(v => String(v ?? '').toLowerCase() === targetValue);
            }
            case 'valueIsNot': {
                const targetValue = String(filterValue ?? '').toLowerCase();
                 return valuesToCheck.every(v => v === null || typeof v === 'undefined' || String(v ?? '').toLowerCase() !== targetValue);
            }
            case 'valueInList': {
                const filterListLower = Array.isArray(filterValue) ? filterValue.map(fv => String(fv ?? '').toLowerCase()) : [];
                if (filterListLower.length === 0) return false;
                return valuesToCheck.some(v => v !== null && typeof v !== 'undefined' && filterListLower.includes(String(v).toLowerCase()));
            }
            case 'valueNotInList': {
                const filterListLower = Array.isArray(filterValue) ? filterValue.map(fv => String(fv ?? '').toLowerCase()) : [];
                if (filterListLower.length === 0) return true;
                 return valuesToCheck.every(v => v === null || typeof v === 'undefined' || !filterListLower.includes(String(v).toLowerCase()));
            }
             case 'valueNotEmpty':
                 return valuesToCheck.some(v => v !== null && typeof v !== 'undefined' && String(v) !== '');
             case 'valueIsEmpty':
                 return valuesToCheck.every(v => v === null || typeof v === 'undefined' || String(v) === '');
            case 'booleanTrue':
                 return valuesToCheck.some(v => isTruthy(v, globalConfig));
            case 'booleanFalse':
                 return valuesToCheck.every(v => !isTruthy(v, globalConfig));
            case 'contains': {
                const searchTerm = String(filterValue ?? '').toLowerCase();
                if (!searchTerm) return false;
                return valuesToCheck.some(v => v !== null && typeof v !== 'undefined' && String(v).toLowerCase().includes(searchTerm));
            }
            case 'doesNotContain': {
                const searchTerm = String(filterValue ?? '').toLowerCase();
                if (!searchTerm) return true;
                 return valuesToCheck.every(v => v === null || typeof v === 'undefined' || !String(v).toLowerCase().includes(searchTerm));
            }
            // Add numeric comparisons here later if needed
            default:
                console.warn(`Unsupported filterType: "${filterType}". Condition fails.`);
                return false;
        }
    } catch (e) {
        console.error(`Error checking filter condition for column "${column}", type "${filterType}":`, e);
        return false;
    }
}

/**
 * Applies the complete filter configuration (AND/OR logic) for a tab to the dataset.
 * @param {object[]} data The full dataset.
 * @param {object | null} filterConfig The tab's filter configuration object, or null if no filter.
 * @param {object} globalConfig The global application configuration.
 * @returns {object[]} The filtered dataset.
 */
 function applyTabFilter(data, filterConfig, globalConfig) {
    if (!filterConfig || !filterConfig.conditions || filterConfig.conditions.length === 0) {
        return data; // No filter applied
    }

    const { logic = 'AND', conditions } = filterConfig;

    return data.filter(row => {
        if (logic.toUpperCase() === 'OR') {
            return conditions.some(condition => checkCondition(row, condition, globalConfig));
        } else { // Default to AND
            return conditions.every(condition => checkCondition(row, condition, globalConfig));
        }
    });
}


// --- END OF FILE js/data-handler.js ---
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
    const sortByConfig = tabConfig.config?.sortBy;
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

        // --- *** UPDATED: Resolve itemSortBy using defaults *** ---
        // Resolve the sort configuration: Use tab-specific if defined, otherwise use global default, else null
        const itemSortConfig = tabConfig.config?.itemSortBy ?? globalConfig.generalSettings?.defaultItemSortBy ?? null;
        // Use sortData helper, passing a copy of groupData to avoid modifying original
        const itemsToRender = sortData([...groupData], itemSortConfig, globalConfig);
        // --- *** END UPDATED *** ---

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
            // --- *** UPDATED: Resolve indicators and pass config slice *** ---
            // Resolve indicators: Use tab-specific if defined, otherwise use global default, else empty array
            const indicatorsToUse = tabConfig.config?.cardIndicatorColumns ?? globalConfig.generalSettings?.defaultCardIndicatorColumns ?? [];

            // Create a temporary config object slice to pass to createInitiativeCard
            const cardCreationConfig = {
                ...tabConfig.config, // Copy other card-related configs (like cardTitleColumn, cardLinkColumn)
                cardIndicatorColumns: indicatorsToUse // Use the resolved list
            };

            // Pass the resolved config slice to createInitiativeCard
            groupBlockDiv.appendChild(createInitiativeCard(row, cardCreationConfig, globalConfig, 'kanban-card'));
             // --- *** END UPDATED *** ---
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
// --- START OF FILE js/renderers/renderer-summary.js ---

/**
 * Checks if a row matches the filter criteria defined in a summary section configuration.
 * Operates on data already potentially filtered by the main tab filter.
 * @param {object} row The data row object.
 * @param {object} sectionConf The configuration object for the summary section.
 * @param {object} globalConfig The main application configuration.
 * @returns {boolean} True if the row matches the section's filter criteria.
 */
function checkSummarySectionFilter(row, sectionConf, globalConfig) {
    if (!sectionConf || !sectionConf.filterType) return false;
    if (sectionConf.filterType === 'catchAll') return false; // Handled separately

    const filterColumn = sectionConf.filterColumn;
    const requiresColumn = !['catchAll'].includes(sectionConf.filterType);

    if (requiresColumn && !filterColumn) {
        console.warn(`checkSummarySectionFilter: filterColumn missing for type "${sectionConf.filterType}" in section "${sectionConf.title}".`);
        return false;
    }
    // Ensure globalConfig and csvHeaders are available before checking includes
    if (filterColumn && (!globalConfig || !globalConfig.csvHeaders || !globalConfig.csvHeaders.includes(filterColumn))) {
        // console.warn(`checkSummarySectionFilter: filterColumn "${filterColumn}" not found in CSV headers. Filter fails.`);
        return false;
    }

    // Use the core checkCondition logic
    const condition = {
       column: sectionConf.filterColumn,
       filterType: sectionConf.filterType,
       filterValue: sectionConf.filterValue
    };
    return checkCondition(row, condition, globalConfig); // Use imported checkCondition
}


/**
* Renders the Summary View, including filtered sections and catch-all.
* Uses configuration specific to the tab.
* Resolves itemSortBy and cardIndicatorColumns using defaults from generalSettings if not specified in tab config.
* @param {object[]} filteredData The data rows already filtered for this tab.
* @param {object} tabConfig The configuration object for this specific summary tab.
* @param {object} globalConfig The global application configuration.
* @param {HTMLElement} targetElement The container element for this tab.
* @param {Function} showMessage Function to display messages.
*/
function renderSummaryView(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
   if (!targetElement) { console.error("renderSummaryView: Target element not provided."); return; }
   targetElement.innerHTML = '';
   setMessagePlaceholder(tabConfig.id, '', false);
   targetElement.style.display = 'flex';
   targetElement.style.flexDirection = 'column';
   targetElement.style.gap = 'var(--gap-size, 15px)';

   const sectionsConfig = tabConfig.config?.sections;
   if (!sectionsConfig || !Array.isArray(sectionsConfig) || sectionsConfig.length === 0) {
        showMessage(`Summary tab "${tabConfig.title}" has no 'sections' configured.`, tabConfig.id);
        return;
   }
   if (!filteredData || filteredData.length === 0) {
       showMessage(`No data matches the filter criteria for tab "${tabConfig.title}".`, tabConfig.id);
       return;
   }

   const summaryGroupByCol = tabConfig.config?.groupByColumn;
   const internalLayoutConf = tabConfig.config?.internalLayout;
   const validHeaders = globalConfig.csvHeaders || [];
   let itemsProcessed = new Set();
   const isGroupingValid = summaryGroupByCol && validHeaders.includes(summaryGroupByCol);
   if (summaryGroupByCol && !isGroupingValid) { console.warn(`Summary tab "${tabConfig.title}": groupByColumn "${summaryGroupByCol}" is invalid.`); }

   // --- Helper createSection ---
   const createSection = (sectionConf, items) => {
       const sectionDiv = document.createElement('div');
       sectionDiv.className = 'summary-section';
       sectionDiv.id = `summary-section-${tabConfig.id}-${sectionConf.id || sectionConf.title.replace(/\s+/g, '-').toLowerCase()}`;
       if (sectionConf.bgColor) sectionDiv.style.backgroundColor = sectionConf.bgColor;
       if (sectionConf.textColor) sectionDiv.style.color = sectionConf.textColor;

       // Apply internal layout vars to section
       if (internalLayoutConf) {
            sectionDiv.style.setProperty('--summary-inner-min-col-width', internalLayoutConf.minColumnWidth || '260px');
            sectionDiv.style.setProperty('--summary-inner-column-gap', internalLayoutConf.columnGap || '15px');
            sectionDiv.style.setProperty('--summary-inner-item-gap', internalLayoutConf.itemGap || '10px');
       }

       const titleH3 = document.createElement('h3');
       titleH3.textContent = sectionConf.title || 'Section';
       sectionDiv.appendChild(titleH3);

       if (!Array.isArray(items)) { // Added safety check
            console.error(`createSection called with non-array items for section "${sectionConf.title}"`);
            const errorMsg = document.createElement('div'); errorMsg.className = 'empty-section-message'; errorMsg.style.color = 'red';
            errorMsg.textContent = `Error: Invalid data for section.`; sectionDiv.appendChild(errorMsg);
       } else if (items.length === 0) {
           const emptyMsg = document.createElement('div'); emptyMsg.className = 'empty-section-message';
           emptyMsg.textContent = `No items match criteria for this section.`; sectionDiv.appendChild(emptyMsg);
       } else {

           // --- *** UPDATED: Resolve sort & indicators BEFORE processing items *** ---
           // Resolve item sorting: Use tab-specific, fallback to global default, else null
           const effectiveItemSortBy = tabConfig.config?.itemSortBy ?? globalConfig.generalSettings?.defaultItemSortBy ?? null;
           let itemsToProcess = [...items]; // Work with a copy of items passed to the section

           // Apply sorting BEFORE grouping or rendering list items
           if (effectiveItemSortBy) {
               itemsToProcess = sortData(itemsToProcess, effectiveItemSortBy, globalConfig);
           }

           // Resolve indicators for card creation: Use tab-specific, fallback to global default, else empty array
           const effectiveCardIndicators = tabConfig.config?.cardIndicatorColumns ?? globalConfig.generalSettings?.defaultCardIndicatorColumns ?? [];

           // Create a config slice containing resolved indicators + other necessary card configs
           const cardCreationConfig = {
               ...tabConfig.config, // Copy other relevant config (like cardLinkColumn, cardTitleColumn if needed for cards)
               cardIndicatorColumns: effectiveCardIndicators // Use the resolved list
           };
            // --- *** END UPDATED *** ---


           // --- Render using itemsToProcess and cardCreationConfig ---
           if (isGroupingValid) {
               // --- Grouping Logic with Error Handling ---
               try {
                   const subGroupedData = itemsToProcess.reduce((acc, row) => {
                       if (!row || typeof row !== 'object') return acc;
                       const catValue = row[summaryGroupByCol] ?? 'Uncategorized';
                       const cat = Array.isArray(catValue) ? catValue.join(', ') : String(catValue);
                       if (!acc[cat]) acc[cat] = [];
                       acc[cat].push(row);
                       return acc;
                   }, {});

                   if (typeof subGroupedData !== 'object' || subGroupedData === null) {
                        throw new Error(`Sub-grouping resulted in non-object: ${JSON.stringify(subGroupedData)}`);
                   }
                   const sortedSubGroupKeys = Object.keys(subGroupedData).sort((a, b) => a.localeCompare(b)); // Simple alpha sort for sub-groups

                   const gridContainer = document.createElement('div'); gridContainer.className = 'summary-section-grid';
                   if (internalLayoutConf?.columnGap) gridContainer.style.gap = internalLayoutConf.columnGap;

                   // Pass the resolved cardCreationConfig down
                   renderGroupedItemsAsGrid(
                       gridContainer, subGroupedData,
                       cardCreationConfig, // Use resolved config for card indicators etc.
                       globalConfig,
                       'summary-card', 'summary-group-block', 'summary-group-column', 'h4',
                       sortedSubGroupKeys
                   );
                   sectionDiv.appendChild(gridContainer);
               } catch (groupingError) {
                    console.error(`Error grouping/rendering grid for section "${sectionConf.title}":`, groupingError);
                    const errorMsg = document.createElement('div'); errorMsg.className = 'empty-section-message'; errorMsg.style.color = 'red';
                    errorMsg.textContent = `Error displaying grouped items. Showing list. (${groupingError.message})`; sectionDiv.appendChild(errorMsg);
                    // Fallback to list
                    const listContainer = document.createElement('div'); listContainer.className = 'summary-section-list';
                    // Render list using itemsToProcess and cardCreationConfig
                    itemsToProcess.forEach(item => { listContainer.appendChild(createInitiativeCard(item, cardCreationConfig, globalConfig, 'summary-card')); });
                    sectionDiv.appendChild(listContainer);
               }
           } else {
               // Fallback list (no grouping)
                const listContainer = document.createElement('div'); listContainer.className = 'summary-section-list';
                // Render list using itemsToProcess and cardCreationConfig
                itemsToProcess.forEach(item => { listContainer.appendChild(createInitiativeCard(item, cardCreationConfig, globalConfig, 'summary-card')); });
                sectionDiv.appendChild(listContainer);
           }
       }
       targetElement.appendChild(sectionDiv);
   }; // --- End createSection ---

   // --- Pass 1: Render specific filter sections ---
   sectionsConfig.forEach((sectionConf) => {
       if (sectionConf.filterType === 'catchAll') return;
       // Use the specific checkSummarySectionFilter function
       const itemsMatchingSectionFilter = filteredData.filter(row =>
           checkSummarySectionFilter(row, sectionConf, globalConfig)
       );
       itemsMatchingSectionFilter.forEach(item => itemsProcessed.add(item));
       createSection(sectionConf, itemsMatchingSectionFilter);
   });

   // --- Pass 2: Render catchAll ---
    const catchAllSectionConf = sectionsConfig.find(s => s.filterType === 'catchAll');
    if (catchAllSectionConf) {
        const itemsForCatchAll = filteredData.filter(row => !itemsProcessed.has(row));
        createSection(catchAllSectionConf, itemsForCatchAll);
    }

   // --- Final message handling ---
    if (targetElement.querySelector('.summary-section')) {
        hideMessages(tabConfig.id);
    } else if (!filteredData || filteredData.length === 0) {
        // Message handled above
    } else {
        showMessage(`No items matched any summary section criteria for tab "${tabConfig.title}".`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-summary.js ---
// --- START OF FILE js/renderers/renderer-counts.js ---

/**
 * Checks if a row's value matches a counter's filter criteria.
 * Uses the generic checkCondition function.
 * @param {string|string[]} rowValue The value from the row.
 * @param {object} counterConfig The specific counter object.
 * @param {object} globalConfig The global application configuration.
 * @returns {boolean} True if the row value matches the filter criteria.
 */
function checkCounterFilter(rowValue, counterConfig, globalConfig) {
    if (!counterConfig || !counterConfig.filterType || !counterConfig.column) {
        return false;
    }
    // Adapt inputs for the generic checkCondition
    const dummyRow = { [counterConfig.column]: rowValue };
    const condition = {
        column: counterConfig.column,
        filterType: counterConfig.filterType,
        filterValue: counterConfig.filterValue
    };
    return checkCondition(dummyRow, condition, globalConfig); // Use imported checkCondition
}


/**
 * Renders the Counts View based on configuration specific to the tab.
 * Handles predefined counters and dynamic "countAllValues" type counters.
 * @param {object[]} filteredData The data rows already filtered for this tab.
 * @param {object} tabConfig The configuration object for this specific counts tab.
 * @param {object} globalConfig The global application configuration.
 * @param {HTMLElement} targetElement The container element for this tab.
 * @param {Function} showMessage Function to display messages.
 */
function renderCountsView(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
    if (!targetElement) { console.error("renderCountsView: Target element not provided."); return; }
    targetElement.innerHTML = '';
    setMessagePlaceholder(tabConfig.id, '', false);
    targetElement.style.display = 'grid';
    // Apply layout styles (grid-template-columns, gap from CSS)

    // Get Config
    const countsConf = tabConfig.config;
    if (!countsConf) { showMessage(`Counts tab "${tabConfig.title}" missing 'config'.`, tabConfig.id); return; }

    const countsGroupByCol = countsConf.groupByColumn;
    const counters = countsConf.counters;
    const validHeaders = globalConfig.csvHeaders || [];

    // Validate Config
    if (!countsGroupByCol || !validHeaders.includes(countsGroupByCol)) {
        showMessage(`Counts tab "${tabConfig.title}" 'groupByColumn' ("${countsGroupByCol}") is invalid.`, tabConfig.id); return;
    }
    if (!counters || !Array.isArray(counters) || counters.length === 0) {
        showMessage(`Counts tab "${tabConfig.title}" requires 'counters' array.`, tabConfig.id); return;
    }
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches filter for tab "${tabConfig.title}".`, tabConfig.id); return;
    }

    // --- Separate counter types ---
    const predefinedCounters = counters.filter(c => c.filterType !== 'countAllValues');
    const countAllCounters = counters.filter(c => c.filterType === 'countAllValues');

    // --- Data Aggregation ---
    const predefinedIndicatorCounts = {}; // Structure: { counterTitle: { groupByValue: count, "__total__": total } }
    const predefinedIndicatorDetails = {}; // Structure: { counterTitle: { displayHTML, title } }
    const dynamicCounts = {}; // Structure: { columnToCount: { groupByValue: { uniqueValue: count } } }
    const uniqueValuesPerDynamicColumn = {}; // Structure: { columnToCount: Set<string> }

    filteredData.forEach(row => {
        // Determine the primary group-by value for this row
        let groupByValues = ['Uncategorized'];
        if (validHeaders.includes(countsGroupByCol)) {
            const rawGroupByValue = row[countsGroupByCol];
            if (Array.isArray(rawGroupByValue)) {
                const meaningfulValues = rawGroupByValue.map(v => String(v ?? '').trim()).filter(v => v !== '');
                groupByValues = meaningfulValues.length > 0 ? meaningfulValues : ['Uncategorized']; // Keep as array if multi-value group
            } else if (rawGroupByValue !== null && typeof rawGroupByValue !== 'undefined' && String(rawGroupByValue).trim() !== '') {
                groupByValues = [String(rawGroupByValue)];
            }
        }
        const primaryGroupByValue = groupByValues[0]; // Use first value for primary grouping display key

        // Process Predefined Counters
        predefinedCounters.forEach(counterConfig => {
            if (!counterConfig.column || !counterConfig.title || !counterConfig.filterType || !validHeaders.includes(counterConfig.column)) return;
            const rowValueToCheck = row[counterConfig.column];
            if (checkCounterFilter(rowValueToCheck, counterConfig, globalConfig)) {
                const counterTitle = counterConfig.title;
                // Store display details once
                if (!predefinedIndicatorDetails[counterTitle]) {
                    let displayHTML = '';
                    const displayConf = counterConfig.display;
                    const cssClass = displayConf?.cssClass ? ` ${displayConf.cssClass}` : '';
                    const titleAttr = ` title="${counterConfig.title}"`;
                    if (displayConf?.type === 'icon' && displayConf.value) {
                         displayHTML = `<span class="csv-dashboard-icon${cssClass}"${titleAttr}>${displayConf.value}</span>`;
                    } else if (displayConf?.type === 'text' && displayConf.value) {
                         displayHTML = `<span class="count-header-tag-icon${cssClass}"${titleAttr}>${displayConf.value}</span>`;
                    }
                    predefinedIndicatorDetails[counterTitle] = { displayHTML, title: counterTitle };
                }
                // Increment counts
                if (!predefinedIndicatorCounts[counterTitle]) predefinedIndicatorCounts[counterTitle] = { "__total__": 0 };
                if (!predefinedIndicatorCounts[counterTitle][primaryGroupByValue]) predefinedIndicatorCounts[counterTitle][primaryGroupByValue] = 0;
                predefinedIndicatorCounts[counterTitle][primaryGroupByValue]++;
                predefinedIndicatorCounts[counterTitle]["__total__"]++;
            }
        });

        // Process "Count All Values" Counters
        countAllCounters.forEach(counterConfig => {
            const columnToCount = counterConfig.column;
            if (!columnToCount || !validHeaders.includes(columnToCount)) return;

            const valuesInCell = row[columnToCount];
            const valuesToCount = Array.isArray(valuesInCell)
                ? valuesInCell.map(v => String(v ?? 'N/A').trim()).filter(v => v !== '')
                : [(valuesInCell === null || typeof valuesInCell === 'undefined' || String(valuesInCell).trim() === '') ? 'N/A' : String(valuesInCell).trim()];

            if (!dynamicCounts[columnToCount]) dynamicCounts[columnToCount] = {};
            if (!uniqueValuesPerDynamicColumn[columnToCount]) uniqueValuesPerDynamicColumn[columnToCount] = new Set();

            if (!dynamicCounts[columnToCount][primaryGroupByValue]) dynamicCounts[columnToCount][primaryGroupByValue] = {};

            valuesToCount.forEach(uniqueVal => {
                uniqueValuesPerDynamicColumn[columnToCount].add(uniqueVal); // Track unique value globally
                if (!dynamicCounts[columnToCount][primaryGroupByValue][uniqueVal]) {
                    dynamicCounts[columnToCount][primaryGroupByValue][uniqueVal] = 0;
                }
                dynamicCounts[columnToCount][primaryGroupByValue][uniqueVal]++;
            });
        });
    });

    // --- Rendering Phase ---
    targetElement.innerHTML = ''; // Clear again before rendering

    // Render Predefined Counters
    const sortedPredefinedTitles = Object.keys(predefinedIndicatorCounts).sort((a, b) => a.localeCompare(b));
    sortedPredefinedTitles.forEach(counterTitle => {
        const groupByData = predefinedIndicatorCounts[counterTitle];
        const details = predefinedIndicatorDetails[counterTitle];
        const totalCount = groupByData["__total__"];

        const indicatorGroupDiv = document.createElement('div');
        indicatorGroupDiv.className = 'indicator-domain-group';
        const groupHeader = document.createElement('h3');
        groupHeader.innerHTML = `${details?.displayHTML || ''}<span class="indicator-label">${details?.title || counterTitle}</span><span class="indicator-total-count">(Total: ${totalCount})</span>`;
        indicatorGroupDiv.appendChild(groupHeader);

        const boxesContainer = document.createElement('div');
        boxesContainer.className = 'domain-boxes-container';
        const groupByKeys = Object.keys(groupByData).filter(key => key !== "__total__").sort((a, b) => a.localeCompare(b));

        if (groupByKeys.length > 0) {
            groupByKeys.forEach(groupByKey => {
                const count = groupByData[groupByKey];
                if (count > 0) {
                    const boxDiv = document.createElement('div');
                    boxDiv.className = 'domain-count-box';
                    boxDiv.innerHTML = `<span class="count-number">${count}</span><span class="domain-label">${groupByKey}</span>`;
                    boxDiv.title = `${details?.title || counterTitle} - ${countsGroupByCol}: ${groupByKey} (${count})`;
                    boxesContainer.appendChild(boxDiv);
                }
            });
        }

        if (boxesContainer.children.length === 0 && totalCount > 0) {
            const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
            noCountsMsg.textContent = `No breakdown by ${countsGroupByCol} found (Total: ${totalCount}).`;
            indicatorGroupDiv.appendChild(noCountsMsg);
        } else if (boxesContainer.children.length > 0) {
             indicatorGroupDiv.appendChild(boxesContainer);
        } else { // totalCount is 0
             const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
             noCountsMsg.textContent = `No items matched criteria.`;
             indicatorGroupDiv.appendChild(noCountsMsg);
        }
        targetElement.appendChild(indicatorGroupDiv);
    });

    // Render Dynamic "Count All" Counters
    Object.keys(dynamicCounts).forEach(columnToCount => {
        const columnData = dynamicCounts[columnToCount];
        const uniqueValuesForCol = Array.from(uniqueValuesPerDynamicColumn[columnToCount]).sort((a,b) => a.localeCompare(b));
        const overallTotal = Object.values(columnData).reduce((sum, group) => sum + Object.values(group).reduce((s, c) => s + c, 0), 0);


        const indicatorGroupDiv = document.createElement('div');
        indicatorGroupDiv.className = 'indicator-domain-group';
        const groupHeader = document.createElement('h3');
        // Use column name for title, maybe get display info if counterConfig had it?
        const counterConf = countAllCounters.find(c => c.column === columnToCount);
        const displayHTML = counterConf?.display?.value ? `<span class="${counterConf.display.type === 'icon' ? 'csv-dashboard-icon' : 'count-header-tag-icon'}${counterConf.display.cssClass ? ' ' + counterConf.display.cssClass : ''}" title="${counterConf.title || columnToCount}">${counterConf.display.value}</span> ` : '';
        groupHeader.innerHTML = `${displayHTML}<span class="indicator-label">${counterConf?.title || `${columnToCount} Breakdown`}</span><span class="indicator-total-count">(Total Items: ${overallTotal})</span>`;
        indicatorGroupDiv.appendChild(groupHeader);

        const boxesContainer = document.createElement('div');
        boxesContainer.className = 'domain-boxes-container'; // Reusing class, maybe make more specific?

        const groupByKeys = Object.keys(columnData).sort((a, b) => a.localeCompare(b));

        if (groupByKeys.length > 0) {
             groupByKeys.forEach(groupByKey => {
                 const countsPerUniqueVal = columnData[groupByKey];
                 const boxDiv = document.createElement('div');
                 boxDiv.className = 'domain-count-box'; // Consider a different class? Maybe `dynamic-count-box`
                 boxDiv.style.textAlign = 'left'; // Adjust alignment for list
                 boxDiv.style.minWidth = '150px'; // Give more space

                 let boxHTML = `<span class="domain-label" style="font-weight:bold; margin-bottom: 3px;">${groupByKey}</span>`;
                 const valueCounts = [];
                 uniqueValuesForCol.forEach(uniqueVal => {
                      const count = countsPerUniqueVal[uniqueVal] || 0;
                      if (count > 0) {
                          // Try to format the unique value using existing indicator styles
                          const formattedValue = formatTag(uniqueVal, globalConfig, columnToCount); // Use formatTag helper
                          valueCounts.push(`<span style="display: block; font-size: 0.9em; margin-left: 5px;">${formattedValue || uniqueVal}: ${count}</span>`);
                      }
                 });
                 boxHTML += valueCounts.join('');
                 boxDiv.innerHTML = boxHTML;
                 boxDiv.title = `${columnToCount} Breakdown for ${countsGroupByCol}: ${groupByKey}`;
                 boxesContainer.appendChild(boxDiv);
             });
        }

        if (boxesContainer.children.length > 0) {
             indicatorGroupDiv.appendChild(boxesContainer);
        } else {
            const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
            noCountsMsg.textContent = `No items found for column "${columnToCount}".`;
            indicatorGroupDiv.appendChild(noCountsMsg);
        }
        targetElement.appendChild(indicatorGroupDiv);
    });


    if (targetElement.children.length > 0 && !targetElement.querySelector('.message-placeholder.visible')) {
         hideMessages(tabConfig.id);
    } else if (!targetElement.querySelector('.indicator-domain-group')) {
        // If absolutely nothing was rendered (no predefined, no dynamic)
        showMessage(`No counts generated for tab "${tabConfig.title}".`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-counts.js ---
// --- START OF (NEW or ADD TO) js/export-handler.js ---

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
        const url = stringValue.trim();
        if (url.startsWith('http://') || url.startsWith('https://')) {
            // <<< CHANGE: Return the actual URL for CSV export >>>
            // return '🔗'; // Old: return emoji
            return url;    // New: return the URL string
        }
        // Return raw value if it's in a link column but not a valid URL
        return stringValue;
    }

    // --- Standard Indicator Style Logic ---
    if (!styleConfig || styleConfig.type === 'none') {
        // No specific style, return the raw string value
        return stringValue;
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




// --- START OF FILE js/renderers/renderer-graph.js ---

/**
 * Extracts the styling configuration for a specific value from indicatorStyles.
 * Replicates logic from formatTag but returns the style object, not HTML.
 * Prioritizes styleRules over valueMap.
 * @param {string} value The value to find the style for.
 * @param {string} columnName The column name.
 * @param {object} indicatorStyles The global indicatorStyles configuration.
 * @returns {object|null} The style object ({bgColor, textColor, etc.}) or null if no style found.
 */
function getNodeStyleConfig(value, columnName, indicatorStyles) {
    const stringValue = String(value || '');
    const columnStyleConfig = indicatorStyles ? indicatorStyles[columnName] : null;

    if (!columnStyleConfig || (columnStyleConfig.type !== 'tag' && columnStyleConfig.type !== 'icon')) {
        return null; // Only handle tags/icons for color/style info
    }

    let style = null;

    // 1. Check styleRules (for tags)
    if (columnStyleConfig.type === 'tag' && Array.isArray(columnStyleConfig.styleRules)) {
        for (const rule of columnStyleConfig.styleRules) {
            let match = false;
             try {
                if (rule.matchType === 'regex' && rule.pattern) {
                    if (new RegExp(rule.pattern).test(stringValue)) match = true;
                } else if (rule.matchType === 'exact' && stringValue === rule.value) {
                    match = true;
                }
            } catch (e) { console.error(`Error in getNodeStyleConfig regex for ${columnName}:`, e); }

            if (match && rule.style) {
                style = rule.style;
                break;
            }
        }
        if (!style) style = columnStyleConfig.defaultStyle || null; // Use defaultStyle if rules exist but none matched
    }

    // 2. Fallback to valueMap (for tags or icons) if no styleRules matched or defined
    if (!style && columnStyleConfig.valueMap) {
        const lowerValue = stringValue.toLowerCase();
        style = columnStyleConfig.valueMap.hasOwnProperty(stringValue) ? columnStyleConfig.valueMap[stringValue] :
                columnStyleConfig.valueMap.hasOwnProperty(lowerValue) ? columnStyleConfig.valueMap[lowerValue] :
                columnStyleConfig.valueMap['default'];
    }

    // 3. Fallback to trueCondition (for icons) if still no style
     if (!style && columnStyleConfig.type === 'icon' && columnStyleConfig.trueCondition) {
         // Simplified: Assume trueCondition applies if value is truthy.
         // We don't have access to the global isTruthy here easily, so approximate.
         // For node coloring, this might be less critical.
         // A better approach might require passing isTruthy or the global config.
         // For now, let's return null if only trueCondition exists, as mapping color
         // from just 'true' state is ambiguous without knowing the value.
         // Consider enhancing this if icon color mapping is crucial.
         return null;
     }


    return style; // Return the found style object or null
}


/**
 * Renders data into a Network Graph view using Vis.js.
 * Implements the "Hub-and-Spoke" model: Primary nodes connected to Category nodes.
 * @param {object[]} filteredData The data rows already filtered for this tab.
 * @param {object} tabConfig The configuration object for this specific graph tab.
 * @param {object} globalConfig The global application configuration.
 * @param {HTMLElement} targetElement The container element for this tab.
 * @param {Function} showMessage Function to display messages.
 */
function renderGraph(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
    console.log(`Rendering Graph Tab: ${tabConfig.id}`);
    if (typeof vis === 'undefined') {
        showMessage(`Graph library (Vis.js) not loaded. Cannot render tab "${tabConfig.title}".`, tabConfig.id);
        console.error("Vis.js library not found!");
        return;
    }

    if (!targetElement) {
        console.error("renderGraph: Target element not provided.");
        return;
    }
    targetElement.innerHTML = ''; // Clear previous content
    // Ensure the container is visible and has some default size if needed
    targetElement.style.display = 'block';
    targetElement.style.minHeight = '400px'; // Ensure container has height for vis.js
    setMessagePlaceholder(tabConfig.id, '', false); // Ensure placeholder exists but is hidden initially

    // --- Config Validation ---
    const graphConf = tabConfig.config;
    const primaryIdCol = graphConf?.primaryNodeIdColumn;
    const primaryLabelCol = graphConf?.primaryNodeLabelColumn;
    const categoryCols = graphConf?.categoryNodeColumns;
    const validHeaders = globalConfig.csvHeaders || [];

    if (!primaryIdCol || !validHeaders.includes(primaryIdCol)) {
        showMessage(`Graph tab "${tabConfig.title}" 'primaryNodeIdColumn' is missing or invalid.`, tabConfig.id); return;
    }
    if (!primaryLabelCol || !validHeaders.includes(primaryLabelCol)) {
        showMessage(`Graph tab "${tabConfig.title}" 'primaryNodeLabelColumn' is missing or invalid.`, tabConfig.id); return;
    }
    if (!categoryCols || !Array.isArray(categoryCols) || categoryCols.length === 0) {
        showMessage(`Graph tab "${tabConfig.title}" requires 'categoryNodeColumns' array.`, tabConfig.id); return;
    }
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches filter for tab "${tabConfig.title}".`, tabConfig.id); return;
    }

    // --- Data Processing ---
    const nodes = [];
    const edges = [];
    const primaryNodeIds = new Set();
    const categoryNodes = {}; // Use map for unique category nodes: { 'CategoryCol::Value': nodeObject }

    try {
        filteredData.forEach(row => {
            const primaryId = row[primaryIdCol];
            const primaryLabel = row[primaryLabelCol] || `[No ${primaryLabelCol}]`;

            if (primaryId === null || typeof primaryId === 'undefined' || primaryId === '') {
                console.warn("Skipping row due to missing/empty primary ID:", row);
                return; // Skip rows without a valid primary ID
            }

            // --- Create/Add Primary Node ---
            if (!primaryNodeIds.has(primaryId)) {
                // Tooltip
                let tooltip = `<b>${primaryLabel}</b> (ID: ${primaryId})<br/>-----------<br/>`;
                (graphConf.nodeTooltipColumns || []).forEach(col => {
                     if (validHeaders.includes(col) && row[col] !== null && typeof row[col] !== 'undefined') {
                        tooltip += `<b>${col}:</b> ${Array.isArray(row[col]) ? row[col].join(', ') : row[col]}<br/>`;
                     }
                });

                // Color (using helper function)
                let nodeColor = { background: '#97C2FC', border: '#2B7CE9' }; // Default color
                const colorCol = graphConf.nodeColorColumn;
                if (colorCol && validHeaders.includes(colorCol)) {
                    const styleInfo = getNodeStyleConfig(row[colorCol], colorCol, globalConfig.indicatorStyles);
                    if (styleInfo && styleInfo.bgColor) {
                         nodeColor.background = styleInfo.bgColor;
                         nodeColor.border = styleInfo.borderColor || styleInfo.bgColor; // Use border or bg
                         if(styleInfo.textColor) nodeColor.font = { color: styleInfo.textColor };
                    }
                }

                nodes.push({
                    id: primaryId,
                    label: primaryLabel.length > 30 ? primaryLabel.substring(0, 27) + '...' : primaryLabel, // Truncate long labels
                    title: tooltip, // HTML tooltip
                    color: nodeColor,
                    shape: graphConf.nodeShape || 'ellipse'
                });
                primaryNodeIds.add(primaryId);
            }

            // --- Create/Add Category Nodes and Edges ---
            categoryCols.forEach(catCol => {
                if (validHeaders.includes(catCol)) {
                    let categoryValues = row[catCol];
                    // Ensure categoryValues is an array, handle multi-value columns
                    if (!Array.isArray(categoryValues)) {
                        categoryValues = (categoryValues === null || typeof categoryValues === 'undefined' || String(categoryValues).trim() === '') ? [] : [String(categoryValues)];
                    } else {
                        // Filter out empty strings if it's already an array from multi-value parsing
                        categoryValues = categoryValues.map(String).filter(v => v.trim() !== '');
                    }


                    categoryValues.forEach(catVal => {
                        const categoryNodeId = `${catCol}::${catVal}`; // Unique ID for category node

                        // Add category node if it doesn't exist
                        if (!categoryNodes[categoryNodeId]) {
                            let catNodeColor = (graphConf.categoryNodeStyle?.color) || { background: '#f0f0f0', border: '#cccccc' };
                            let catNodeFont = (graphConf.categoryNodeStyle?.font) || { color: '#555555', size: 11 };
                            categoryNodes[categoryNodeId] = {
                                id: categoryNodeId,
                                label: catVal,
                                title: `Category: ${catCol}<br/>Value: ${catVal}`,
                                color: catNodeColor,
                                shape: graphConf.categoryNodeStyle?.shape || 'box',
                                font: catNodeFont,
                                margin: graphConf.categoryNodeStyle?.margin || 5, // Adjust margin if needed
                                group: catCol // Assign group for potential clustering/styling
                            };
                        }

                        // Add Edge from primary node to this category node
                        edges.push({
                            from: primaryId,
                            to: categoryNodeId,
                            arrows: graphConf.edgeDirection === 'directed' ? 'to' : undefined,
                            color: graphConf.edgeColor || '#cccccc'
                        });
                    });
                }
            }); // End categoryCols.forEach
        }); // End filteredData.forEach

        // Combine primary nodes and unique category nodes
        const finalNodes = nodes.concat(Object.values(categoryNodes));

        if (finalNodes.length === 0) {
             showMessage(`No nodes could be generated for graph tab "${tabConfig.title}". Check config and data.`, tabConfig.id);
             return;
        }

        // --- Vis.js Initialization ---
        const nodesDataSet = new vis.DataSet(finalNodes);
        const edgesDataSet = new vis.DataSet(edges);
        const data = { nodes: nodesDataSet, edges: edgesDataSet };

        // Map config options to Vis.js options
        const options = {
            layout: {
                // hierarchical: graphConf.layoutEngine === 'hierarchical' ? { enabled: true, sortMethod: 'hubsize' } : false
                 // Add other layout options based on config if needed
            },
            physics: {
                enabled: graphConf.physicsEnabled !== false, // Enabled by default
                solver: 'forceAtlas2Based', // A common solver
                forceAtlas2Based: {
                     gravitationalConstant: -50,
                     centralGravity: 0.01,
                     springLength: 100,
                     springConstant: 0.08,
                     damping: 0.4
                 },
                 stabilization: { 
                    enabled: true,
                    iterations: 1000, // Or adjust as needed
                    updateInterval: 50,
                    onlyDynamicEdges: false,
                    fit: false // <-- IMPORTANT: Set Vis.js internal fit during stabilization to false, we'll do it manually after                }
                    // Adjust physics settings as needed
                 }
            },
            nodes: {
                 // Default node styles (can be overridden by individual node colors/shapes)
                 // shape: graphConf.nodeShape || 'ellipse',
                 // font: { size: 12, color: '#333' },
                 // borderWidth: 1
            },
            edges: {
                 // Default edge styles
                 // width: 0.5,
                 // color: { inherit: 'from' },
                 smooth: { type: 'dynamic' } // Or dynamic
            },
            interaction: {
                 tooltipDelay: 200,
                 hideEdgesOnDrag: true,
                 navigationButtons: true // Add zoom/fit buttons
            }
        };
         // Specific layout mapping
        if(graphConf.layoutEngine === 'hierarchical') {
             options.layout.hierarchical = { enabled: true, sortMethod: 'directed', direction: 'UD' }; // Example hierarchical settings
             options.physics.enabled = false; // Often disable physics with hierarchical
             options.layout.hierarchical.levelSeparation = 250; // Adjust as needed
        } else {
             // Default to force-directed implied by physics settings
        }


        // Create the network
        const network = new vis.Network(targetElement, data, options);

        network.on("stabilizationProgress", function(params) {
            // Optional: Show loading progress
            // console.log(`Stabilization progress: ${Math.round(params.iterations/params.total*100)}%`);
        });
        network.once("stabilizationIterationsDone", function() {
            // Optional: Actions after layout stabilization
             console.log(`Graph layout stabilized for tab: ${tabConfig.id}`);
             network.fit({
                animation: false 
            }); // Fit network to view after stabilization
        });

         network.on("showPopup", function (params) {
             // Override default popup with custom HTML content if needed
             // document.getElementById('popup-content').innerHTML = params.title; // Assuming you have a div with id 'popup-content'
             // Can use the nodeTooltipColumns logic here again if the default is not sufficient
         });
         network.on("hidePopup", function () {
             // Clear custom popup content
         });

        hideMessages(tabConfig.id); // Hide placeholder on success

    } catch (error) {
        console.error(`Error rendering graph for tab "${tabConfig.title}":`, error);
        showMessage(`Error rendering graph: ${error.message}. Check console.`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-graph.js ---
// --- START OF FILE js/app.js ---

// --- Wait for DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // --- Get STATIC DOM Elements ---
    const fileInput = document.getElementById('cdg-csvFileInput');
    const uploadContainer = document.getElementById('cdg-uploadContainer');
    const tabControls = document.getElementById('cdg-tabControls');
    const viewContentContainer = document.getElementById('cdg-viewContentContainer');
    const mainHeading = document.querySelector('h1');
    const iconKeyContainer = document.getElementById('cdg-iconKeyContainer');
    const globalSearchInput = document.getElementById('cdg-globalSearchInput');
    const exportButton = document.getElementById('cdg-exportButton');


    // Check if essential containers were found
    if (!fileInput || !tabControls || !viewContentContainer || !mainHeading || !globalSearchInput || !exportButton ) {
        console.error("Essential DOM elements missing (controls/containers/search). Dashboard cannot initialize.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Critical Error: Required HTML structure is missing. Cannot load dashboard.</h1>';
        return;
    }

    // Collect static DOM elements to pass around
    const domElements = {
        fileInput, uploadContainer, tabControls, viewContentContainer,
        mainHeading, iconKeyContainer, globalSearchInput, exportButton  // Pass search input
    };


    // --- State ---
    let currentConfig = JSON.parse(JSON.stringify(defaultConfig));
    let parsedData = [];
    let activeTabId = null;

    // --- State Object (Reference passed to other modules) ---
    const appState = {
        get parsedData() { return parsedData; },
        get currentConfig() { return currentConfig; },
        get activeTabId() { return activeTabId; },
        set activeTabId(id) { activeTabId = id; }
    };

    // --- Debounce Timer ---
    let searchDebounceTimer;

    // --- Search Handler Definition ---
    /**
     * Filters the currently visible elements based on the search term.
     * Attempts to use the search term as a case-insensitive regular expression.
     * Falls back to plain text substring search if the regex is invalid.
     * Targets table rows, or entire group blocks in Kanban/Summary views.
     * @param {string} searchTerm The text or regex pattern to search for.
     */
     function handleGlobalSearch(searchTerm) {
        const term = searchTerm.trim(); // Don't lowercase yet for regex
        // console.log(`Performing search for: "${term}" on tab: ${appState.activeTabId}`); // Debug logging

        if (!appState.activeTabId) return;

        const activeContainer = document.getElementById(`tab-content-${appState.activeTabId}`);
        if (!activeContainer) return;

        const tabConfig = appState.currentConfig.tabs?.find(t => t.id === appState.activeTabId);
        if (!tabConfig) return;

        const searchableTypes = ['table', 'kanban', 'summary'];
        if (!searchableTypes.includes(tabConfig.type)) {
            // console.log(`Search skipped: Tab type "${tabConfig.type}" is not searchable.`);
            return;
        }

        let targetElementsSelector;
        switch (tabConfig.type) {
            case 'table': targetElementsSelector = 'tbody tr'; break;
            case 'kanban': targetElementsSelector = '.kanban-group-block'; break;
            case 'summary': targetElementsSelector = '.summary-group-block'; break;
            default: return;
        }

        const elementsToSearch = activeContainer.querySelectorAll(targetElementsSelector);
        let visibleCount = 0;

        // Regex Handling Logic
        let searchRegex = null;
        let isPlainTextSearch = false;
        let termLower = ''; // Keep lowercase version for plain text

        if (term !== '') {
            try {
                searchRegex = new RegExp(term, 'i');
                // console.log("Search mode: Regex"); // Debug
            } catch (e) {
                console.warn(`Invalid regex pattern "${term}". Falling back to plain text search. Error: ${e.message}`);
                isPlainTextSearch = true;
                termLower = term.toLowerCase(); // Lowercase now for plain search
                // console.log("Search mode: Plain Text (due to invalid regex)"); // Debug
            }
        } else {
            isPlainTextSearch = true;
            // console.log("Search mode: Plain Text (empty term)"); // Debug
        }

        // Apply filtering
        elementsToSearch.forEach(element => {
            const elementText = element.textContent || '';
            let isMatch = false;

            if (term === '') {
                isMatch = true; // Empty search shows all
            } else if (searchRegex && !isPlainTextSearch) {
                isMatch = searchRegex.test(elementText); // Regex test (case-insensitive flag 'i')
            } else {
                // Plain text fallback or empty search
                isMatch = elementText.toLowerCase().includes(termLower); // Case-insensitive plain text search
            }

            element.classList.toggle('cdg-search-hidden', !isMatch);

            if (isMatch) {
                visibleCount++;
            }
        });

        // console.log(`Search complete. ${visibleCount} groups/rows visible.`); // Debug
    }
    // --- End Search Handler Definition ---


    // --- Initialization ---
    // Pass dependencies to View Manager
    initViewManager(domElements, appState, handleGlobalSearch);
    initializeDashboard(); // Calls view manager functions


    // --- Event Listeners ---
    if (fileInput) fileInput.addEventListener('change', handleFileSelectEvent);
    if (tabControls) tabControls.addEventListener('click', handleTabClick);
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                handleGlobalSearch(globalSearchInput.value); // Calls the function defined above
            }, 300); // 300ms debounce delay
        });
    }
    if (exportButton) exportButton.addEventListener('click', handleExportClick);

    // --- Core Application Functions ---

    /**
     * Initializes the dashboard: applies config, generates tabs, attempts URL load or enables upload.
     */
    function initializeDashboard() {
        console.log("Initializing Dashboard...");
        applyCustomTitle(currentConfig, mainHeading);
        applyConfigStyles(currentConfig);
        renderIconKey(currentConfig);

        generateTabsAndContainers(currentConfig.tabs); // Creates tab buttons and view divs

        const firstEnabledTab = currentConfig.tabs?.find(tab => tab.enabled !== false);
        if (firstEnabledTab) {
            appState.activeTabId = firstEnabledTab.id;
            console.log(`Default active tab set to: ${appState.activeTabId}`);
        } else {
            console.warn("No enabled tabs found in configuration.");
            if(tabControls) tabControls.innerHTML = '<p style="color: red; padding: 10px;">Error: No enabled tabs configured.</p>';
            if(viewContentContainer) viewContentContainer.innerHTML = '';
            return;
        }

        const csvUrl = currentConfig.generalSettings?.csvUrl?.trim();
        if (csvUrl) {
            console.log(`Configuration specifies CSV URL: ${csvUrl}`);
            updateUiForLoadMode('url');
            showMessageOnLoad(appState.activeTabId, 'Loading data from URL...');
            loadAndProcessData(() => loadDataFromUrl(csvUrl));
        } else {
            console.log("No CSV URL configured. Enabling file upload.");
            updateUiForLoadMode('file');
            showMessageOnLoad(appState.activeTabId); // Show "Upload CSV" in default tab
             // No need to call showView here, messageOnLoad handles initial state
        }
    }


    /**
     * Central function to trigger data loading, parse, filter, and render tabs.
     * @param {Function} loadFunction Async function returning CSV content string.
     */
    async function loadAndProcessData(loadFunction) {
        clearAllViews(true); // Clear views, keep placeholders visible with a message
        showMessageOnLoad(appState.activeTabId, "Processing data...");

        try {
            // 1. Load Data
            const csvContent = await loadFunction();
            console.log("loadAndProcessData: CSV content loaded.");

            // 2. Parse Data
            const { data, headers } = parseCSV(csvContent, currentConfig);
            parsedData = data;
            currentConfig.csvHeaders = headers;
            console.log(`loadAndProcessData: CSV parsed. Headers: ${headers.length}, Rows: ${parsedData.length}.`);

            // 3. Render All Tabs
            if (parsedData.length > 0 || headers.length > 0) {
                console.log("loadAndProcessData: Rendering all configured tabs...");
                renderAllTabs(); // This populates content in hidden divs
                renderIconKey(currentConfig);
                console.log("loadAndProcessData: Tab rendering complete.");
            } else {
                console.warn("loadAndProcessData: CSV parsed but resulted in 0 data rows.");
                const parseFailMsg = `CSV empty or data could not be extracted. Check delimiter ("${currentConfig.generalSettings?.csvDelimiter || ','}") and file/URL content.`;
                currentConfig.tabs?.forEach(tab => {
                    if (tab.enabled !== false) showMessage(parseFailMsg, tab.id);
                });
                clearAllViews(true); // Ensure views are clear, placeholders show message
            }

        } catch (error) {
             console.error("ERROR during data loading or processing:", error);
             parsedData = [];
             currentConfig.csvHeaders = [];
             const errorMsg = `Error: ${error.message}. Check console (F12) and verify CSV/config.`;
             currentConfig.tabs?.forEach(tab => {
                 if (tab.enabled !== false) showMessage(errorMsg, tab.id);
             });
             clearAllViews(true);
             if (typeof alert !== 'undefined') alert(errorMsg);

        } finally {
             // Ensure the correct default/active view is visible after processing
             // Use the activeTabId already set, or find the first enabled one as fallback
             const targetTab = appState.activeTabId || currentConfig.tabs?.find(t => t.enabled !== false)?.id;
             if (targetTab) {
                showView(targetTab); // Call view-manager's showView to make the active tab visible
             }
             if (fileInput) fileInput.value = ''; // Reset file input regardless of success/failure
        }
    }

    /**
     * Iterates through configured tabs, applies filters, and calls the appropriate renderer.
     * Assumes other JS files (renderers, view-manager, etc.) are loaded.
     */
    function renderAllTabs() {
        if (!currentConfig.tabs) {
            console.error("renderAllTabs: No tabs defined in configuration.");
            return;
        }

        currentConfig.tabs.forEach(tabConfig => {
            if (tabConfig.enabled === false) return;

            const targetElement = document.getElementById(`tab-content-${tabConfig.id}`);
            if (!targetElement) {
                console.warn(`renderAllTabs: Target element for tab ${tabConfig.id} not found.`);
                return;
            }

            try {
                 const filteredData = applyTabFilter(parsedData, tabConfig.filter, currentConfig);
                 // console.log(`Tab "${tabConfig.title}" (${tabConfig.id}): ${filteredData.length} rows after filtering.`); // Debug

                 // Basic Config Validation (Example)
                 let configValid = true;
                 let errorMsg = '';
                 if (!currentConfig.csvHeaders || currentConfig.csvHeaders.length === 0 && parsedData.length > 0) {
                    // Allow rendering if headers are empty but data might be too (e.g. graph from non-tabular source?)
                    // configValid = false; errorMsg = 'CSV Headers not available for validation.'
                 } else {
                    // Specific validations
                     if (tabConfig.type === 'kanban' && (!tabConfig.config?.groupByColumn || !currentConfig.csvHeaders.includes(tabConfig.config.groupByColumn))) {
                         configValid = false; errorMsg = `Kanban 'groupByColumn' ("${tabConfig.config?.groupByColumn || ''}") is missing or invalid.`;
                     }
                     if (tabConfig.type === 'counts' && (!tabConfig.config?.groupByColumn || !currentConfig.csvHeaders.includes(tabConfig.config.groupByColumn))) {
                         configValid = false; errorMsg = `Counts 'groupByColumn' ("${tabConfig.config?.groupByColumn || ''}") is missing or invalid.`;
                     }
                      if (tabConfig.type === 'graph' && (!tabConfig.config?.primaryNodeIdColumn || !currentConfig.csvHeaders.includes(tabConfig.config.primaryNodeIdColumn))) {
                          configValid = false; errorMsg = `Graph 'primaryNodeIdColumn' ("${tabConfig.config?.primaryNodeIdColumn || ''}") is missing or invalid.`;
                      }
                 }

                 if (!configValid) { throw new Error(`Invalid configuration: ${errorMsg}`); }

                 // Call the correct renderer based on type
                 switch (tabConfig.type) {
                    case 'table':   renderTable(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    case 'kanban':  renderKanban(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    case 'summary': renderSummaryView(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    case 'counts':  renderCountsView(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    case 'graph':   renderGraph(filteredData, tabConfig, currentConfig, targetElement, showMessage); break;
                    default:
                        console.warn(`renderAllTabs: Unknown tab type "${tabConfig.type}" for tab "${tabConfig.title}".`);
                        showMessage(`Unknown view type configured: "${tabConfig.type}"`, tabConfig.id);
                }
            } catch (renderError) {
                 console.error(`Error rendering tab "${tabConfig.title}" (${tabConfig.id}):`, renderError);
                 showMessage(`Error rendering tab: ${renderError.message}`, tabConfig.id);
                 // Ensure targetElement is cleared on error to prevent showing partial/broken content
                 if (targetElement) targetElement.innerHTML = '';
                 setMessagePlaceholder(tabConfig.id, `Error rendering tab: ${renderError.message}`, true); // Show error in placeholder
            }
        });
         // After rendering all tabs, apply dynamic styles based on config
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
        showMessageOnLoad(appState.activeTabId, `Reading file: ${file.name}...`);
        loadAndProcessData(() => readFileContent(file));
    }

    /**
     * Handles clicks on the dynamically generated tab buttons.
     * @param {Event} event The click event.
     */
    function handleTabClick(event) {
         const button = event.target.closest('.tab-button');
         if (button) {
             const tabId = button.getAttribute('data-tab-id');
             if (tabId && tabId !== appState.activeTabId) {
                 console.log(`Switching view to tab: ${tabId}`);
                 // Clear search input VISUALLY when changing tabs
                 if (globalSearchInput) {
                    globalSearchInput.value = '';
                 }
                 // Show the new view (which will also clear the search filter via handleGlobalSearch(''))
                 showView(tabId); // Calls view-manager's showView
             }
         }
     }

/**
     * Handles the click event for the export button.
     * Determines the active tab, filters/sorts data, generates CSV, and triggers download.
     */
function handleExportClick() {
    console.log("Export button clicked.");
    if (!appState.activeTabId) {
        console.warn("handleExportClick: No active tab selected.");
        alert("Please select a tab to export.");
        return;
    }
    if (!appState.parsedData || appState.parsedData.length === 0) {
         console.warn("handleExportClick: No data loaded to export.");
         alert("Please load data before exporting.");
         return;
    }

    const tabConfig = appState.currentConfig.tabs?.find(t => t.id === appState.activeTabId);
    if (!tabConfig) {
        console.error(`handleExportClick: Config not found for active tab ${appState.activeTabId}`);
        alert("Error: Could not find configuration for the active tab.");
        return;
    }

    const exportableTypes = ['table', 'kanban','summary','counts']; // Add 'summary' later if implemented
    if (!exportableTypes.includes(tabConfig.type)) {
        console.log(`Export skipped: Tab type "${tabConfig.type}" is not exportable yet.`);
        alert(`Export is not currently supported for the "${tabConfig.title}" view type.`);
        return;
    }

    // Disable button temporarily to prevent double-clicks
    if(exportButton) exportButton.disabled = true;
    // Optional: Show a loading indicator

    // Use setTimeout to allow UI to update (button disable) before potentially long processing
    setTimeout(() => {
        try {
            console.log(`Exporting tab: ${tabConfig.title} (${tabConfig.id}), Type: ${tabConfig.type}`);

            // 1. Get Data (use current parsed data)
            const fullData = appState.parsedData;

            // 2. Apply Tab Filter
            const filteredData = applyTabFilter(fullData, tabConfig.filter, appState.currentConfig);
            console.log(`Export - ${filteredData.length} rows after filtering.`);

            // 3. Apply Item Sorting (for consistency, even if table renderer has its own sort)
            // Resolve sort config using defaults
            let dataForExport = [...filteredData]; // Start with filtered data

            // Apply item sorting for types that use it visually before grouping/sectioning
            if (['table', 'kanban', 'summary'].includes(tabConfig.type)) {
               const itemSortConfig = tabConfig.config?.itemSortBy ?? appState.currentConfig.generalSettings?.defaultItemSortBy ?? null;
               dataForExport = sortData(dataForExport, itemSortConfig, appState.currentConfig); // Sort a copy
            }

            // 4. Generate CSV Content
            let csvContent = '';
            let baseFilename = `dashboard-export-${tabConfig.id}`;

            switch(tabConfig.type) {
                case 'table':
                    if (typeof generateTableCsv === 'function') {
                        csvContent = generateTableCsv(dataForExport, tabConfig, appState.currentConfig);
                    } else { throw new Error("generateTableCsv function not found."); }
                    break;
                case 'kanban':
                    if (typeof generateKanbanCsv === 'function') {
                        csvContent = generateKanbanCsv(dataForExport, tabConfig, appState.currentConfig);
                    } else { throw new Error("generateKanbanCsv function not found."); }
                    break;
                case 'summary':
                    if (typeof generateSummaryCsv === 'function') {
                        csvContent = generateSummaryCsv(dataForExport, tabConfig, appState.currentConfig);
                    } else { throw new Error("generateSummaryCsv function not found."); }
                    break;
                case 'counts':
                     if (typeof generateCountsCsv === 'function') {
                         // Counts export function handles its own aggregation from filtered data
                        csvContent = generateCountsCsv(filteredData, tabConfig, appState.currentConfig); // Pass originally filtered data
                    } else { throw new Error("generateCountsCsv function not found."); }
                    break;
                // No default needed as we checked exportableTypes earlier
            }

            // 5. Trigger Download
            if (csvContent) {
                // Check if triggerCsvDownload exists
                if (typeof triggerCsvDownload === 'function') {
                    const filename = `${baseFilename}.csv`;
                    triggerCsvDownload(csvContent, filename);
                } else {
                    throw new Error("triggerCsvDownload function not found.");
                }
            } else {
                console.warn("Export generation resulted in empty content.");
                alert("Could not generate export data for this view. It might be empty after filtering.");
            }

        } catch (error) {
            console.error("Error during export:", error);
            alert(`An error occurred during export: ${error.message}`);
        } finally {
            // Re-enable button and hide loading indicator
            if(exportButton) exportButton.disabled = false;
        }
    }, 10); // Small delay for UI update
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
