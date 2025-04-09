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
 * Generates HTML string for indicators (icons/tags) for a given column in a row.
 * Handles arrays and the 'layout: "stacked"' config for multi-value items.
 * Prioritizes global linkColumns. Uses global indicatorStyles.
 * @param {object} row The data row object.
 * @param {string} columnName The header name of the column.
 * @param {object} config The application configuration object (global).
 * @returns {string} The generated HTML string (potentially empty).
 */
 function generateIndicatorsHTML(row, columnName, config) {
    const linkColumns = config.generalSettings?.linkColumns || [];
    const value = row[columnName];
    let indicatorsHTML = ''; // Final combined HTML
    const styleConfig = config.indicatorStyles ? config.indicatorStyles[columnName] : null;

    // --- Global Link Column Check (Highest Priority) ---
    if (linkColumns.includes(columnName)) {
        const valuesToCheck = Array.isArray(value) ? value : [value];
        let generatedLinks = [];
        valuesToCheck.forEach(singleValue => {
            const url = String(singleValue || '').trim();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                generatedLinks.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" title="Open Link: ${url}" class="card-link-icon">🔗</a>`);
            }
        });
        // Apply stacking for multiple links if configured
        const linkSeparator = ' '; // Force space separator
        return generatedLinks.join(linkSeparator);
    }

    // --- Standard Indicator Style Logic ---
    if (!styleConfig || styleConfig.type === 'none') return ''; // No styling configured or explicitly none

    const valuesToProcess = Array.isArray(value) ? value : [value];
    let generatedHtmlArray = []; // Store HTML for each item before joining

    valuesToProcess.forEach(singleValue => {
        const currentValue = singleValue ?? '';
        let itemHtml = ''; // HTML for this specific value

        try {
            // --- ICON type --- (Logic remains separate from formatTag)
            if (styleConfig.type === 'icon') {
                let iconApplied = false;
                let currentIconHtml = '';

                // 1. Check trueCondition
                if (styleConfig.trueCondition && !iconApplied && isTruthy(currentValue, config)) {
                    currentIconHtml = `<span class="icon ${styleConfig.trueCondition.cssClass || ''}" title="${styleConfig.trueCondition.title || columnName}">${styleConfig.trueCondition.value || '?'}</span>`;
                    iconApplied = true;
                }

                // 2. Check valueMap if not already applied or if hiding false
                if (styleConfig.valueMap && !iconApplied) {
                    const valueLower = String(currentValue).toLowerCase();
                    let mapping = null;

                    // Check specific value (case-sensitive then insensitive)
                    if (styleConfig.valueMap.hasOwnProperty(currentValue)) {
                        mapping = styleConfig.valueMap[currentValue];
                    } else if (styleConfig.valueMap.hasOwnProperty(valueLower)) {
                        mapping = styleConfig.valueMap[valueLower];
                    }

                    // Check specific falsey mappings to allow hiding "FALSE" text etc.
                    if (!mapping) {
                        if (styleConfig.valueMap.hasOwnProperty(currentValue) && styleConfig.valueMap[currentValue]?.value === "") {
                             mapping = styleConfig.valueMap[currentValue]; // Map to explicitly empty
                        } else if (styleConfig.valueMap.hasOwnProperty('false') && valueLower === 'false') {
                            mapping = styleConfig.valueMap['false'];
                        } else if (styleConfig.valueMap.hasOwnProperty('FALSE') && String(currentValue) === 'FALSE') {
                             mapping = styleConfig.valueMap['FALSE'];
                        } else if (styleConfig.valueMap.hasOwnProperty('0') && String(currentValue) === '0') {
                            mapping = styleConfig.valueMap['0'];
                        } else if (styleConfig.valueMap.hasOwnProperty('') && currentValue === '') {
                            mapping = styleConfig.valueMap[''];
                        }
                        // Add other specific falsey checks if needed (e.g., 'no', 'off')
                    }

                    // Apply mapping if found and not the default, and it has a 'value' defined
                    if (mapping && mapping !== styleConfig.valueMap.default && mapping.value !== undefined) {
                        if (mapping.value !== "") { // Only add span if value is not empty
                             currentIconHtml = `<span class="icon ${mapping.cssClass || ''}" title="${mapping.title || columnName + ': ' + currentValue}">${mapping.value}</span>`;
                        } else {
                             currentIconHtml = ""; // Explicitly empty output
                        }
                        iconApplied = true;
                    }
                    // 3. Check default if still no icon applied
                    else if (styleConfig.valueMap.default && !iconApplied && styleConfig.valueMap.default.value !== undefined) {
                        const defaultMapping = styleConfig.valueMap.default;
                         if (defaultMapping.value !== "") {
                           currentIconHtml = `<span class="icon ${defaultMapping.cssClass || ''}" title="${defaultMapping.title || columnName + ': ' + currentValue}">${defaultMapping.value}</span>`;
                           iconApplied = true;
                         }
                    }
                }
                itemHtml += currentIconHtml;
            }
            // --- TAG type --- (Now uses updated formatTag internally)
            else if (styleConfig.type === 'tag') {
                const tagHTML = formatTag(currentValue, config, columnName, styleConfig.titlePrefix);
                if (tagHTML) { // formatTag now returns empty string if needed
                    itemHtml += tagHTML;
                }
            }
        } catch (e) {
            console.error(`Error generating standard indicator for column "${columnName}", value "${currentValue}":`, e);
        }

        // Add the generated HTML for this item to the array if it's not just whitespace
        // Check itemHtml directly as formatTag/icon logic might return "" which is desired.
        if (itemHtml !== '') {
           generatedHtmlArray.push(itemHtml);
        }
    }); // End forEach value

    // Determine the separator based on config and if multiple items exist
    const separator = ' '

    // Join the array items with the chosen separator
    indicatorsHTML = generatedHtmlArray.join(separator);

    return indicatorsHTML; // Return potentially with trailing <br>
}

// --- createInitiativeCard and renderGroupedItemsAsGrid remain unchanged ---
// --- They rely on generateIndicatorsHTML which now handles stacking internally ---

/**
 * Creates the HTML structure for a single initiative card.
 * Reads configuration from the specific tab's config (`tabViewConfig`).
 * Uses global config for headers, indicators, etc. (`globalConfig`).
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

    // Determine Title Column from tabViewConfig, fallback to global headers
    let titleCol = 'Title'; // Default fallback
    const validHeaders = globalConfig.csvHeaders || [];
    if (validHeaders.length > 0 && !validHeaders.includes(titleCol)) { // If 'Title' doesn't exist, use first header
         titleCol = validHeaders[0];
    }


    // Get title column specific to this tab's config
    const specificTitleCol = tabViewConfig?.cardTitleColumn;
    if (specificTitleCol && validHeaders.includes(specificTitleCol)) {
         titleCol = specificTitleCol;
    }

    // Safely get title value
    const titleValue = validHeaders.includes(titleCol) ? (row[titleCol] || `[No ${titleCol}]`) : `[${titleCol} Header Missing]`;
    titleSpan.textContent = titleValue;

    // --- Link Handling for Card TITLE (uses tabViewConfig.cardLinkColumn) ---
    const titleLinkColumn = tabViewConfig?.cardLinkColumn; // Get from tab config
    let linkElement = null;
    if (titleLinkColumn && validHeaders.includes(titleLinkColumn) && row[titleLinkColumn]) {
        const url = String(row[titleLinkColumn]).trim();
        if (url.startsWith('http://') || url.startsWith('https://')) {
            linkElement = document.createElement('a');
            linkElement.href = url;
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            linkElement.className = 'card-title-link';
            linkElement.title = `Link to: ${url}`;
        }
    }

    // Append titleSpan inside link or directly
    if (linkElement) {
        titleSpan.title = titleValue; // Tooltip on the span itself
        linkElement.appendChild(titleSpan);
        headerDiv.appendChild(linkElement);
    } else {
        titleSpan.title = titleValue; // Tooltip on the span
        headerDiv.appendChild(titleSpan);
    }

    // --- Indicators (Uses generateIndicatorsHTML with globalConfig) ---
    const indicatorsSpan = document.createElement('span');
    indicatorsSpan.className = 'card-indicators';
    let indicatorsHTML = '';
    // Use the indicator columns defined in the tab's config
    const indicatorCols = tabViewConfig?.cardIndicatorColumns || []; // Use passed tab config

    indicatorCols.forEach(colName => {
        if (validHeaders.includes(colName)) {
            // Use globalConfig for indicator styles and linkColumns check
            // generateIndicatorsHTML handles stacking internally now if configured
            const generatedInd = generateIndicatorsHTML(row, colName, globalConfig);
            if(generatedInd) {
                // Add space between different indicator *groups* (i.e., between columns)
                // The internal separator (<br> or space) is handled by generateIndicatorsHTML
                indicatorsHTML += generatedInd + ' ';
            }
        }
    });

    indicatorsSpan.innerHTML = indicatorsHTML.trim(); // Trim trailing space
    if (indicatorsSpan.innerHTML) {
        headerDiv.appendChild(indicatorsSpan);
    }

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

// --- END OF FILE js/renderers/renderer-shared.js ---