// shared_utils.js

/**
 * Checks if a value represents a "truthy" state based on config.generalSettings.trueValues.
 * Case-insensitive comparison.
 * @param {*} value The value to check.
 * @param {object} viewerConfig The viewer's configuration object (containing generalSettings.trueValues).
 * @returns {boolean} True if the value matches a configured true value.
 */
function isTruthy(value, viewerConfig) {
    if (value === null || typeof value === 'undefined') return false;
    const stringValue = String(value).toLowerCase();
    if (stringValue === '') return false;

    const trueValsArray = viewerConfig?.generalSettings?.trueValues || ["true", "yes", "1", "y", "x", "on", "✓"];
    const trueValsLower = trueValsArray.map(v => String(v).toLowerCase());
    return trueValsLower.includes(stringValue);
}

/**
 * Reads content from a user-selected file (reads as text).
 * @param {File} file The file object selected by the user.
 * @returns {Promise<string>} Resolves with the file content as a string.
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error("No file provided."));
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(evt) {
            console.error("FileReader error:", reader.error);
            reject(new Error(`Error reading file: ${reader.error.message || 'Unknown error'}`));
        };
        reader.readAsText(file);
    });
}

/**
 * Formats a single value as an HTML tag based on indicatorStyles configuration.
 * This is a version adapted for the editor, prioritizing simplicity for display.
 * @param {*} value The single string value to format.
 * @param {object} viewerConfig The viewer's configuration object.
 * @param {string} columnName The name of the column this value belongs to.
 * @param {string} [titlePrefix=''] Optional prefix for the tag's title attribute.
 * @returns {string} The HTML string for the tag, or an empty string.
 */
function formatTag(value, viewerConfig, columnName, titlePrefix = '') {
    const stringValue = String(value ?? '');
    if (stringValue === '') return '';

    const styleConf = viewerConfig?.indicatorStyles?.[columnName];
    let tagStyle = null;
    let displayText = stringValue;

    if (styleConf && styleConf.type === 'tag') {
        if (Array.isArray(styleConf.styleRules)) {
            for (const rule of styleConf.styleRules) {
                let match = false;
                try {
                    if (rule.matchType === 'regex' && rule.pattern && new RegExp(rule.pattern, 'i').test(stringValue)) match = true;
                    else if (rule.matchType === 'exact' && stringValue === rule.value) match = true;
                } catch (e) { /* ignore regex errors */ }
                if (match && rule.style) {
                    tagStyle = rule.style;
                    break;
                }
            }
            if (!tagStyle) tagStyle = styleConf.defaultStyle || null;
        }
        if (!tagStyle && styleConf.valueMap) {
            const lowerValue = stringValue.toLowerCase();
            tagStyle = styleConf.valueMap[stringValue] ?? styleConf.valueMap[lowerValue] ?? styleConf.valueMap['default'];
        }
    }

    if (tagStyle) {
        displayText = tagStyle.text !== undefined ? tagStyle.text : stringValue;
        if (displayText === "") return ""; // Explicitly hide if text is empty string

        const bgColor = tagStyle.bgColor || '#e9ecef';
        const textColor = tagStyle.textColor || '#495057';
        const borderColor = tagStyle.borderColor || bgColor;
        const title = tagStyle.title || `${titlePrefix}${stringValue}`;
        return `<span class="tag editor-cell-mini-tag" style="background-color:${bgColor}; color:${textColor}; border-color:${borderColor};" title="${title}">${displayText}</span>`;
    }
    return `<span class="editor-cell-mini-tag">${stringValue}</span>`; // Default mini-tag if no style
}


/**
 * Sorts an array of data objects based on multiple criteria defined in sortByConfig.
 * Handles basic string, numeric comparison, custom ordering, and null/undefined values.
 * @param {object[]} dataArray The array of data objects to sort (will be sorted in place).
 * @param {object[]} sortByConfig Array of sort criteria.
 * @param {object} sortHelperConfig Object containing `csvHeaders` (array of valid column names for sorting) and `generalSettings.trueValues` (for boolean-like comparisons if needed, though not directly used in this version of sort).
 * @returns {object[]} The sorted dataArray (same array instance passed in).
 */
function sortData(dataArray, sortByConfig, sortHelperConfig) {
    if (!Array.isArray(dataArray)) {
        console.warn("sortData: dataArray is not an array. Returning original.");
        return dataArray;
    }
    if (!Array.isArray(sortByConfig) || sortByConfig.length === 0) {
        return dataArray;
    }

    const validSortHeaders = sortHelperConfig?.csvHeaders || []; // Headers valid for sorting

    const validSortBy = sortByConfig.map(criterion => {
        if (!criterion || typeof criterion !== 'object' || !criterion.column) {
            console.warn(`sortData: Invalid sort criterion structure. Ignoring:`, criterion);
            return null;
        }
        if (!validSortHeaders.includes(criterion.column)) {
            console.warn(`sortData: Sort column "${criterion.column}" not found in provided headers. Ignoring criterion.`);
            return null;
        }
        const direction = String(criterion.direction || 'asc').toLowerCase();
        let order = null;
        if (direction === 'custom') {
            if (!Array.isArray(criterion.order) || criterion.order.length === 0) {
                console.warn(`sortData: 'custom' sort for "${criterion.column}" missing 'order' array. Falling to 'asc'.`);
                return { ...criterion, direction: 'asc' };
            }
            order = criterion.order.map(item => String(item ?? '').toLowerCase());
        } else if (!['asc', 'desc'].includes(direction)) {
            console.warn(`sortData: Invalid direction "${criterion.direction}" for "${criterion.column}". Defaulting to 'asc'.`);
            return { ...criterion, direction: 'asc' };
        }
        return { ...criterion, direction, order };
    }).filter(Boolean);

    if (validSortBy.length === 0) {
        console.warn("sortData: No valid sort criteria remaining after validation.");
        return dataArray;
    }

    const comparisonFunction = (a, b) => {
        for (const criterion of validSortBy) {
            const { column, direction, order } = criterion;
            const valA = a[column];
            const valB = b[column];
            const aIsNull = valA === null || typeof valA === 'undefined' || valA === '';
            const bIsNull = valB === null || typeof valB === 'undefined' || valB === '';

            if (aIsNull && bIsNull) continue;
            if (aIsNull) return 1; // Blanks/nulls go last in asc, first in desc (standard behavior)
            if (bIsNull) return -1;

            let comparison = 0;
            if (direction === 'custom') {
                const valALower = String(valA).toLowerCase();
                const valBLower = String(valB).toLowerCase();
                const indexA = order.indexOf(valALower);
                const indexB = order.indexOf(valBLower);

                if (indexA !== -1 && indexB !== -1) comparison = indexA - indexB;
                else if (indexA !== -1) comparison = -1; // A is in custom order, B is not
                else if (indexB !== -1) comparison = 1;  // B is in custom order, A is not
                else comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
            } else {
                const numA = Number(valA);
                const numB = Number(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    comparison = numA - numB;
                } else {
                    // Date comparison attempt (basic: YYYY-MM-DD or parsable by Date)
                    const dateA = new Date(valA);
                    const dateB = new Date(valB);
                    if (!isNaN(dateA) && !isNaN(dateB)) {
                        comparison = dateA - dateB;
                    } else {
                        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                    }
                }
                if (direction === 'desc') comparison *= -1;
            }
            if (comparison !== 0) return comparison;
        }
        return 0;
    };

    try {
        dataArray.sort(comparisonFunction);
    } catch (error) {
        console.error("Error during dataArray.sort():", error);
    }
    return dataArray;
}


console.log("shared_utils.js loaded with sortData function.");
// --- END OF FILE js/shared_utils.js ---
// editor_dom_elements.js

const editorDomElements = {
    viewerConfigFileInput: document.getElementById('viewerConfigFileInput'),
    editorConfigFileInput: document.getElementById('editorConfigFileInput'),
    csvDataFileInput: document.getElementById('csvDataFileInput'),
    addRowBtn: document.getElementById('addRowBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    statusMessages: document.getElementById('statusMessages'),
    editorGridContainer: document.getElementById('editorGridContainer'),
    editorGridTable: document.querySelector('#editorGridContainer table'),
    editorGridThead: document.querySelector('#editorGridContainer table thead'),
    editorGridTbody: document.querySelector('#editorGridContainer table tbody'),
    sortDataBtn: document.getElementById('sortDataBtn')
};

if (!editorDomElements.editorGridTable) {
    console.error("CRITICAL: Editor grid table element not found!");
    if (editorDomElements.statusMessages) {
        editorDomElements.statusMessages.textContent = "CRITICAL ERROR: HTML structure incomplete. Grid table missing.";
        editorDomElements.statusMessages.style.color = "red";
    }
}
// --- END OF FILE js/editor_dom_elements.js ---
// editor_config_handler.js

let currentEditorConfig = null;
let currentViewerConfig = null;

async function loadJsConfigurationFile(file, expectedGlobalVarName) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error("No file provided for configuration."));
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const scriptContent = e.target.result;
            try {
                const priorGlobal = window[expectedGlobalVarName];
                let newConfig = null;

                try {
                    const modifiedScriptContent = `
                        window.__tempConfigVar__ = (function(){
                            ${scriptContent}
                            return typeof ${expectedGlobalVarName} !== 'undefined' ? ${expectedGlobalVarName} : undefined;
                        })();
                    `;

                    const scriptTag = document.createElement('script');
                    scriptTag.textContent = modifiedScriptContent;
                    document.body.appendChild(scriptTag);

                    newConfig = window.__tempConfigVar__;
                    delete window.__tempConfigVar__;
                    document.body.removeChild(scriptTag);

                } catch (executionError) {
                    if (priorGlobal !== undefined) window[expectedGlobalVarName] = priorGlobal;
                    // else delete window[expectedGlobalVarName]; // This might not effectively delete 'let' declared globals
                    return reject(new Error(`Error executing configuration script ${file.name}: ${executionError.message}`));
                }

                if (typeof newConfig === 'object' && newConfig !== null) {
                    if (priorGlobal !== undefined) {
                        window[expectedGlobalVarName] = priorGlobal;
                    }
                    resolve(JSON.parse(JSON.stringify(newConfig)));
                } else {
                     let errorMsg = `Configuration script did not make the expected variable '${expectedGlobalVarName}' available as an object, or it was null.`;
                     if (typeof newConfig === 'undefined') {
                         errorMsg += ` Variable '${expectedGlobalVarName}' was not defined globally or returned. Check the config file structure.`;
                     }
                    reject(new Error(errorMsg));
                }
            } catch (error) {
                reject(new Error(`Error processing configuration script ${file.name}: ${error.message}`));
            }
        };
        reader.onerror = () => reject(new Error(`Error reading configuration file ${file.name}.`));
        reader.readAsText(file);
    });
}

function getEditorConfig() {
    return currentEditorConfig;
}

function getViewerConfig() {
    return currentViewerConfig;
}

function setEditorConfig(config) {
    if (!config || !Array.isArray(config.columns) || config.columns.length === 0) {
        currentEditorConfig = null;
        throw new Error("Invalid editor configuration: Must be an object with a non-empty 'columns' array.");
    }
    currentEditorConfig = config;
    console.log("Editor config set:", currentEditorConfig);
}

function setViewerConfig(config) {
    if (!config || !config.generalSettings) {
        currentViewerConfig = null;
        throw new Error("Invalid viewer configuration: Must be an object with 'generalSettings'.");
    }
    currentViewerConfig = config;
    console.log("Viewer config set:", currentViewerConfig);
}

function clearAllConfigs() { // Renamed for clarity
    currentEditorConfig = null;
    currentViewerConfig = null;
    console.log("All configurations cleared.");
}
// --- END OF FILE js/editor_config_handler.js ---
// editor_csv_parser.js

/**
 * Parses a single line of CSV text, respecting quotes and escaped quotes.
 * @param {string} line The CSV line string.
 * @param {string} delimiter The delimiter character.
 * @returns {string[]} An array of field values.
 */
function editorParseCSVLine(line, delimiter = ',') {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (insideQuotes) {
            if (char === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    currentValue += '"'; i++;
                } else {
                    insideQuotes = false;
                }
            } else {
                currentValue += char;
            }
        } else {
            if (char === '"') {
                insideQuotes = true;
            } else if (char === delimiter) {
                values.push(currentValue); currentValue = '';
            } else {
                currentValue += char;
            }
        }
    }
    values.push(currentValue);
    return values.map(v => v.trim()); // Trim after parsing
}

/**
 * Parses the entire CSV text content for the editor.
 * @param {string} csvText The raw CSV content.
 * @param {string} delimiter Delimiter from editorConfig.csvOutputOptions.delimiter (or viewer's default if not yet loaded)
 * @returns {{data: object[], headers: string[]}} Object containing parsed data and headers.
 */
function editorParseCSV(csvText, delimiter = ',') {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) return { data: [], headers: [] };

    const headers = editorParseCSVLine(lines[0], delimiter);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const lineText = lines[i].trim();
        if (!lineText) continue;

        const values = editorParseCSVLine(lineText, delimiter);
        const rowObject = {};
        let hasContent = false;
        for (let j = 0; j < headers.length; j++) {
            const header = headers[j]; // CSV original header
            if (header) { // Ensure header exists
                rowObject[header] = values[j] !== undefined ? values[j] : ''; // Use original CSV header as key
                if(rowObject[header] && String(rowObject[header]).trim() !== '') hasContent = true;
            }
        }
        if(hasContent || values.some(v => v !== '')) { // Add row if any value is not empty string
           data.push(rowObject);
        }
    }
    return { data, headers };
}
// --- END OF FILE js/editor_csv_parser.js ---
// editor_csv_generator.js

function escapeCsvValueForEditor(value) { /* ... no change ... */
    const stringValue = String(value ?? '');
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        const escapedValue = stringValue.replace(/"/g, '""');
        return `"${escapedValue}"`;
    }
    return stringValue;
}

function generateCsvForExport(data, columnDefinitions, csvOutputOptions) {
    if (!columnDefinitions || columnDefinitions.length === 0) {
        console.warn("generateCsvForExport: No column definitions.");
        return '';
    }

    const delimiter = csvOutputOptions?.delimiter || ',';
    const booleanTrue = csvOutputOptions?.booleanTrueValue || "TRUE";
    const booleanFalse = csvOutputOptions?.booleanFalseValue || "FALSE"; // Default to "FALSE" string

    const headers = columnDefinitions.map(colDef => colDef.name);
    const csvRows = [];

    csvRows.push(headers.map(escapeCsvValueForEditor).join(delimiter));

    if (data && data.length > 0) {
        data.forEach(row => {
            const rowData = [];
            columnDefinitions.forEach(colDef => {
                let valueToExport = row[colDef.name];

                // Handle boolean export based on type and csvOutputOptions
                if (colDef.type === 'checkbox') {
                    // Assuming data stores the string "TRUE"/"FALSE" or similar from editorConfig
                    // We need a reliable way to check truthiness here if data stores varied boolean representations
                    // For simplicity now, if the editor stored trueVal/falseVal directly, we use that.
                    // OR, more robustly, check against the *viewer's* trueValues for input, then map to output.
                    // Let's assume for now _csvDataInstance stores the strings "TRUE" or "FALSE" (or what editor config specifies for output)
                    // This part was handled in handleCellChange.
                    // So valueToExport should already be the correct string representation.
                }
                // For other types, just use the value. Date/number formatting for export can be added if needed.
                rowData.push(escapeCsvValueForEditor(valueToExport));
            });
            csvRows.push(rowData.join(delimiter));
        });
    }
    return csvRows.join('\r\n');
}
// --- END OF FILE js/editor_csv_generator.js ---
// editor_data_grid.js

let _csvDataInstance = [];
let _editorConfigInstance = null;
let _viewerConfigInstance = null;
let _activePopup = null;

function initDataGridReferences(csvDataArrayRef, editorConfigRef, viewerConfigRef) {
    _csvDataInstance = csvDataArrayRef;
    _editorConfigInstance = editorConfigRef;
    _viewerConfigInstance = viewerConfigRef;
    console.log("DataGrid references updated in editor_data_grid.js.");
}

function renderGridStructure(columnDefinitions) {
    const { editorGridThead } = editorDomElements;
    if (!editorGridThead) {
        console.error("renderGridStructure: Table header element not found.");
        return;
    }
    editorGridThead.innerHTML = '';

    if (!columnDefinitions || columnDefinitions.length === 0) {
        console.warn("renderGridStructure: No column definitions provided from editor config.");
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = "Load Editor Config to define columns.";
        th.colSpan = 10; // Arbitrary large number
        tr.appendChild(th);
        editorGridThead.appendChild(tr);
        return;
    }

    const tr = document.createElement('tr');
    columnDefinitions.forEach((colDef) => {
        const th = document.createElement('th');
        const headerTextSpan = document.createElement('span');
        headerTextSpan.className = 'header-text-content';
        headerTextSpan.textContent = colDef.label || colDef.name;
        th.appendChild(headerTextSpan);
        th.title = `CSV Header: ${colDef.name}`;

        const orientation = colDef.orientation || 'horizontal';
        th.classList.add(`header-${orientation}`);

        if (colDef.columnWidth) {
            th.style.width = colDef.columnWidth;
        } else {
            th.style.width = (orientation === 'vertical') ? '50px' : '150px';
        }
        tr.appendChild(th);
    });

    const thActions = document.createElement('th');
    thActions.textContent = "Actions";
    thActions.style.width = "80px";
    tr.appendChild(thActions);
    editorGridThead.appendChild(tr);
    console.log("Grid structure (headers) rendered based on editor config.");
}

function clearGridContent() {
    const { editorGridTbody } = editorDomElements;
    if (editorGridTbody) {
        editorGridTbody.innerHTML = '';
    }
    if (_activePopup) {
        _activePopup.remove();
        _activePopup = null;
    }
    console.log("Grid content (tbody) cleared.");
}

function clearGridStructure() {
    const { editorGridThead } = editorDomElements;
    if (editorGridThead) editorGridThead.innerHTML = '';
    clearGridContent();
    console.log("Entire grid structure (thead and tbody) cleared.");
}

function validateCell(td, value, colDef) {
    let isValid = true;
    td.classList.remove('cell-error');
    let originalTitle = `CSV Header: ${colDef.name}`;

    if (colDef.required) {
        let isEmpty = false;
        if (colDef.type === 'multi-select') {
            isEmpty = !Array.isArray(value) || value.length === 0;
        } else {
            // For single select, an empty string value ('') is considered "empty" for required check
            // unless it's the explicit "No Selection" option.
            // The (No Selection) option has value = ""
            isEmpty = value === null || value === undefined || String(value).trim() === '';
            if (colDef.type === 'select' && value === '') { // If it's a select and value is empty string (our "no selection")
                isEmpty = true; // It is indeed empty for validation purposes if required
            }
        }
        if (isEmpty) {
            isValid = false;
            td.title = `${colDef.label} is required.`;
        }
    }

    if (isValid && colDef.validationRegex && String(value).trim() !== '' && !['select', 'multi-select', 'checkbox', 'date', 'number'].includes(colDef.type)) {
        try {
            const regex = new RegExp(colDef.validationRegex);
            if (!regex.test(String(value))) {
                isValid = false;
                td.title = `${colDef.label} does not match pattern: ${colDef.validationRegex}. Current: "${value}"`;
            }
        } catch (e) {
            console.warn(`Invalid regex in editor_config for column "${colDef.name}": ${colDef.validationRegex}`, e);
        }
    }

    if (!isValid) {
        td.classList.add('cell-error');
    } else {
        if (td.title.startsWith(colDef.label) && (td.title.includes("is required") || td.title.includes("does not match pattern"))) {
            td.title = originalTitle;
        } else if (!td.title && colDef.name) { // Ensure title is set if it was cleared
            td.title = originalTitle;
        }
    }
    return isValid;
}

function getStyledCellDisplay(cellValue, colDef) {
    const viewerStyleColName = colDef.viewerStyleColumnName || colDef.name;
    const viewerCfg = _viewerConfigInstance || { generalSettings: {}, indicatorStyles: {} };
    const indicatorStyleConf = viewerCfg.indicatorStyles?.[viewerStyleColName];
    const isLinkColInViewer = viewerCfg.generalSettings?.linkColumns?.includes(colDef.name);

    if (indicatorStyleConf) {
        if (indicatorStyleConf.type === 'icon') {
            let iconToShow = '';
            if (indicatorStyleConf.trueCondition && isTruthy(cellValue, viewerCfg)) {
                iconToShow = indicatorStyleConf.trueCondition.value || '';
            } else if (indicatorStyleConf.valueMap) {
                const valStr = String(cellValue ?? '');
                const valStrLower = valStr.toLowerCase();
                let mapping = indicatorStyleConf.valueMap[valStr] ?? indicatorStyleConf.valueMap[valStrLower];
                if (mapping === undefined) {
                    if (valStr === '' && indicatorStyleConf.valueMap.hasOwnProperty('')) { mapping = indicatorStyleConf.valueMap['']; }
                    else if (isTruthy(cellValue, viewerCfg) && indicatorStyleConf.valueMap.hasOwnProperty('true')) { mapping = indicatorStyleConf.valueMap['true']; }
                    else if (!isTruthy(cellValue, viewerCfg) && indicatorStyleConf.valueMap.hasOwnProperty('false')) { mapping = indicatorStyleConf.valueMap['false']; }
                }
                if (mapping === undefined) { mapping = indicatorStyleConf.valueMap['default']; }
                if (mapping && mapping.value !== undefined) { iconToShow = mapping.value; }
            }
            if (colDef.type === 'checkbox' && iconToShow === String(cellValue) && (String(cellValue).toUpperCase() === "TRUE" || String(cellValue).toUpperCase() === "FALSE")) {
                 return '';
            }
            return iconToShow ? `<span class="editor-cell-icon" title="${String(cellValue ?? '')}">${iconToShow}</span>` : (colDef.type === 'checkbox' ? '' : String(cellValue ?? ''));
        } else if (indicatorStyleConf.type === 'tag' && typeof formatTag === 'function') {
            if (colDef.type === 'multi-select' && Array.isArray(cellValue)) {
                if (cellValue.length === 0) return '';
                return cellValue.map(val => formatTag(val, viewerCfg, viewerStyleColName, indicatorStyleConf.titlePrefix) || `<span class="editor-cell-mini-tag">${val}</span>`).join(' ');
            } else {
                let formatted = formatTag(cellValue, viewerCfg, viewerStyleColName, indicatorStyleConf.titlePrefix);
                // If formatTag returns empty (e.g. value maps to empty text/icon), show blank, not raw value for tags.
                return formatted || (cellValue === '' ? '' : String(cellValue ?? ''));
            }
        }
    }

    if (isLinkColInViewer && colDef.type !== 'checkbox') {
        const urlValueStr = String(cellValue ?? '');
        if (urlValueStr.trim() !== '') {
            return `<span class="editor-cell-icon" title="Link: ${urlValueStr}">🔗</span> <span class="cell-url-display-span" title="${urlValueStr}">${urlValueStr}</span>`;
        } else { return ''; }
    }

    if (colDef.type === 'multi-select' && Array.isArray(cellValue)) {
        if (cellValue.length === 0) return '';
        return cellValue.map(v => `<span class="editor-cell-mini-tag">${String(v ?? '')}</span>`).join(' ');
    }
    if (colDef.type === 'checkbox') { return ''; } // Default for checkbox is blank if no icon
    if (colDef.type === 'select' && cellValue === '') { return '(No Selection)'; } // Display for blank select

    return String(cellValue ?? '');
}

function renderGridData() {
    const { editorGridTbody } = editorDomElements;
    if (!editorGridTbody) { console.error("renderGridData: Table body element not found."); return; }
    clearGridContent();

    if (!_editorConfigInstance || !_editorConfigInstance.columns || _editorConfigInstance.columns.length === 0) {
        console.warn("renderGridData: No column definitions from editor config."); return;
    }
    const columnDefinitions = _editorConfigInstance.columns;

    if (!_csvDataInstance || _csvDataInstance.length === 0) {
        const tr = editorGridTbody.insertRow();
        const td = tr.insertCell(); td.colSpan = columnDefinitions.length + 1;
        td.textContent = "No CSV data loaded. Click '+ Add Row' or load a CSV.";
        td.style.textAlign = "center"; td.style.fontStyle = "italic"; td.style.padding = "20px";
        return;
    }

    _csvDataInstance.forEach((row, rowIndex) => {
        const tr = editorGridTbody.insertRow();
        tr.dataset.rowIndex = rowIndex;

        columnDefinitions.forEach(colDef => {
            const td = tr.insertCell();
            td.dataset.columnName = colDef.name;
            td.dataset.rowIndex = rowIndex;
            let cellValue = row[colDef.name];
            if (cellValue === undefined) {
                cellValue = (colDef.type === 'multi-select' ? [] : '');
            }

            const styleConfForCol = _viewerConfigInstance?.indicatorStyles?.[colDef.viewerStyleColumnName || colDef.name];
            if (colDef.type === 'checkbox' ||
                colDef.type === 'multi-select' ||
                (styleConfForCol && styleConfForCol.type === 'icon') ||
                (colDef.type === 'select' && styleConfForCol && styleConfForCol.type === 'tag') ||
                (_viewerConfigInstance?.generalSettings?.linkColumns?.includes(colDef.name) && !(styleConfForCol && (styleConfForCol.type === 'tag')))
            ) {
                td.classList.add('cell-align-center');
            }
            if (colDef.type === 'multi-select') {
                td.classList.add('cell-type-multi-select');
            }

            td.innerHTML = getStyledCellDisplay(cellValue, colDef);
            if (!colDef.readOnly) {
                td.addEventListener('click', handleCellClickToEdit);
                if (colDef.type === 'checkbox') td.classList.add('editor-cell-boolean-toggle');
            } else {
                td.classList.add('cell-readonly');
            }
            validateCell(td, cellValue, colDef);
        });

        const actionTd = tr.insertCell();
        actionTd.classList.add('action-cell');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Delete"; deleteBtn.dataset.rowIndex = rowIndex;
        deleteBtn.addEventListener('click', handleDeleteRowClick);
        actionTd.appendChild(deleteBtn);
    });
    console.log(`Grid data rendered: ${_csvDataInstance.length} rows.`);
}

function handleCellClickToEdit(event) {
    let td = event.target.closest('td');
    if (!td || td.classList.contains('cell-readonly') || td.querySelector('input, select, textarea, .custom-select-popup')) return;

    const columnName = td.dataset.columnName;
    const rowIndex = parseInt(td.dataset.rowIndex, 10);
    const colDef = _editorConfigInstance.columns.find(c => c.name === columnName);
    if (!colDef) return;

    if (_activePopup && _activePopup.td !== td) { _activePopup.remove(); _activePopup = null; }

    let cellValue = _csvDataInstance[rowIndex][columnName];
    if (colDef.type === 'multi-select' && !Array.isArray(cellValue)) {
        if (typeof cellValue === 'string' && cellValue.trim() !== '') {
            cellValue = cellValue.split(',').map(s => s.trim()).filter(s => s);
        } else { cellValue = []; }
        _csvDataInstance[rowIndex][columnName] = cellValue;
    }

    td.innerHTML = '';

    let inputElement;
    if (colDef.type === 'checkbox') {
        const isCurrentlyTrue = isTruthy(cellValue, _viewerConfigInstance || { generalSettings: {} });
        const trueVal = _editorConfigInstance.csvOutputOptions?.booleanTrueValue || "TRUE";
        const falseVal = _editorConfigInstance.csvOutputOptions?.booleanFalseValue || "FALSE";
        _csvDataInstance[rowIndex][columnName] = isCurrentlyTrue ? falseVal : trueVal;
        td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef);
        validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);
        console.log(`Checkbox Toggled: Row ${rowIndex}, Col "${columnName}" = "${_csvDataInstance[rowIndex][columnName]}"`);
        window.dispatchEvent(new CustomEvent('editorDataChanged'));
        return;
    } else if (colDef.type === 'select' || colDef.type === 'multi-select') {
        createSelectPopup(td, cellValue, colDef, rowIndex, columnName);
        return;
    }

    switch (colDef.type) {
        case 'textarea':
            inputElement = document.createElement('textarea');
            inputElement.value = String(cellValue ?? '');
            break;
        case 'date':
            inputElement = document.createElement('input'); inputElement.type = 'date';
            try {
                if (cellValue && !isNaN(new Date(cellValue))) inputElement.value = new Date(cellValue).toISOString().split('T')[0];
                else inputElement.value = cellValue ?? '';
            } catch (e) { inputElement.value = cellValue ?? ''; }
            break;
        case 'number':
            inputElement = document.createElement('input'); inputElement.type = 'number';
            inputElement.value = cellValue ?? '';
            break;
        default: // text, url
            inputElement = document.createElement('input');
            inputElement.type = colDef.type === 'url' ? 'url' : 'text';
            inputElement.value = String(cellValue ?? '');
            break;
    }

    inputElement.dataset.rowIndex = rowIndex; inputElement.dataset.columnName = columnName;
    const finishEdit = (saveChange = true) => {
        if (saveChange) {
            handleCellChange({target: inputElement});
        }
        const currentValInModel = _csvDataInstance[rowIndex][columnName];
        td.innerHTML = getStyledCellDisplay(currentValInModel, colDef);
        validateCell(td, currentValInModel, colDef);
        if (saveChange) window.dispatchEvent(new CustomEvent('editorDataChanged'));
    };
    inputElement.addEventListener('blur', () => finishEdit(true));
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); inputElement.blur(); }
        else if (e.key === 'Escape') { finishEdit(false); } // Revert to original model value
    });

    td.appendChild(inputElement);
    if (typeof inputElement.focus === 'function') {
        inputElement.focus();
        if (inputElement.select) inputElement.select();
    }
}

function handleCellChange(event) {
    const inputElement = event.target;
    const rowIndex = parseInt(inputElement.dataset.rowIndex, 10);
    const columnName = inputElement.dataset.columnName;

    let newValue;
    if (inputElement.type === 'number') {
        newValue = inputElement.value === '' ? '' : parseFloat(inputElement.value);
        if (isNaN(newValue) && inputElement.value !== '') newValue = inputElement.value;
    } else {
        newValue = inputElement.value;
    }

    if (_csvDataInstance && _csvDataInstance[rowIndex] !== undefined && columnName !== undefined) {
        if (_csvDataInstance[rowIndex][columnName] !== newValue) {
            _csvDataInstance[rowIndex][columnName] = newValue;
            console.log(`Data updated: Row ${rowIndex}, Col "${columnName}" =`, newValue);
        }
    } else {
        console.error("Error updating cell: Invalid rowIndex, columnName, or data reference.");
    }
}

function getOptionsForColumn(colDef) {
    const optionsMap = new Map();
    const addOption = (value, label) => {
        const valStr = String(value ?? '');
        if (valStr.trim() === '' && value !== '') return;
        const mapLabel = (label === '' && valStr !== '') ? `(Value: ${valStr})` : (label || valStr); // Use value if label empty
        if (!optionsMap.has(valStr)) {
            optionsMap.set(valStr, mapLabel);
        } else if (label && label !== mapLabel && optionsMap.get(valStr) === valStr) {
            optionsMap.set(valStr, label);
        }
    };
    if (Array.isArray(colDef.options) && colDef.options.length > 0) {
        colDef.options.forEach(opt => {
            if (typeof opt === 'string') addOption(opt, opt);
            else if (opt && typeof opt.value !== 'undefined') addOption(opt.value, opt.label || opt.value);
        });
    }
    if (colDef.optionsSource === 'viewerConfigValueMap' && _viewerConfigInstance?.indicatorStyles) {
        const styleColName = colDef.viewerStyleColumnName || colDef.name;
        const styleConf = _viewerConfigInstance.indicatorStyles[styleColName];
        const valueMap = styleConf?.valueMap;
        if (valueMap) {
            Object.keys(valueMap).filter(key => key !== 'default')
                .forEach(key => addOption(key, valueMap[key].text || key));
        }
    }
    if (_csvDataInstance && Array.isArray(_csvDataInstance)) {
        _csvDataInstance.forEach(row => {
            const cellData = row[colDef.name];
            if (cellData !== undefined && cellData !== null) {
                if (Array.isArray(cellData)) {
                    cellData.forEach(item => addOption(String(item), String(item)));
                } else {
                     const valStr = String(cellData);
                     if (valStr.trim() !== '' || valStr === '') addOption(valStr, valStr);
                }
            }
        });
    }
    const finalOptions = [];
    optionsMap.forEach((label, value) => {
        const displayLabel = label.startsWith('(Value:') ? value : label;
        finalOptions.push({ value, label: displayLabel });
    });
    finalOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
    if (colDef.type === 'select' && !colDef.required) {
        const hasExplicitBlank = finalOptions.some(opt => opt.value === '');
        if (!hasExplicitBlank) {
            finalOptions.unshift({ value: '', label: '(No Selection)' });
        } else {
            const blankOption = finalOptions.find(opt => opt.value === '');
            if (blankOption && (blankOption.label === '' || blankOption.label.startsWith('(Value:'))) {
                blankOption.label = '(No Selection)';
            }
        }
    }
    return finalOptions;
}

function createSelectPopup(td, currentValueForPopup, colDef, rowIndex, columnName) {
    if (_activePopup) _activePopup.remove();
    const popup = document.createElement('div');
    _activePopup = popup; _activePopup.td = td; // Store reference to cell
    popup.className = 'custom-select-popup';
    const rect = td.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.minWidth = `${Math.max(td.offsetWidth, 200)}px`;
    popup.style.zIndex = '1000';

    let allOptions = getOptionsForColumn(colDef);
    const useSearch = allOptions.length >= 15 || (colDef.type === 'multi-select' && colDef.allowNewTags);

    // Initialize currentSelectionsArray as a *copy* for manipulation within the popup
    let currentSelectionsArray = [];
    if (colDef.type === 'multi-select') {
        currentSelectionsArray = Array.isArray(currentValueForPopup) ? [...currentValueForPopup.map(String)] : [];
    } else { // single select
        currentSelectionsArray = currentValueForPopup !== undefined && currentValueForPopup !== null ? [String(currentValueForPopup)] : [''];
    }

    const searchInput = document.createElement('input');
    if (useSearch) {
        searchInput.type = 'search';
        searchInput.placeholder = colDef.type === 'multi-select' && colDef.allowNewTags ? 'Search or Add New & Enter...' : 'Search options...';
        searchInput.className = 'popup-search-input';
        popup.appendChild(searchInput);
    }

    const optionsList = document.createElement('ul');
    optionsList.className = 'popup-options-list';
    popup.appendChild(optionsList);

    // This function is called by 'select' type options OR by the 'Apply' button for 'multi-select'
    window._editorUpdateAndCloseFromPopup = (valueToSet) => {
        _csvDataInstance[rowIndex][columnName] = valueToSet; // Update the main data model
        td.innerHTML = getStyledCellDisplay(valueToSet, colDef);
        validateCell(td, valueToSet, colDef);
        if (_activePopup === popup) { popup.remove(); _activePopup = null; }
        window.dispatchEvent(new CustomEvent('editorDataChanged'));
    };

    const rerenderOptionsList = () => {
        const searchTerm = useSearch ? searchInput.value : '';
        // Pass currentSelectionsArray so renderPopupOptions knows what should be checked
        filterPopupOptions(optionsList, searchTerm, allOptions, currentSelectionsArray, colDef);
    };

    if (useSearch) {
        searchInput.addEventListener('input', rerenderOptionsList);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (colDef.type === 'multi-select' && colDef.allowNewTags && searchInput.value.trim() !== '') {
                    const newTag = searchInput.value.trim();
                    // Add to currentSelectionsArray (the popup's working list)
                    if (!currentSelectionsArray.includes(newTag)) {
                        currentSelectionsArray.push(newTag);
                    }
                    // Add to allOptions (the source list for the popup) if new
                    if (!allOptions.some(opt => opt.value === newTag)) {
                        allOptions.push({ value: newTag, label: newTag });
                        allOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
                    }
                    searchInput.value = ''; // Clear input
                    rerenderOptionsList(); // Re-render, new tag will be checked
                } else if (colDef.type === 'select') {
                    const firstVisibleOption = optionsList.querySelector('li:not([data-filtered-out="true"])');
                    if (firstVisibleOption) firstVisibleOption.click(); // This will call _editorUpdateAndCloseFromPopup
                }
            } else if (e.key === 'Escape') {
                if (_activePopup === popup) { popup.remove(); _activePopup = null; }
                td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef); // Revert to original model value
                validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);
            }
        });
    }

    rerenderOptionsList(); // Initial render

    if (colDef.type === 'multi-select') {
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply Selections';
        applyBtn.className = 'popup-apply-btn';
        applyBtn.addEventListener('click', () => {
            // On Apply, currentSelectionsArray has all chosen tags (pre-existing + newly added + checked from list)
            // Update the main data model with this complete list.
            window._editorUpdateAndCloseFromPopup([...currentSelectionsArray]); // Pass a copy
        });
        popup.appendChild(applyBtn);
    }

    document.body.appendChild(popup);
    if (useSearch && searchInput) searchInput.focus();
    else if (optionsList.firstChild) optionsList.firstChild.focus();

    setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
}

function renderPopupOptions(listElement, optionsToDisplay, currentSelectedValuesArrayArg, colDef) { // Renamed arg for clarity
    listElement.innerHTML = '';
    const isMulti = colDef.type === 'multi-select';
    // Use the passed argument directly for managing the set of selected values for this render pass
    const currentValuesSet = new Set(currentSelectedValuesArrayArg.map(String));

    if (optionsToDisplay.length === 0 ) {
        const li = document.createElement('li');
        li.textContent = (isMulti && colDef.allowNewTags) ? "Type to add new or filter existing." : "No options match search.";
        li.style.fontStyle = "italic"; li.style.color = "#777";
        listElement.appendChild(li); return;
    }

    optionsToDisplay.forEach(opt => {
        const li = document.createElement('li'); li.tabIndex = 0;
        if (isMulti) {
            const cb = document.createElement('input'); cb.type = 'checkbox';
            cb.value = opt.value;
            const uniqueId = `popup-opt-${colDef.name.replace(/\W/g, '_')}-${opt.value.replace(/\W/g, '_')}-${Math.random().toString(16).slice(2)}`;
            cb.id = uniqueId;
            if (currentValuesSet.has(String(opt.value))) cb.checked = true;

            // --- THIS IS THE CORRECTED EVENT LISTENER ---
            cb.addEventListener('change', () => {
                const valStr = String(opt.value);
                // IMPORTANT: Modify currentSelectedValuesArrayArg (the one passed in)
                // This array is the one managed by createSelectPopup's scope
                if (cb.checked) {
                    if (!currentSelectedValuesArrayArg.includes(valStr)) { // Check against the array itself
                        currentSelectedValuesArrayArg.push(valStr);
                    }
                } else {
                    const index = currentSelectedValuesArrayArg.indexOf(valStr);
                    if (index > -1) {
                        currentSelectedValuesArrayArg.splice(index, 1);
                    }
                }
                // No need to update currentValuesSet here as it's rebuilt on next renderPopupOptions if filtering occurs
                // The main thing is currentSelectedValuesArrayArg is correct for the "Apply" button
                console.log("Popup selections changed:", currentSelectedValuesArrayArg);
            });
            // --- END CORRECTION ---

            const label = document.createElement('label'); label.htmlFor = cb.id;
            label.appendChild(cb); label.appendChild(document.createTextNode(opt.label));
            li.appendChild(label);
            li.addEventListener('click', (e) => { if (e.target !== cb && e.target !== label) cb.click(); });
            li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cb.click(); }});
        } else { // 'select'
            li.textContent = opt.label; li.dataset.value = opt.value;
            if (currentValuesSet.has(String(opt.value))) li.classList.add('selected');
            const selectAndClose = () => {
                window._editorUpdateAndCloseFromPopup(opt.value, parseInt(_activePopup.td.dataset.rowIndex), _activePopup.td.dataset.columnName, colDef);
            };
            li.addEventListener('click', selectAndClose);
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAndClose(); }});
        }
        listElement.appendChild(li);
    });
}

function filterPopupOptions(listElement, searchTerm, allOptions, currentSelectionsArray, colDef) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filteredOptions = allOptions.filter(opt => opt.label.toLowerCase().includes(lowerSearchTerm));
    renderPopupOptions(listElement, filteredOptions, currentSelectionsArray, colDef);
}

function handleClickOutsidePopup(event) {
    if (_activePopup && !_activePopup.contains(event.target)) {
        const td = _activePopup.td;
        const isTargetCellOrChild = td.contains(event.target) || td === event.target;

        if (!isTargetCellOrChild) {
            const rowIndex = parseInt(td.dataset.rowIndex);
            const columnName = td.dataset.columnName;
            const colDef = _editorConfigInstance.columns.find(c => c.name === columnName);
            
            // For multi-select, if "Apply" wasn't clicked, changes made within the popup
            // (to currentSelectionsArray) are discarded, revert to original model value.
            // For single-select, any click on an option closes it, so this only catches clicks truly outside.
            td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef);
            validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);

            _activePopup.remove();
            _activePopup = null;
            document.removeEventListener('click', handleClickOutsidePopup, { capture: true });
        } else {
             if (_activePopup) {
                document.removeEventListener('click', handleClickOutsidePopup, { capture: true });
                setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
             }
        }
    } else if (_activePopup) {
        document.removeEventListener('click', handleClickOutsidePopup, { capture: true });
        setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
    }
}

function addNewRow() {
    if (!_editorConfigInstance || !_editorConfigInstance.columns) {
        console.error("Cannot add new row: Editor config not loaded or has no columns."); return false;
    }
    if (!_csvDataInstance) {
        console.error("Cannot add new row: Data reference not initialized."); return false;
    }
    const newRow = {};
    _editorConfigInstance.columns.forEach(colDef => {
        if (colDef.type === 'checkbox') newRow[colDef.name] = _editorConfigInstance.csvOutputOptions?.booleanFalseValue || "FALSE";
        else if (colDef.type === 'multi-select') newRow[colDef.name] = [];
        else newRow[colDef.name] = '';
    });
    _csvDataInstance.push(newRow);
    renderGridData();
    const { editorGridTbody } = editorDomElements;
    if (editorGridTbody && editorGridTbody.lastChild) {
        editorGridTbody.lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const firstEditableCell = editorGridTbody.lastChild.querySelector('td:not(.cell-readonly)');
        if (firstEditableCell) {
            handleCellClickToEdit({ target: firstEditableCell });
        }
    }
    window.dispatchEvent(new CustomEvent('editorDataChanged'));
    return true;
}

function handleDeleteRowClick(event) {
    const buttonElement = event.target;
    const rowIndex = parseInt(buttonElement.dataset.rowIndex, 10);
    if (confirm(`Are you sure you want to delete row ${rowIndex + 1}?`)) {
        if (_csvDataInstance && rowIndex >= 0 && rowIndex < _csvDataInstance.length) {
            _csvDataInstance.splice(rowIndex, 1);
            console.log(`Row ${rowIndex} deleted.`);
            renderGridData();
            window.dispatchEvent(new CustomEvent('editorDataChanged'));
        }
    }
}
// --- END OF FILE js/editor_data_grid.js ---
// editor_app.js
document.addEventListener('DOMContentLoaded', async () => {
    console.log("EDITOR_APP: DOMContentLoaded - Initializing...");

    // --- State Variables ---
    let viewerConfigLocal = null;
    let editorConfigLocal = null;
    let csvDataMain = [];
    let csvHeadersFromUpload = [];

    // --- DOM Elements ---
    const {
        viewerConfigFileInput, editorConfigFileInput, csvDataFileInput,
        addRowBtn, sortDataBtn, exportCsvBtn, statusMessages
    } = editorDomElements;
    const mainPageHeading = document.querySelector('#csv-editor-wrapper h1');

    // --- Helper Function Definitions ---
    function updateEditorTitles(viewerConfig) {
        const baseTitle = viewerConfig?.generalSettings?.dashboardTitle || "CSV Data";
        const editorPageTitle = `${baseTitle} - Editor`;
        document.title = editorPageTitle;
        if (mainPageHeading) {
            mainPageHeading.textContent = editorPageTitle;
        } else {
            const firstH1 = document.querySelector('h1');
            if (firstH1) firstH1.textContent = editorPageTitle;
        }
        console.log(`EDITOR_APP: Titles updated to "${editorPageTitle}"`);
    }

    function resetEditorTitles() {
        const defaultEditorTitle = "Config-Driven CSV Editor";
        document.title = defaultEditorTitle;
        if (mainPageHeading) {
            mainPageHeading.textContent = defaultEditorTitle;
        } else {
            const firstH1 = document.querySelector('h1');
            if (firstH1) firstH1.textContent = defaultEditorTitle;
        }
        console.log(`EDITOR_APP: Titles reset to "${defaultEditorTitle}"`);
    }

    function updateEditorStatus(message, isError = false) {
        if (isError) {
            console.error(`EDITOR_APP_STATUS (Error): ${message}`);
        } else {
            console.log(`EDITOR_APP_STATUS: ${message}`);
        }
        if (statusMessages) {
            statusMessages.textContent = `Status: ${message}`;
            statusMessages.style.color = isError ? 'red' : '#495057';
        }
    }

    function checkAndEnableActions() {
        const editorCfg = getEditorConfig();
        const viewerCfg = getViewerConfig();
        const canAddRow = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0);
        const canExport = !!(editorCfg && editorCfg.columns && editorCfg.columns.length > 0 && (csvDataMain.length > 0 || (editorCfg.columns && editorCfg.columns.length > 0)));
        const canSort = !!(csvDataMain.length > 0 && viewerCfg?.generalSettings?.defaultItemSortBy?.length > 0 && editorCfg?.columns?.length > 0);

        if (addRowBtn) addRowBtn.disabled = !canAddRow;
        if (sortDataBtn) sortDataBtn.disabled = !canSort;
        if (exportCsvBtn) exportCsvBtn.disabled = !canExport;
    }

    async function loadFileFromUrl(url, type, expectedGlobalVarName = null) {
        console.log(`EDITOR_APP: loadFileFromUrl - Attempting to fetch ${type} from URL: ${url}`);
        if (!url) {
            console.warn(`EDITOR_APP: loadFileFromUrl - No URL provided for ${type}.`);
            return null;
        }
        updateEditorStatus(`Fetching ${type} from URL: ${url.substring(url.lastIndexOf('/') + 1)}...`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorMsg = `HTTP error ${response.status} fetching ${url}. Manual input for ${type} remains available.`;
                updateEditorStatus(errorMsg, true);
                return null;
            }
            const content = await response.text();
            console.log(`EDITOR_APP: loadFileFromUrl - Successfully fetched content for ${type} from ${url}. Length: ${content.length}`);
            if (type === 'ViewerConfig' || type === 'EditorConfig') {
                const pseudoFileName = url.substring(url.lastIndexOf('/') + 1) || `${type.toLowerCase()}_from_url.js`;
                const pseudoFile = new File([content], pseudoFileName, { type: 'application/javascript' });
                return await loadJsConfigurationFile(pseudoFile, expectedGlobalVarName);
            } else if (type === 'CSVData') {
                return content;
            }
        } catch (error) {
            updateEditorStatus(`Error loading ${type} from ${url}: ${error.message}. Manual input for ${type} remains available.`, true);
            return null;
        }
    }
    
    function confirmAndClearOnManualOverride(configTypeChanging) {
        let message = "";
        let shouldPrompt = false;
        if (configTypeChanging === "ViewerConfig" && getViewerConfig()) {
            message = "Manually loading a new Viewer Config will reprocess data with new display settings. Current data will be kept. Proceed?";
            shouldPrompt = true;
        }
        if (shouldPrompt) {
            if (!confirm(message)) { return false; }
        }
        if (configTypeChanging === "ViewerConfig") {
             setViewerConfig(null);
             viewerConfigLocal = null;
        }
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());
        return true;
    }
    
    function clearAllApplicationState() {
        console.log("EDITOR_APP: clearAllApplicationState called for full reset.");
        csvDataMain.length = 0;
        csvHeadersFromUpload = [];
        clearAllConfigs(); 
        viewerConfigLocal = null;
        editorConfigLocal = null;
        initDataGridReferences(csvDataMain, null, null); 
        clearGridStructure();
        resetEditorTitles();
        updateEditorStatus("Editor reset. Load new configurations.");
        if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        if(editorConfigFileInput) {
            editorConfigFileInput.parentElement.style.display = '';
            editorConfigFileInput.disabled = false;
            editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
        }
        if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
    }

    function handleConfigLoadError(configType, error) {
        updateEditorStatus(`Error loading ${configType}: ${error.message}`, true);
        if (configType.includes("Viewer Config")) { setViewerConfig(null); viewerConfigLocal = null; resetEditorTitles(); }
        if (configType.includes("Editor Config")) { setEditorConfig(null); editorConfigLocal = null; clearGridStructure(); }
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());
    }
    
    function finalizeConfigAndDataLoad() {
        console.log("EDITOR_APP: finalizeConfigAndDataLoad called. Current csvDataMain length:", csvDataMain.length);
        const edCfg = getEditorConfig();
        const viewerCfg = getViewerConfig();

        if (viewerCfg) { // Update titles if viewer config is available
            updateEditorTitles(viewerCfg);
        } else {
            resetEditorTitles();
        }

        if (edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Editor config present, rendering grid structure.");
            renderGridStructure(edCfg.columns);
        } else {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - No editor config, clearing grid structure.");
            clearGridStructure();
            if (editorConfigFileInput && editorConfigFileInput.parentElement.style.display !== 'none') {
                 editorConfigFileInput.disabled = false;
                 editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
            }
        }

        if (csvDataMain.length > 0 && edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Data and editor config present. Aligning, (potentially) sorting, rendering data.");
            alignDataToEditorSchema();
            if (viewerCfg) { applyDefaultSortIfNeeded(); }
            renderGridData();
        } else if (edCfg) {
            console.log("EDITOR_APP: finalizeConfigAndDataLoad - Editor config present, but no data. Rendering empty grid/message.");
            renderGridData();
        }
        checkAndEnableActions();
    }

    function processCsvTextOnly(csvText, sourceDescription = "CSV") {
        console.log(`EDITOR_APP: processCsvTextOnly - Processing CSV from ${sourceDescription}`);
        const currentEdConfig = getEditorConfig();
        if (!currentEdConfig) {
            updateEditorStatus("Cannot process CSV: Editor config not loaded.", true); return false;
        }
        const delimiter = currentEdConfig?.csvOutputOptions?.delimiter || ',';
        const parsed = editorParseCSV(csvText, delimiter);
        
        csvDataMain.length = 0;
        parsed.data.forEach(row => csvDataMain.push(row));
        csvHeadersFromUpload = parsed.headers;
        console.log(`EDITOR_APP: processCsvTextOnly - Parsed ${csvDataMain.length} rows.`);
        
        alignDataToEditorSchema();
        updateEditorStatus(`CSV Data from ${sourceDescription} processed and ready: ${csvDataMain.length} rows.`);
        return true;
    }

    function clearCsvData() {
        console.log("EDITOR_APP: clearCsvData called.");
        csvDataMain.length = 0;
        csvHeadersFromUpload = [];
    }

    function applyDefaultSortIfNeeded() {
        console.log("EDITOR_APP: applyDefaultSortIfNeeded - Checking if sort is needed.");
        const viewerCfg = getViewerConfig();
        const editorCfg = getEditorConfig();
        if (csvDataMain.length > 0 &&
            viewerCfg?.generalSettings?.defaultItemSortBy?.length > 0 &&
            editorCfg?.columns?.length > 0) {
            console.log("EDITOR_APP: applyDefaultSortIfNeeded - Applying default sort criteria...");
            try {
                const effectiveHeadersForSorting = editorCfg.columns.map(c => c.name);
                const sortGlobalConfigMock = {
                    csvHeaders: effectiveHeadersForSorting,
                    generalSettings: { trueValues: viewerCfg.generalSettings.trueValues || [] }
                };
                sortData(csvDataMain, viewerCfg.generalSettings.defaultItemSortBy, sortGlobalConfigMock);
            } catch (error) {
                updateEditorStatus(`Error applying default sort: ${error.message}`, true);
            }
        } else {
            console.log("EDITOR_APP: applyDefaultSortIfNeeded - Conditions for sort not met or no sort defined.");
        }
    }

    function alignDataToEditorSchema() {
        console.log("EDITOR_APP: alignDataToEditorSchema - Aligning data.");
        const currentEdConfig = getEditorConfig();
        if (!currentEdConfig || !currentEdConfig.columns) {
            console.warn("EDITOR_APP: alignDataToEditorSchema - Editor config or columns not available.");
            return;
        }
        const editorColumnDefinitions = currentEdConfig.columns;
        const tempAlignedData = [];
        csvDataMain.forEach(rawRow => {
            const alignedRow = {};
            editorColumnDefinitions.forEach(colDef => {
                let val = rawRow.hasOwnProperty(colDef.name) ? rawRow[colDef.name] : '';
                if (colDef && colDef.type === 'multi-select') {
                    if (typeof val === 'string') {
                        val = val.split(',').map(s => s.trim()).filter(s => s);
                    } else if (!Array.isArray(val)) { val = []; }
                }
                alignedRow[colDef.name] = val;
            });
            tempAlignedData.push(alignedRow);
        });
        csvDataMain.length = 0;
        tempAlignedData.forEach(row => csvDataMain.push(row));
        console.log("EDITOR_APP: alignDataToEditorSchema - CSV data aligned.");
    }

    async function attemptPreloadsFromEditorConfig(loadedEditorConfig) {
        console.log("EDITOR_APP: attemptPreloadsFromEditorConfig - Starting. EditorConfig:", loadedEditorConfig);
        if (!loadedEditorConfig || !loadedEditorConfig.preloadUrls) {
            updateEditorStatus("No preloadUrls in editor config. Manual inputs active.", false);
            if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
            if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
            return;
        }
        const { viewerConfigUrl, csvDataUrl } = loadedEditorConfig.preloadUrls;

        if (viewerConfigUrl) {
            const config = await loadFileFromUrl(viewerConfigUrl, 'ViewerConfig', 'defaultConfig');
            if (config) {
                try {
                    setViewerConfig(config); viewerConfigLocal = getViewerConfig();
                    updateEditorStatus(`Viewer Config preloaded from: ${viewerConfigUrl.substring(viewerConfigUrl.lastIndexOf('/')+1)}`);
                    if (viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = 'none';
                } catch (e) { handleConfigLoadError('Viewer Config from URL', e); if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';}
            } else { if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';}
        } else {
            updateEditorStatus("No Viewer Config URL for preload. Manual input active.", false);
            if(viewerConfigFileInput) viewerConfigFileInput.parentElement.style.display = '';
        }
        // Update grid module's reference to editorConfigLocal and newly loaded viewerConfigLocal
        initDataGridReferences(csvDataMain, getEditorConfig(), getViewerConfig());

        if (csvDataUrl) {
            const edCfg = getEditorConfig();
            const viewerCfg = getViewerConfig();
            if (edCfg) {
                const csvText = await loadFileFromUrl(csvDataUrl, 'CSVData');
                if (csvText !== null) {
                    try {
                        clearCsvData();
                        if(processCsvTextOnly(csvText, `URL (${csvDataUrl.substring(csvDataUrl.lastIndexOf('/')+1)})`)){
                            if (csvDataFileInput) csvDataFileInput.parentElement.style.display = 'none';
                            if (!viewerCfg) {
                                 updateEditorStatus("CSV Data preloaded. Viewer Config (for full display/sort) may need manual load or working URL.", true);
                            }
                        } else { throw new Error("CSV text processing failed during preload."); }
                    } catch (e) { updateEditorStatus(`Error processing preloaded CSV: ${e.message}`, true); clearCsvData(); if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';}
                } else { if(csvDataFileInput) csvDataFileInput.parentElement.style.display = ''; }
            } else {
                updateEditorStatus(`CSV Data URL found, but Editor Config not ready. Load CSV manually.`, true);
                if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
            }
        } else {
            updateEditorStatus("No CSV Data URL in editor_config. Load CSV manually.", false);
            if(csvDataFileInput) csvDataFileInput.parentElement.style.display = '';
        }
        console.log("EDITOR_APP: attemptPreloadsFromEditorConfig - Finished.");
    }

    // --- Initial Load Logic ---
    async function initializeEditor() {
        console.log("EDITOR_APP: initializeEditor - Starting.");
        updateEditorStatus("Initializing editor...");
        resetEditorTitles(); // Set default titles initially

        if (typeof window.editorConfig === 'object' && window.editorConfig !== null) {
            console.log("EDITOR_APP: initializeEditor - Found pre-loaded window.editorConfig.");
            updateEditorStatus("Loading initial Editor Config embedded in page...");
            try {
                const initialEditorConf = JSON.parse(JSON.stringify(window.editorConfig));
                setEditorConfig(initialEditorConf);
                editorConfigLocal = getEditorConfig();
                initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal);
                updateEditorStatus(`Initial Editor Config "${editorConfigLocal.editorSchemaVersion || 'N/A'}" loaded.`);
                if (editorConfigFileInput) editorConfigFileInput.parentElement.style.display = 'none';
                await attemptPreloadsFromEditorConfig(editorConfigLocal);
                // Titles are updated within attemptPreloads (if viewer config loads) or by finalizeConfigAndDataLoad
            } catch (e) {
                handleConfigLoadError('Initial Editor Config (embedded)', e);
                resetEditorTitles(); // Reset title on error
                if (editorConfigFileInput) {
                     editorConfigFileInput.parentElement.style.display = '';
                     editorConfigFileInput.disabled = false;
                     editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
                }
            }
        } else {
            updateEditorStatus("Load Editor Configuration file to begin (or ensure it's embedded and defines window.editorConfig).");
            resetEditorTitles(); // Ensure default title if no preloaded editor config
            if (editorConfigFileInput) {
                editorConfigFileInput.parentElement.style.display = '';
                editorConfigFileInput.disabled = false;
                editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
            }
        }
        console.log("EDITOR_APP: initializeEditor - Calling finalizeConfigAndDataLoad after initial setup.");
        finalizeConfigAndDataLoad();
        console.log("EDITOR_APP: initializeEditor - Finished.");
    }

    // --- Initialize App State & Call Startup Function ---
    initDataGridReferences(csvDataMain, editorConfigLocal, viewerConfigLocal); // Initial call
    await initializeEditor(); // Start the initialization process

    // --- Event Listeners (Defined after helpers) ---
    window.addEventListener('editorDataChanged', () => {
        console.log("EDITOR_APP: 'editorDataChanged' event received.");
        checkAndEnableActions();
    });

    if (viewerConfigFileInput) {
        viewerConfigFileInput.addEventListener('change', async (event) => {
            console.log("EDITOR_APP: viewerConfigFileInput - Manual 'change' event.");
            const file = event.target.files[0];
            if (!file) return;
            if (confirmAndClearOnManualOverride("Viewer Config")) {
                updateEditorStatus(`Loading Viewer Config from file: ${file.name}...`);
                try {
                    const loadedConfig = await loadJsConfigurationFile(file, 'defaultConfig');
                    setViewerConfig(loadedConfig);
                    viewerConfigLocal = getViewerConfig();
                    initDataGridReferences(csvDataMain, getEditorConfig(), viewerConfigLocal); // Use getEditorConfig()
                    updateEditorTitles(viewerConfigLocal);
                    updateEditorStatus(`Viewer Config "${file.name}" loaded manually.`);
                    finalizeConfigAndDataLoad();
                } catch (error) { handleConfigLoadError('Viewer Config (manual)', error); resetEditorTitles(); }
            } else { event.target.value = ''; }
            checkAndEnableActions();
        });
    }

    if (editorConfigFileInput) {
        editorConfigFileInput.addEventListener('change', async (event) => {
            console.log("EDITOR_APP: editorConfigFileInput - Manual 'change' event (override).");
            const file = event.target.files[0];
            if (!file) return;
            if (!confirm("Manually loading a new Editor Configuration will reset the editor and discard ALL current data and configurations. Proceed?")) {
                event.target.value = ''; return;
            }
            clearAllApplicationState(); // This also calls resetEditorTitles()
            updateEditorStatus(`Loading OVERRIDE Editor Config from file: ${file.name}...`);
            try {
                const loadedConfig = await loadJsConfigurationFile(file, 'editorConfig');
                setEditorConfig(loadedConfig);
                editorConfigLocal = getEditorConfig();
                initDataGridReferences(csvDataMain, editorConfigLocal, getViewerConfig()); // Use getViewerConfig()
                updateEditorStatus(`Editor Config "${file.name}" loaded manually (OVERRIDE).`);
                if (editorConfigFileInput) editorConfigFileInput.parentElement.style.display = 'none';
                await attemptPreloadsFromEditorConfig(editorConfigLocal);
                finalizeConfigAndDataLoad();
            } catch (error) {
                handleConfigLoadError('Editor Config (manual override)', error);
                if (editorConfigFileInput) {
                    editorConfigFileInput.parentElement.style.display = '';
                    editorConfigFileInput.disabled = false;
                    editorConfigFileInput.previousElementSibling.textContent = "Load Editor Config (editor_config.js):";
                }
            }
            checkAndEnableActions();
        });
    }

    if (csvDataFileInput) {
        csvDataFileInput.addEventListener('change', async (event) => {
            console.log("EDITOR_APP: csvDataFileInput - Manual 'change' event.");
            const file = event.target.files[0];
            if (!file) return;
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Load Editor Config before CSV data.", true);
                event.target.value = ''; return;
            }
            if (csvDataMain.length > 0 && !confirm("Loading a new CSV file will replace current data. Proceed?")) {
                event.target.value = ''; return;
            }
            updateEditorStatus(`Loading CSV Data from file: ${file.name}...`);
            try {
                const csvText = await readFileContent(file);
                clearCsvData();
                if (processCsvTextOnly(csvText, `"${file.name}" (manual)`)) {
                    finalizeConfigAndDataLoad();
                } else { renderGridData(); }
            } catch (error) {
                updateEditorStatus(`Error loading CSV Data from file: ${error.message}`, true);
                clearCsvData(); renderGridData();
            }
            checkAndEnableActions();
        });
    }
    
    // --- Action Button Handlers ---
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig) {
                updateEditorStatus("Cannot add row: Editor config not loaded.", true); return;
            }
            if (addNewRow()) {
                updateEditorStatus("Row added. Scroll to bottom if not visible.");
            } else { updateEditorStatus("Failed to add row.", true); }
            // checkAndEnableActions(); // Called by 'editorDataChanged' event from addNewRow
        });
    }

    if (sortDataBtn) {
        sortDataBtn.addEventListener('click', () => {
            const viewerCfg = getViewerConfig();
            const editorCfg = getEditorConfig();
            if (!csvDataMain || csvDataMain.length === 0) { updateEditorStatus("No data to sort.", true); return; }
            if (!viewerCfg?.generalSettings?.defaultItemSortBy?.length) { updateEditorStatus("No default sort criteria in Viewer Config.", true); return; }
            if (!editorCfg?.columns?.length) { updateEditorStatus("Editor Config not loaded.", true); return; }
            updateEditorStatus("Sorting data manually...");
            try {
                const effectiveHeaders = editorCfg.columns.map(c => c.name);
                const sortMockCfg = { csvHeaders: effectiveHeaders, generalSettings: { trueValues: viewerCfg.generalSettings.trueValues || [] }};
                sortData(csvDataMain, viewerCfg.generalSettings.defaultItemSortBy, sortMockCfg);
                renderGridData();
                updateEditorStatus("Data sorted.");
            } catch (error) { updateEditorStatus(`Error sorting: ${error.message}`, true); }
        });
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            const currentEdConfig = getEditorConfig();
            if (!currentEdConfig || (!csvDataMain.length && !(currentEdConfig.columns?.length > 0))) { updateEditorStatus("Cannot export: Config or data not loaded.", true); return; }
            const outputOptions = currentEdConfig.csvOutputOptions || {};
            const csvString = generateCsvForExport(csvDataMain, currentEdConfig.columns, outputOptions);
            if (csvString !== null || (csvString === '' && csvDataMain.length === 0)) {
                const filename = `edited_data_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
                triggerDownload(csvString, filename);
                updateEditorStatus(`Data exported to ${filename}.`);
            } else { updateEditorStatus("No data to export or error during CSV generation.", true); }
        });
    }

    console.log("EDITOR_APP: DOMContentLoaded - Editor App Initialized fully.");
});

// --- Global Utilities ---
function triggerDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    if (content === null || content === undefined) {
        console.warn("triggerDownload: No content provided.");
        return;
    }
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + content], { type: mimeType });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        alert("Download not directly supported. Check console for data or try a different browser.");
        console.error("triggerDownload: HTML5 download attribute not supported.");
        console.log("Data for manual copy:\n----------\n", content, "\n----------");
    }
}
// --- END OF FILE js/editor_app.js ---
