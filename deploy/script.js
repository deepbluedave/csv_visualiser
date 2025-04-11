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
                    currentIconHtml = `<span class="csv-dashboard-icon ${styleConfig.trueCondition.cssClass || ''}" title="${styleConfig.trueCondition.title || columnName}">${styleConfig.trueCondition.value || '?'}</span>`;
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
                             currentIconHtml = `<span class="csv-dashboard-icon ${mapping.cssClass || ''}" title="${mapping.title || columnName + ': ' + currentValue}">${mapping.value}</span>`;
                        } else {
                             currentIconHtml = ""; // Explicitly empty output
                        }
                        iconApplied = true;
                    }
                    // 3. Check default if still no icon applied
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

// No direct imports needed for core logic, relies on appState and DOM access

// Keep track of fetched DOM elements passed from app.js
let domElements = {}; // Initial elements like controls, containers
let appState = { parsedData: [], currentConfig: {}, activeTabId: null }; // Default structure

/**
 * Initializes the View Manager with necessary DOM elements and state reference.
 * @param {object} elements Object containing references to key DOM elements (global/static ones).
 * @param {object} state Object containing references to shared state (parsedData, currentConfig, activeTabId).
 */
 function initViewManager(elements, state) {
    domElements = elements;
    appState = state; // Get reference to shared state object
}

/**
 * Generates tab buttons and view content containers based on config.
 * (Moved here from app.js for better organization)
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
        tabControls.appendChild(button);

        // Create View Content Container
        const container = document.createElement('div');
        container.id = `tab-content-${tab.id}`;
        container.className = 'view-container';
        container.setAttribute('data-view-type', tab.type);
        container.style.display = 'none'; // Hide initially

        // Add a placeholder message div inside each container
        const placeholder = document.createElement('div');
        placeholder.className = 'message-placeholder';
        placeholder.textContent = 'Initializing...';
        container.appendChild(placeholder);

        viewContentContainer.appendChild(container);
    });
}


/**
 * Shows the specified tab's content view and hides others. Updates tab button states. Manages content/message visibility.
 * @param {string} tabId The ID of the tab to show (e.g., 'all-tasks-table').
 */
 function showView(tabId) {
    const { tabControls, viewContentContainer } = domElements; // Get main containers
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

    if (activeContainer && tabConfig) {
        activeContainer.classList.add('active');
        // Set display type based on view TYPE (matches CSS)
        let displayType = 'block'; // Default
        if (tabConfig.type === 'kanban' || tabConfig.type === 'counts') {
            displayType = 'grid';
        } else if (tabConfig.type === 'summary') {
            displayType = 'flex'; // Summary container is flex column
        }
        activeContainer.style.display = displayType;
    } else {
        console.warn(`showView: Container or config for tabId '${tabId}' not found.`);
        // Fallback: Try showing the first available enabled tab
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
         return;
    }

    // Ensure ONLY the target tab's message is visible initially
    appState.currentConfig.tabs?.forEach(tab => {
        if(tab.id !== targetTabId) {
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
        const linkKeyEntry = { icon: '🔗', title: 'Link to URL', cssClass: 'icon-key-link' };
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
        iconKeyContainer.style.display = '';
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
     if (filterColumn && !globalConfig.csvHeaders.includes(filterColumn)) {
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
            if (isGroupingValid) {
                // --- Grouping Logic with Error Handling ---
                try {
                    const subGroupedData = items.reduce((acc, row) => {
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
                    const sortedSubGroupKeys = Object.keys(subGroupedData).sort((a, b) => (subGroupedData[b]?.length || 0) - (subGroupedData[a]?.length || 0));

                    const gridContainer = document.createElement('div'); gridContainer.className = 'summary-section-grid';
                    if (internalLayoutConf?.columnGap) gridContainer.style.gap = internalLayoutConf.columnGap;

                    // Use imported renderGroupedItemsAsGrid
                    renderGroupedItemsAsGrid(
                        gridContainer, subGroupedData,
                        tabConfig.config, // Pass tab config
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
                     items.forEach(item => { listContainer.appendChild(createInitiativeCard(item, tabConfig.config, globalConfig, 'summary-card')); }); // Use imported createInitiativeCard
                     sectionDiv.appendChild(listContainer);
                }
            } else {
                // Fallback list (no grouping)
                 const listContainer = document.createElement('div'); listContainer.className = 'summary-section-list';
                 items.forEach(item => { listContainer.appendChild(createInitiativeCard(item, tabConfig.config, globalConfig, 'summary-card').replace(" icon", " csv-dashboard-icon")); }); // Use imported createInitiativeCard
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
    // Apply layout styles if defined later

    // Get Config
    const countsConf = tabConfig.config;
    if (!countsConf) { showMessage(`Counts tab "${tabConfig.title}" missing 'config'.`, tabConfig.id); return; }

    const countsGroupByCol = countsConf.groupByColumn;
    const counters = countsConf.counters;
    const validHeaders = globalConfig.csvHeaders || [];

    // Validate Config
    if (!countsGroupByCol || !validHeaders.includes(countsGroupByCol)) {
        showMessage(`Counts tab "${tabConfig.title}" 'groupByColumn' invalid.`, tabConfig.id); return;
    }
    if (!counters || !Array.isArray(counters) || counters.length === 0) {
        showMessage(`Counts tab "${tabConfig.title}" requires 'counters' array.`, tabConfig.id); return;
    }
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches filter for tab "${tabConfig.title}".`, tabConfig.id); return;
    }

    // Calculate Counts
    const indicatorCounts = {};
    const indicatorDetails = {};

    filteredData.forEach(row => {
        let groupByValues = ['Uncategorized'];
        if (validHeaders.includes(countsGroupByCol)) { /* ... get groupByValue ... */
            const rawGroupByValue = row[countsGroupByCol];
            if (Array.isArray(rawGroupByValue)) {
                const meaningfulValues = rawGroupByValue.map(v => String(v || '').trim()).filter(v => v !== '');
                groupByValues = meaningfulValues.length > 0 ? [meaningfulValues.join(', ')] : ['Uncategorized'];
            } else if (rawGroupByValue !== null && typeof rawGroupByValue !== 'undefined' && String(rawGroupByValue).trim() !== '') {
                groupByValues = [String(rawGroupByValue)];
            }
        }
        const groupByValue = groupByValues[0];


        counters.forEach(counterConfig => {
            if (!counterConfig.column || !counterConfig.title || !counterConfig.filterType) { return; }
            if (!validHeaders.includes(counterConfig.column)) { return; }

            const rowValueToCheck = row[counterConfig.column];

            // Use the specific checkCounterFilter helper
            if (checkCounterFilter(rowValueToCheck, counterConfig, globalConfig)) {
                const counterTitle = counterConfig.title;
                if (!indicatorDetails[counterTitle]) { /* ... store display details ... */
                     let displayHTML = '';
                     const displayConf = counterConfig.display;
                     const cssClass = displayConf?.cssClass ? ` ${displayConf.cssClass}` : '';
                     const titleAttr = ` title="${counterConfig.title}"`;
                     if (displayConf?.type === 'icon' && displayConf.value) {
                          displayHTML = `<span class="csv-dashboard-icon${cssClass}"${titleAttr}>${displayConf.value}</span>`;
                     } else if (displayConf?.type === 'text' && displayConf.value) {
                          displayHTML = `<span class="count-header-tag-icon${cssClass}"${titleAttr}>${displayConf.value}</span>`;
                     }
                     indicatorDetails[counterTitle] = { displayHTML, title: counterTitle };
                }
                if (!indicatorCounts[counterTitle]) indicatorCounts[counterTitle] = { "__total__": 0 };
                if (!indicatorCounts[counterTitle][groupByValue]) indicatorCounts[counterTitle][groupByValue] = 0;
                indicatorCounts[counterTitle][groupByValue]++;
                indicatorCounts[counterTitle]["__total__"]++;
            }
        });
    });

    // Render Counts Grid
    const sortedCounterTitles = Object.keys(indicatorCounts).sort((a, b) => a.localeCompare(b));

    if (sortedCounterTitles.length === 0) {
        showMessage(`No items matched counters for tab "${tabConfig.title}".`, tabConfig.id); return;
    }

    sortedCounterTitles.forEach(counterTitle => {
        const groupByData = indicatorCounts[counterTitle];
        const details = indicatorDetails[counterTitle];
        const totalCount = groupByData["__total__"];

        const indicatorGroupDiv = document.createElement('div'); indicatorGroupDiv.className = 'indicator-domain-group';
        const groupHeader = document.createElement('h3');
        groupHeader.innerHTML = `${details?.displayHTML || ''}<span class="indicator-label">${details?.title || counterTitle}</span><span class="indicator-total-count">(Total: ${totalCount})</span>`;
        indicatorGroupDiv.appendChild(groupHeader);

        const boxesContainer = document.createElement('div'); boxesContainer.className = 'domain-boxes-container';
        const groupByKeys = Object.keys(groupByData).filter(key => key !== "__total__").sort((a, b) => a.localeCompare(b));

        if (groupByKeys.length > 0) {
            groupByKeys.forEach(groupByKey => {
                const count = groupByData[groupByKey];
                if (count > 0) {
                    const boxDiv = document.createElement('div'); boxDiv.className = 'domain-count-box';
                    boxDiv.innerHTML = `<span class="count-number">${count}</span><span class="domain-label">${groupByKey}</span>`;
                    boxDiv.title = `${details?.title || counterTitle} - ${countsGroupByCol}: ${groupByKey} (${count})`;
                    boxesContainer.appendChild(boxDiv);
                }
            });
            if (boxesContainer.children.length > 0) {
                indicatorGroupDiv.appendChild(boxesContainer);
            } else {
                 const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
                 noCountsMsg.textContent = `No counts > 0 for any specific ${countsGroupByCol}.`; indicatorGroupDiv.appendChild(noCountsMsg);
            }
        } else {
            const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
            noCountsMsg.textContent = `No breakdown by ${countsGroupByCol} found.`; indicatorGroupDiv.appendChild(noCountsMsg);
        }
        targetElement.appendChild(indicatorGroupDiv);
    });

    if (targetElement.querySelector('.indicator-domain-group')) {
        hideMessages(tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-counts.js ---
// --- START OF FILE js/app.js ---

// --- Wait for DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // --- Get STATIC DOM Elements ---
    const fileInput = document.getElementById('cdg-csvFileInput');
    const uploadContainer = document.getElementById('cdg-uploadContainer');
    const tabControls = document.getElementById('cdg-tabControls'); // Container for dynamic buttons
    const viewContentContainer = document.getElementById('cdg-viewContentContainer'); // Container for dynamic views
    const mainHeading = document.querySelector('h1');
    const iconKeyContainer = document.getElementById('cdg-iconKeyContainer'); // Keep global icon key

    // Check if essential containers were found
    if (!fileInput || !tabControls || !viewContentContainer || !mainHeading) {
        console.error("Essential DOM elements missing (controls/containers). Dashboard cannot initialize.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Critical Error: Required HTML structure is missing. Cannot load dashboard.</h1>';
        return;
    }

    // Collect static DOM elements for View Manager
    const domElements = {
        fileInput, uploadContainer, tabControls, viewContentContainer,
        mainHeading, iconKeyContainer
    };


    // --- State ---
    // Access defaultConfig from config.js (loaded globally)
    let currentConfig = JSON.parse(JSON.stringify(defaultConfig));
    let parsedData = []; // Holds the full dataset
    let activeTabId = null; // Track the ID of the currently visible tab

    // --- State Object for View Manager & Renderers ---
    const appState = {
        get parsedData() { return parsedData; },
        get currentConfig() { return currentConfig; },
        get activeTabId() { return activeTabId; },
        set activeTabId(id) { activeTabId = id; }
    };

    // --- Initialization ---
    initViewManager(domElements, appState); // Pass static elements & state ref
    initializeDashboard();

    // --- Event Listeners ---
    if (fileInput) fileInput.addEventListener('change', handleFileSelectEvent);
    if (tabControls) tabControls.addEventListener('click', handleTabClick);


    // --- Core Application Functions ---

    /**
     * Initializes the dashboard: applies config, generates tabs, attempts URL load or enables upload.
     */
    function initializeDashboard() {
        console.log("Initializing Dashboard...");
        applyCustomTitle(currentConfig, mainHeading);
        applyConfigStyles(currentConfig); // Apply global dynamic styles initially
        renderIconKey(currentConfig);     // Render global icon key

        // --- Dynamically create Tabs and View Containers ---
        generateTabsAndContainers(currentConfig.tabs); // Use imported function

        // --- Determine Default Tab ---
        const firstEnabledTab = currentConfig.tabs?.find(tab => tab.enabled !== false);
        if (firstEnabledTab) {
            appState.activeTabId = firstEnabledTab.id; // Set initial active tab ID
            console.log(`Default active tab set to: ${appState.activeTabId}`);
        } else {
            console.warn("No enabled tabs found in configuration.");
             if(tabControls) tabControls.innerHTML = '<p style="color: red; padding: 10px;">Error: No enabled tabs configured.</p>';
             if(viewContentContainer) viewContentContainer.innerHTML = ''; // Clear content area too
            return; // Stop initialization if no tabs
        }

        // --- Load Data ---
        const csvUrl = currentConfig.generalSettings?.csvUrl?.trim();
        if (csvUrl) {
            console.log(`Configuration specifies CSV URL: ${csvUrl}`);
            updateUiForLoadMode('url');
            showMessageOnLoad(appState.activeTabId, 'Loading data from URL...'); // Show loading in default tab
            loadAndProcessData(() => loadDataFromUrl(csvUrl));
        } else {
            console.log("No CSV URL configured. Enabling file upload.");
            updateUiForLoadMode('file');
            showMessageOnLoad(appState.activeTabId); // Show "Upload CSV" in default tab
            showView(appState.activeTabId); // Ensure the default tab view structure is displayed correctly initially
        }
    }


    /**
     * Central function to trigger data loading, parse, filter, and render tabs.
     * @param {Function} loadFunction Async function returning CSV content string.
     */
    async function loadAndProcessData(loadFunction) {
        clearAllViews(true); // Clear previous view content, keep placeholders
        showMessageOnLoad(appState.activeTabId, "Processing data..."); // Show in active tab

        try {
            // 1. Load Data
            const csvContent = await loadFunction();
            console.log("loadAndProcessData: CSV content loaded.");

            // 2. Parse Data (Updates global config with headers)
            const { data, headers } = parseCSV(csvContent, currentConfig);
            parsedData = data; // Update global state
            currentConfig.csvHeaders = headers; // Update global config state

            console.log(`loadAndProcessData: CSV parsed. Headers: ${headers.length}, Rows: ${parsedData.length}.`);

            // 3. Render All Tabs
            if (parsedData.length > 0 || headers.length > 0) {
                console.log("loadAndProcessData: Rendering all configured tabs...");
                renderAllTabs(); // Render content for each tab based on its config and filters
                renderIconKey(currentConfig); // Re-render icon key
                console.log("loadAndProcessData: Tab rendering complete.");
            } else {
                console.warn("loadAndProcessData: CSV parsed but resulted in 0 data rows and 0 headers.");
                const parseFailMsg = `CSV empty or data could not be extracted. Check delimiter ("${currentConfig.generalSettings?.csvDelimiter || ','}") and file/URL content.`;
                // Show error message in all tab placeholders
                currentConfig.tabs?.forEach(tab => {
                    if (tab.enabled !== false) showMessage(parseFailMsg, tab.id);
                });
                clearAllViews(true); // Ensure views are clear but placeholders show message
            }

        } catch (error) {
             console.error("ERROR during data loading or processing:", error);
             parsedData = []; // Reset data
             currentConfig.csvHeaders = [];
             const errorMsg = `Error: ${error.message}. Check console (F12) and verify CSV/config.`;
             // Show error in all tab placeholders
             currentConfig.tabs?.forEach(tab => {
                 if (tab.enabled !== false) showMessage(errorMsg, tab.id);
             });
             clearAllViews(true); // Keep placeholders visible with error
             if (typeof alert !== 'undefined') alert(errorMsg); // Also alert user

        } finally {
             // Ensure the correct default/active view is visible after processing
             const targetTab = appState.activeTabId || currentConfig.tabs?.find(t => t.enabled !== false)?.id;
             if (targetTab) {
                showView(targetTab);
             }
             if (fileInput) fileInput.value = ''; // Reset file input
        }
    }

    /**
     * Iterates through configured tabs, applies filters, and calls the appropriate renderer.
     */
    function renderAllTabs() {
        if (!currentConfig.tabs) {
            console.error("renderAllTabs: No tabs defined in configuration.");
            return;
        }

        currentConfig.tabs.forEach(tabConfig => {
            if (tabConfig.enabled === false) return; // Skip disabled tabs

            const targetElement = document.getElementById(`tab-content-${tabConfig.id}`);
            if (!targetElement) {
                console.warn(`renderAllTabs: Target element for tab ${tabConfig.id} not found.`);
                return;
            }

            try {
                 // 1. Filter Data for this specific tab
                 const filteredData = applyTabFilter(parsedData, tabConfig.filter, currentConfig);
                 console.log(`Tab "${tabConfig.title}" (${tabConfig.id}): ${filteredData.length} rows after filtering.`);

                 // 2. Basic Config Validation
                 let configValid = true;
                 let errorMsg = '';
                 if (!currentConfig.csvHeaders || currentConfig.csvHeaders.length === 0 && parsedData.length > 0) {
                      configValid = false; errorMsg = 'CSV Headers not available for validation.'
                 } else {
                     if (tabConfig.type === 'kanban' && (!tabConfig.config?.groupByColumn || !currentConfig.csvHeaders.includes(tabConfig.config.groupByColumn))) {
                         configValid = false; errorMsg = `Kanban 'groupByColumn' ("${tabConfig.config?.groupByColumn || ''}") is missing or invalid.`;
                     }
                     if (tabConfig.type === 'counts' && (!tabConfig.config?.groupByColumn || !currentConfig.csvHeaders.includes(tabConfig.config.groupByColumn))) {
                         configValid = false; errorMsg = `Counts 'groupByColumn' ("${tabConfig.config?.groupByColumn || ''}") is missing or invalid.`;
                     }
                     // Add more validation checks as needed for other types/configs
                 }


                 if (!configValid) {
                     throw new Error(`Invalid configuration: ${errorMsg}`);
                 }

                 // 3. Call the correct renderer
                 switch (tabConfig.type) {
                    case 'table':
                        renderTable(filteredData, tabConfig, currentConfig, targetElement, showMessage);
                        break;
                    case 'kanban':
                        renderKanban(filteredData, tabConfig, currentConfig, targetElement, showMessage);
                        break;
                    case 'summary':
                        renderSummaryView(filteredData, tabConfig, currentConfig, targetElement, showMessage);
                        break;
                    case 'counts':
                        renderCountsView(filteredData, tabConfig, currentConfig, targetElement, showMessage);
                        break;
                    default:
                        console.warn(`renderAllTabs: Unknown tab type "${tabConfig.type}" for tab "${tabConfig.title}".`);
                        showMessage(`Unknown view type configured: "${tabConfig.type}"`, tabConfig.id);
                }
            } catch (renderError) {
                 console.error(`Error rendering tab "${tabConfig.title}" (${tabConfig.id}):`, renderError);
                 showMessage(`Error rendering tab: ${renderError.message}`, tabConfig.id);
            }
        });
         // After rendering, ensure styles reflecting config (like column widths) are applied
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

        // Reset config might not be needed if structure is stable, but can be done
        // currentConfig = JSON.parse(JSON.stringify(defaultConfig));
        // applyConfigStyles(currentConfig); // Re-apply styles if config reset

        showMessageOnLoad(appState.activeTabId, `Reading file: ${file.name}...`);
        loadAndProcessData(() => readFileContent(file));
    }

    /**
     * Handles clicks on the dynamically generated tab buttons.
     * @param {Event} event The click event.
     */
    function handleTabClick(event) {
         const button = event.target.closest('.tab-button'); // Find the button element  
         if (button) {
             const tabId = button.getAttribute('data-tab-id');
             if (tabId && tabId !== appState.activeTabId) {
                 console.log(`Switching view to tab: ${tabId}`);
                 // appState.activeTabId = tabId; // Let showView update the state
                 showView(tabId); // Show the new view (updates activeTabId internally)
                 // Optionally re-apply styles if they depend heavily on active state
                 // applyConfigStyles(currentConfig);
             }
         }
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
