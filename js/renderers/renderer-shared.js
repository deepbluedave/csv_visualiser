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