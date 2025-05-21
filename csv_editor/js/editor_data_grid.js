
// Module-level state variables for the data grid
let _csvDataInstance = [];        // Reference to the main CSV data array from editor_app.js
let _editorConfigInstance = null; // Reference to the editor configuration
let _viewerConfigInstance = null; // Reference to the viewer configuration
let _activePopup = null;          // Holds the currently active custom select popup element, if any

/**
 * Initializes or updates the local references to shared data and configurations.
 * Called from editor_app.js to synchronize state.
 * @param {Array<Object>} csvDataArrayRef - Reference to the main CSV data array.
 * @param {Object} editorConfigRef - Reference to the editor configuration.
 * @param {Object} viewerConfigRef - Reference to the viewer configuration.
 */
function initDataGridReferences(csvDataArrayRef, editorConfigRef, viewerConfigRef) {
    console.log(`EDITOR_GRID: initDataGridReferences - Assigning _csvDataInstance. Passed array length: ${csvDataArrayRef ? csvDataArrayRef.length : 'undefined'}`);
    _csvDataInstance = csvDataArrayRef;
    _editorConfigInstance = editorConfigRef;
    _viewerConfigInstance = viewerConfigRef;
    console.log("EDITOR_GRID: initDataGridReferences - DataGrid's local references updated.");
}

/**
 * Renders the header row (thead) of the grid based on column definitions.
 * @param {Array<Object>} columnDefinitions - Array of column definition objects from the editor config.
 */
function renderGridStructure(columnDefinitions) {
    const { editorGridThead } = editorDomElements; // Assumes editorDomElements is globally available
    if (!editorGridThead) {
        console.error("EDITOR_GRID: renderGridStructure - Table header (thead) element not found in DOM.");
        return;
    }
    editorGridThead.innerHTML = ''; // Clear existing header

    if (!columnDefinitions || columnDefinitions.length === 0) {
        console.warn("EDITOR_GRID: renderGridStructure - No column definitions provided. Grid header cannot be fully rendered.");
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = "Load Editor Config to define columns.";
        th.colSpan = 10; // Arbitrary colspan
        tr.appendChild(th);
        editorGridThead.appendChild(tr);
        return;
    }

    const tr = document.createElement('tr');
    columnDefinitions.forEach((colDef, index) => {
        const th = document.createElement('th');
        const headerTextSpan = document.createElement('span');
        headerTextSpan.className = 'header-text-content';
        headerTextSpan.textContent = colDef.label || colDef.name;
        th.appendChild(headerTextSpan);
        th.title = `CSV Header: ${colDef.name}`; // Tooltip for original header name

        const orientation = colDef.orientation || 'horizontal'; // Default to horizontal
        th.classList.add(`header-${orientation}`);

        // Apply column width from config or use defaults
        if (colDef.columnWidth) {
            th.style.width = colDef.columnWidth;
        } else {
            th.style.width = (orientation === 'vertical') ? '50px' : '150px';
        }
        if (index === 0) { // Make the first column header sticky
            th.classList.add('sticky-col', 'first-col');
        }
        tr.appendChild(th);
    });

    // Add a header cell for the "Actions" column (e.g., delete button)
    const thActions = document.createElement('th');
    thActions.textContent = "Actions";
    thActions.style.width = "80px"; // Fixed width for actions
    tr.appendChild(thActions);
    editorGridThead.appendChild(tr);
    console.log("EDITOR_GRID: renderGridStructure - Grid structure (headers) rendered.");
}

/**
 * Clears the content (tbody) of the grid and removes any active popups.
 */
function clearGridContent() {
    const { editorGridTbody } = editorDomElements;
    if (editorGridTbody) {
        editorGridTbody.innerHTML = '';
    }
    if (_activePopup) {
        _activePopup.remove();
        _activePopup = null;
    }
    console.log("EDITOR_GRID: clearGridContent - Grid content (tbody) and active popups cleared.");
}

/**
 * Clears the entire grid structure (thead and tbody).
 */
function clearGridStructure() {
    const { editorGridThead } = editorDomElements;
    if (editorGridThead) {
        editorGridThead.innerHTML = '';
    }
    clearGridContent(); // Also clears tbody and popups
    console.log("EDITOR_GRID: clearGridStructure - Entire grid structure (thead and tbody) cleared.");
}

/**
 * Validates a cell's value based on its column definition (required, regex).
 * Applies/removes 'cell-error' class and updates title accordingly.
 * @param {HTMLTableCellElement} td - The table cell element.
 * @param {*} value - The current value of the cell.
 * @param {Object} colDef - The column definition object.
 * @returns {boolean} True if the cell value is valid, false otherwise.
 */
function validateCell(td, value, colDef) {
    let isValid = true;
    td.classList.remove('cell-error');
    const originalTitle = `CSV Header: ${colDef.name}`; // Base title

    // Check for 'required' constraint
    if (colDef.required) {
        let isEmpty = false;
        if (colDef.type === 'multi-select') {
            isEmpty = !Array.isArray(value) || value.length === 0;
        } else {
            isEmpty = value === null || value === undefined || String(value).trim() === '';
            // For 'select', an empty string value is considered empty for requirement check
            if (colDef.type === 'select' && value === '') {
                isEmpty = true;
            }
        }
        if (isEmpty) {
            isValid = false;
            td.title = `${colDef.label || colDef.name} is required.`;
        }
    }

    // Check for 'validationRegex' constraint (if still valid and not an empty string, and not certain types)
    if (isValid && colDef.validationRegex && String(value).trim() !== '' &&
        !['select', 'multi-select', 'checkbox', 'date', 'number'].includes(colDef.type)) {
        try {
            const regex = new RegExp(colDef.validationRegex);
            if (!regex.test(String(value))) {
                isValid = false;
                td.title = `${colDef.label || colDef.name} does not match pattern: ${colDef.validationRegex}. Current: "${value}"`;
            }
        } catch (e) {
            console.warn(`EDITOR_GRID: validateCell - Invalid regex in editor_config for column "${colDef.name}": ${colDef.validationRegex}`, e);
            // If regex is invalid, don't fail validation based on it, but log the warning.
        }
    }

    if (!isValid) {
        td.classList.add('cell-error');
    } else {
        // If valid, ensure title is reset if it was previously an error message.
        if (td.title.startsWith(colDef.label || colDef.name) && (td.title.includes("is required") || td.title.includes("does not match pattern"))) {
            td.title = originalTitle;
        } else if (!td.title && colDef.name) { // Set base title if none exists
            td.title = originalTitle;
        }
    }
    return isValid;
}

/**
 * Gets the styled HTML display for a cell value based on viewer configuration and column definition.
 * Handles icons, tags, links, and multi-select displays.
 * @param {*} cellValue - The value of the cell.
 * @param {Object} colDef - The column definition object.
 * @returns {string} HTML string for the cell's content.
 */
function getStyledCellDisplay(cellValue, colDef) {
    const viewerStyleColName = colDef.viewerStyleColumnName || colDef.name;
    const viewerCfg = _viewerConfigInstance || { generalSettings: {}, indicatorStyles: {} }; // Safe default
    const indicatorStyleConf = viewerCfg.indicatorStyles?.[viewerStyleColName];
    const isLinkColInViewer = viewerCfg.generalSettings?.linkColumns?.includes(colDef.name);

    // Handle viewer-defined indicator styles (icon or tag)
    if (indicatorStyleConf) {
        if (indicatorStyleConf.type === 'icon') {
            let iconToShow = '';
            if (indicatorStyleConf.trueCondition && isTruthy(cellValue, viewerCfg)) { // isTruthy is an assumed external utility
                iconToShow = indicatorStyleConf.trueCondition.value || '';
            } else if (indicatorStyleConf.valueMap) {
                const valStr = String(cellValue ?? '');
                const valStrLower = valStr.toLowerCase();
                let mapping = indicatorStyleConf.valueMap[valStr] ?? indicatorStyleConf.valueMap[valStrLower];
                // Fallback logic for valueMap keys (empty string, true/false, default)
                if (mapping === undefined) {
                    if (valStr === '' && indicatorStyleConf.valueMap.hasOwnProperty('')) { mapping = indicatorStyleConf.valueMap['']; }
                    else if (isTruthy(cellValue, viewerCfg) && indicatorStyleConf.valueMap.hasOwnProperty('true')) { mapping = indicatorStyleConf.valueMap['true']; }
                    else if (!isTruthy(cellValue, viewerCfg) && indicatorStyleConf.valueMap.hasOwnProperty('false')) { mapping = indicatorStyleConf.valueMap['false']; }
                }
                if (mapping === undefined) { mapping = indicatorStyleConf.valueMap['default']; } // Final fallback to default
                if (mapping && mapping.value !== undefined) { iconToShow = mapping.value; }
            }
            // For checkboxes, if the icon to show is literally "TRUE" or "FALSE", don't show it, as checkbox handles its visual state.
            if (colDef.type === 'checkbox' && iconToShow === String(cellValue) && (String(cellValue).toUpperCase() === "TRUE" || String(cellValue).toUpperCase() === "FALSE")) {
                return ''; // Checkbox visual state is enough
            }
            return iconToShow ? `<span class="editor-cell-icon" title="${String(cellValue ?? '')}">${iconToShow}</span>` : (colDef.type === 'checkbox' ? '' : String(cellValue ?? ''));
        } else if (indicatorStyleConf.type === 'tag' && typeof formatTag === 'function') { // formatTag is an assumed external utility
            if (colDef.type === 'multi-select' && Array.isArray(cellValue)) {
                if (cellValue.length === 0) return '';
                return cellValue.map(val => formatTag(val, viewerCfg, viewerStyleColName, indicatorStyleConf.titlePrefix) || `<span class="editor-cell-mini-tag">${val}</span>`).join(' ');
            } else {
                const formatted = formatTag(cellValue, viewerCfg, viewerStyleColName, indicatorStyleConf.titlePrefix);
                return formatted || (cellValue === '' ? '' : String(cellValue ?? '')); // Return formatted tag or raw value
            }
        }
    }

    // Handle link columns (if not already handled by a tag style)
    if (isLinkColInViewer && colDef.type !== 'checkbox') {
        const urlValueStr = String(cellValue ?? '');
        if (urlValueStr.trim() !== '') {
            return `<span class="cell-url-display-span" title="${urlValueStr}">🔗${urlValueStr}</span>`; // Show link icon and text
        } else { return ''; }
    }

    // Default display for multi-select (as mini-tags)
    if (colDef.type === 'multi-select' && Array.isArray(cellValue)) {
        if (cellValue.length === 0) return '';
        return cellValue.map(v => `<span class="editor-cell-mini-tag">${String(v ?? '')}</span>`).join(' ');
    }
    // Checkboxes themselves don't render text here; their state is handled by click and CSS.
    if (colDef.type === 'checkbox') { return ''; }
    // Special text for empty single-select
    if (colDef.type === 'select' && cellValue === '') { return '(No Selection)'; }

    // Handle textarea as single line display when not editing ---
    if (colDef.type === 'textarea' && colDef.displayAsSingleLine) {
        // Wrap the text in a span that will be styled for single-line display
        // The span itself will truncate the text with ellipsis via CSS
        return `<span class="editor-single-line-text">${String(cellValue ?? '')}</span>`;
    }

    return String(cellValue ?? ''); // Default: string representation of the value
}

/**
 * Renders the data rows (tbody) of the grid.
 */
function renderGridData() {

    const { editorGridTbody } = editorDomElements;
    if (!editorGridTbody) { console.error("EDITOR_GRID: renderGridData - Table body (tbody) element not found."); return; }
    clearGridContent(); // Clears tbody and any active popup

    if (!_editorConfigInstance || !_editorConfigInstance.columns || _editorConfigInstance.columns.length === 0) {
        console.warn("EDITOR_GRID: renderGridData - No column definitions from editor config. Cannot render data rows.");
        const { editorGridThead } = editorDomElements;
        // If headers are also missing, show a more prominent message in tbody
        if (editorGridThead && editorGridThead.innerHTML === '') {
            const tr = editorGridTbody.insertRow();
            const td = tr.insertCell();
            td.colSpan = 1;
            td.textContent = "Editor configuration not loaded. Please load an editor_config.js file.";
            td.style.textAlign = "center"; td.style.fontStyle = "italic"; td.style.padding = "20px";
        }
        return;
    }
    const columnDefinitions = _editorConfigInstance.columns;

    if (!_csvDataInstance || _csvDataInstance.length === 0) {
        const tr = editorGridTbody.insertRow();
        const td = tr.insertCell();
        td.colSpan = columnDefinitions.length + 1; // +1 for action cell
        td.textContent = "No CSV data loaded. Click '+ Add Row' or load a CSV file.";
        td.style.textAlign = "center"; td.style.fontStyle = "italic"; td.style.padding = "20px";
        return;
    }

    // Logic for drawing a visual separator line if data is partitioned
    const editorCfg = _editorConfigInstance; // Use instance for consistency
    const viewerCfg = _viewerConfigInstance;
    const partitionConfigSettings = editorCfg?.editorDisplaySettings?.partitionBy;
    const isPartitionActive = partitionConfigSettings?.enabled &&
        partitionConfigSettings?.filter?.conditions?.length > 0;
    let previousItemMetPartitionCriteria = null; // Tracks the partition state of the previous row

    _csvDataInstance.forEach((row, rowIndex) => {
        const tr = editorGridTbody.insertRow();
        tr.dataset.rowIndex = rowIndex; // Store row index for event handlers

        // Apply visual separator if partitioning is active and this row marks the transition
        if (isPartitionActive) {
            const effectiveHeadersForSeparatorCheck = editorCfg.columns.map(c => c.name); // Ensure headers are up-to-date
            const configForSeparatorCheck = {
                generalSettings: {
                    trueValues: viewerCfg?.generalSettings?.trueValues || ["true", "yes", "1", "y", "x", "on", "✓"]
                },
                csvHeaders: effectiveHeadersForSeparatorCheck
            };
            let currentItemMeetsPartitionCriteria = false;
            try {
                const filterGroup = partitionConfigSettings.filter;
                if (filterGroup.logic && filterGroup.conditions && filterGroup.conditions.length > 0) {
                    if (filterGroup.logic.toUpperCase() === 'OR') {
                        currentItemMeetsPartitionCriteria = filterGroup.conditions.some(singleCondition =>
                            checkCondition(row, singleCondition, configForSeparatorCheck) // checkCondition is assumed external
                        );
                    } else { // Default to AND logic
                        currentItemMeetsPartitionCriteria = filterGroup.conditions.every(singleCondition =>
                            checkCondition(row, singleCondition, configForSeparatorCheck)
                        );
                    }
                }
            } catch (e) {
                console.error("EDITOR_GRID: renderGridData - Error in checkCondition (for separator):", e, "Row:", row, "Filter:", partitionConfigSettings.filter);
            }

            // If the previous item didn't meet the criteria and this one does, draw a separator
            if (previousItemMetPartitionCriteria === false && currentItemMeetsPartitionCriteria === true) {
                // This row is the first in the "bottom" (partitioned) group, draw separator above it.
                if (partitionConfigSettings.separatorStyle === "heavyLine") {
                    // const pkColumnName = editorCfg?.changeTrackingPrimaryKeyColumn || 'Entry Name';
                    // console.log(`EDITOR_GRID: renderGridData - Applying separator BEFORE row ${rowIndex} (${row[pkColumnName] || 'N/A'})`);
                    tr.classList.add('editor-grid-partition-separator-top');
                }
            }
            previousItemMetPartitionCriteria = currentItemMeetsPartitionCriteria;
        }

        // Render each cell in the row
        columnDefinitions.forEach((colDef, colIndex) => {
            const td = tr.insertCell();
            td.dataset.columnName = colDef.name; // Store column name for event handlers
            td.dataset.rowIndex = rowIndex;      // Store row index for event handlers

            let cellValue = row[colDef.name];
            // Ensure multi-select has an array, and others default to empty string if undefined
            if (cellValue === undefined) {
                cellValue = (colDef.type === 'multi-select' ? [] : '');
            }

            // Apply center alignment for certain cell types or styled columns
            const styleConfForCol = viewerCfg?.indicatorStyles?.[colDef.viewerStyleColumnName || colDef.name];
            if (colDef.type === 'checkbox' ||
                colDef.type === 'multi-select' ||
                (styleConfForCol && styleConfForCol.type === 'icon') ||
                (colDef.type === 'select' && styleConfForCol && styleConfForCol.type === 'tag') ||
                (viewerCfg?.generalSettings?.linkColumns?.includes(colDef.name) && !(styleConfForCol && (styleConfForCol.type === 'tag')))
            ) {
                td.classList.add('cell-align-center');
            }

            if (colIndex === 0) { // Make the first data cell sticky
                td.classList.add('sticky-col', 'first-col');
            }
            if (colDef.type === 'multi-select') {
                td.classList.add('cell-type-multi-select'); // Special styling for multi-select cells
            }

            td.innerHTML = getStyledCellDisplay(cellValue, colDef); // Get styled content

            if (!colDef.readOnly) {
                td.addEventListener('click', handleCellClickToEdit);
                if (colDef.type === 'checkbox') td.classList.add('editor-cell-boolean-toggle'); // Class for checkbox styling/interaction
            } else {
                td.classList.add('cell-readonly');
            }
            validateCell(td, cellValue, colDef); // Validate and apply error styles if needed
        });

        // Add action cell with delete button
        const actionTd = tr.insertCell();
        actionTd.classList.add('action-cell');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Delete";
        deleteBtn.dataset.rowIndex = rowIndex;
        deleteBtn.addEventListener('click', handleDeleteRowClick);
        actionTd.appendChild(deleteBtn);
    });

}

/**
 * Handles clicks on table cells to initiate editing.
 * @param {Event} event - The click event.
 */
function handleCellClickToEdit(event) {
    const td = event.target.closest('td'); // Ensure we get the TD even if a child span was clicked
    if (!td || td.classList.contains('cell-readonly') || td.querySelector('input, select, textarea, .custom-select-popup')) {
        // Cell is readonly, or already in edit mode, or not a cell
        return;
    }

    const columnName = td.dataset.columnName;
    const rowIndex = parseInt(td.dataset.rowIndex, 10);
    const colDef = _editorConfigInstance.columns.find(c => c.name === columnName);
    if (!colDef) {
        console.error("EDITOR_GRID: handleCellClickToEdit - Column definition not found for:", columnName);
        return;
    }

    // If another popup is active and it's not for this cell, remove it
    if (_activePopup && _activePopup.td !== td) {
        _activePopup.remove();
        _activePopup = null;
    }

    let cellValue = _csvDataInstance[rowIndex][columnName];
    // Ensure multi-select value is an array before editing
    if (colDef.type === 'multi-select' && !Array.isArray(cellValue)) {
        if (typeof cellValue === 'string' && cellValue.trim() !== '') {
            cellValue = cellValue.split(',').map(s => s.trim()).filter(s => s);
        } else {
            cellValue = [];
        }
        _csvDataInstance[rowIndex][columnName] = cellValue; // Update model immediately for consistency
    }

    td.innerHTML = ''; // Clear current cell content to make space for input

    let inputElement;
    if (colDef.type === 'checkbox') {
        // Toggle boolean value for checkbox
        const isCurrentlyTrue = isTruthy(cellValue, _viewerConfigInstance || { generalSettings: {} });
        const trueVal = _editorConfigInstance.csvOutputOptions?.booleanTrueValue || "TRUE";
        const falseVal = _editorConfigInstance.csvOutputOptions?.booleanFalseValue || "FALSE";
        _csvDataInstance[rowIndex][columnName] = isCurrentlyTrue ? falseVal : trueVal;

        console.log(`EDITOR_GRID: handleCellClickToEdit - Checkbox Toggled: Row ${rowIndex}, Col "${columnName}" = "${_csvDataInstance[rowIndex][columnName]}"`);
        td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef); // Re-render styled display
        validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);
        window.dispatchEvent(new CustomEvent('editorDataChanged')); // Notify app of data change
        return; // Checkbox editing is instant, no input element needed beyond this
    } else if (colDef.type === 'select' || colDef.type === 'multi-select') {
        createSelectPopup(td, cellValue, colDef, rowIndex, columnName); // Use custom popup for select types
        return;
    }

    // Create appropriate input element based on column type
    switch (colDef.type) {
        case 'textarea':
            inputElement = document.createElement('textarea');
            inputElement.value = String(cellValue ?? '');
            break;
        case 'date':
            inputElement = document.createElement('input'); inputElement.type = 'date';
            try { // Attempt to format for date input
                if (cellValue && !isNaN(new Date(cellValue))) {
                    inputElement.value = new Date(cellValue).toISOString().split('T')[0];
                } else {
                    inputElement.value = cellValue ?? '';
                }
            } catch (e) { inputElement.value = cellValue ?? ''; } // Fallback if date parsing fails
            break;
        case 'number':
            inputElement = document.createElement('input'); inputElement.type = 'number';
            inputElement.value = cellValue ?? '';
            break;
        default: // 'text', 'url', or any other unhandled type
            inputElement = document.createElement('input');
            inputElement.type = colDef.type === 'url' ? 'url' : 'text';
            inputElement.value = String(cellValue ?? '');
            break;
    }

    inputElement.dataset.rowIndex = rowIndex;
    inputElement.dataset.columnName = columnName;

    // Function to finalize editing
    const finishEdit = (saveChange = true) => {
        if (saveChange) {
            handleCellChange({ target: inputElement }); // Update data model
        }
        const currentValInModel = _csvDataInstance[rowIndex][columnName];
        td.innerHTML = getStyledCellDisplay(currentValInModel, colDef); // Re-render styled display
        validateCell(td, currentValInModel, colDef);
        if (saveChange) window.dispatchEvent(new CustomEvent('editorDataChanged')); // Notify app
    };

    inputElement.addEventListener('blur', () => finishEdit(true)); // Save on blur
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { // Save on Enter
            e.preventDefault();
            inputElement.blur();
        } else if (e.key === 'Escape') { // Discard changes on Escape
            finishEdit(false);
        }
    });

    td.appendChild(inputElement);
    if (typeof inputElement.focus === 'function') {
        inputElement.focus();
        if (inputElement.select) inputElement.select(); // Select text if possible
    }
}

/**
 * Handles the actual data model update when an input element's value changes.
 * This function is called by the 'blur' or 'Enter' event handlers of inline editors.
 * @param {Event} event - The event (usually blur or keydown) from the input element.
 */
function handleCellChange(event) {
    const inputElement = event.target;
    const rowIndex = parseInt(inputElement.dataset.rowIndex, 10);
    const columnName = inputElement.dataset.columnName;

    let newValue;
    // Handle type-specific value retrieval
    if (inputElement.type === 'number') {
        newValue = inputElement.value === '' ? '' : parseFloat(inputElement.value);
        // If parseFloat results in NaN but original input was not empty, keep original string (allows non-numeric input if schema changes)
        if (isNaN(newValue) && inputElement.value !== '') {
            newValue = inputElement.value;
        }
    } else {
        newValue = inputElement.value;
    }

    if (_csvDataInstance && _csvDataInstance[rowIndex] !== undefined && columnName !== undefined) {
        if (_csvDataInstance[rowIndex][columnName] !== newValue) {
            _csvDataInstance[rowIndex][columnName] = newValue; // Update the data model
            console.log(`EDITOR_GRID: handleCellChange - Data updated: Row ${rowIndex}, Col "${columnName}" =`, newValue);
        }
    } else {
        console.error("EDITOR_GRID: handleCellChange - Error updating cell: Invalid rowIndex, columnName, or _csvDataInstance reference.");
    }
}

/**
 * Gathers all possible options for a select/multi-select column from various sources:
 * 1. Explicit options in editorConfig.
 * 2. Values from viewerConfig's indicatorStyles.valueMap.
 * 3. Existing unique values from the CSV data for that column.
 * @param {Object} colDef - The column definition object.
 * @returns {Array<Object>} An array of {value, label} option objects, initially sorted alphabetically.
 */
function getOptionsForColumn(colDef) {
    const optionsMap = new Map(); // Use a Map to store unique options {value: label}

    // Helper to add an option to the map, ensuring uniqueness by value
    const addOption = (value, label) => {
        const valStr = String(value ?? '');
        // Avoid adding options that are effectively empty (all whitespace) unless it's an intentional empty string
        if (valStr.trim() === '' && value !== '') return;

        const mapLabel = (label === '' && valStr !== '') ? `(Value: ${valStr})` : (label || valStr); // Ensure label exists

        if (!optionsMap.has(valStr)) {
            optionsMap.set(valStr, mapLabel);
        } else if (label && label !== mapLabel && optionsMap.get(valStr) === valStr) {
            // If a more descriptive label is found later for an existing value that only had its value as label
            optionsMap.set(valStr, mapLabel);
        }
    };

    // 1. Options from editorConfig's `colDef.options`
    if (Array.isArray(colDef.options) && colDef.options.length > 0) {
        colDef.options.forEach(opt => {
            if (typeof opt === 'string') addOption(opt, opt);
            else if (opt && typeof opt.value !== 'undefined') addOption(opt.value, opt.label || opt.value);
        });
    }

    // 2. Options from viewerConfig's `indicatorStyles.valueMap` if specified by `colDef.optionsSource`
    if (colDef.optionsSource === 'viewerConfigValueMap' && _viewerConfigInstance?.indicatorStyles) {
        const styleColName = colDef.viewerStyleColumnName || colDef.name;
        const styleConf = _viewerConfigInstance.indicatorStyles[styleColName];
        const valueMap = styleConf?.valueMap;
        if (valueMap) {
            Object.keys(valueMap)
                .filter(key => key !== 'default') // Exclude 'default' key from being an option
                .forEach(key => addOption(key, valueMap[key].text || key)); // Use text property or key itself as label
        }
    }

    // 3. Options from existing unique values in the current CSV data for this column
    if (_csvDataInstance && Array.isArray(_csvDataInstance)) {
        _csvDataInstance.forEach(row => {
            const cellData = row[colDef.name];
            if (cellData !== undefined && cellData !== null) {
                if (Array.isArray(cellData)) { // For multi-select data
                    cellData.forEach(item => addOption(String(item), String(item)));
                } else { // For single value data
                    const valStr = String(cellData);
                    if (valStr.trim() !== '' || valStr === '') addOption(valStr, valStr);
                }
            }
        });
    }

    // Convert map to array of {value, label} objects
    const finalOptions = [];
    optionsMap.forEach((label, value) => {
        const displayLabel = label.startsWith('(Value:') ? value : label; // Use value if label was placeholder
        finalOptions.push({ value, label: displayLabel });
    });

    // Initial alphabetical sort of all gathered options by label
    finalOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

    // For single 'select' (not multi-select), add a "(No Selection)" option if not required and not already present
    if (colDef.type === 'select' && !colDef.required) {
        const hasExplicitBlank = finalOptions.some(opt => opt.value === '');
        if (!hasExplicitBlank) {
            finalOptions.unshift({ value: '', label: '(No Selection)' }); // Add to the beginning
        } else { // If blank option exists, ensure its label is standardized
            const blankOption = finalOptions.find(opt => opt.value === '');
            if (blankOption && (blankOption.label === '' || blankOption.label.startsWith('(Value:'))) {
                blankOption.label = '(No Selection)';
            }
        }
    }
    return finalOptions;
}

/**
 * Creates and displays a custom popup for 'select' and 'multi-select' fields.
 * @param {HTMLTableCellElement} td - The table cell being edited.
 * @param {*} currentValueForPopup - The current value(s) for the cell.
 * @param {Object} colDef - The column definition.
 * @param {number} rowIndex - The row index.
 * @param {string} columnName - The column name.
 */
function createSelectPopup(td, currentValueForPopup, colDef, rowIndex, columnName) {
    if (_activePopup) _activePopup.remove(); // Remove any existing popup

    const popup = document.createElement('div');
    _activePopup = popup; // Set as active popup
    _activePopup.td = td; // Store reference to the cell
    popup.className = 'custom-select-popup';

    // Position popup below the cell
    const rect = td.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.minWidth = `${Math.max(td.offsetWidth, 200)}px`; // Ensure minimum width
    popup.style.zIndex = '1000'; // Ensure popup is on top

    let allOptions = getOptionsForColumn(colDef); // Get all possible options
    const useSearch = allOptions.length >= 15 || (colDef.type === 'multi-select' && colDef.allowNewTags);

    // Normalize current selections into an array of strings
    let currentSelectionsArray = [];
    if (colDef.type === 'multi-select') {
        currentSelectionsArray = Array.isArray(currentValueForPopup) ? [...currentValueForPopup.map(String)] : [];
    } else { // Single select
        currentSelectionsArray = currentValueForPopup !== undefined && currentValueForPopup !== null ? [String(currentValueForPopup)] : ['']; // Empty string for 'No Selection'
    }

    const searchInput = document.createElement('input');
    if (useSearch) {
        searchInput.type = 'search';
        searchInput.placeholder = (colDef.type === 'multi-select' && colDef.allowNewTags) ? 'Search or Add New & Enter...' : 'Search options...';
        searchInput.className = 'popup-search-input';
        popup.appendChild(searchInput);
    }

    const optionsList = document.createElement('ul');
    optionsList.className = 'popup-options-list';
    popup.appendChild(optionsList);

    // Temporary global function to update data model and close popup from option click/selection
    // This is a common pattern for dynamic elements, though care should be taken with globals.
    window._editorUpdateAndCloseFromPopup = (valueToSet) => {
        _csvDataInstance[rowIndex][columnName] = valueToSet; // Update data model
        td.innerHTML = getStyledCellDisplay(valueToSet, colDef); // Re-render cell
        validateCell(td, valueToSet, colDef);
        if (_activePopup === popup) { // Ensure this is still the active popup
            popup.remove();
            _activePopup = null;
        }
        window.dispatchEvent(new CustomEvent('editorDataChanged')); // Notify app of change
    };

    // Rerenders the options list based on search term and current selections
    const rerenderOptionsList = () => {
        const searchTerm = useSearch ? searchInput.value.toLowerCase() : '';
        // This function will filter `allOptions` and sort them with selected items on top (for multi-select)
        filterAndSortPopupOptions(optionsList, searchTerm, allOptions, currentSelectionsArray, colDef);
    };

    if (useSearch) {
        searchInput.addEventListener('input', rerenderOptionsList);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (colDef.type === 'multi-select' && colDef.allowNewTags && searchInput.value.trim() !== '') {
                    // Add new tag for multi-select if allowed
                    const newTag = searchInput.value.trim();
                    if (!currentSelectionsArray.includes(newTag)) {
                        currentSelectionsArray.push(newTag);
                    }
                    // Add to master list of options if it's truly new
                    if (!allOptions.some(opt => opt.value === newTag)) {
                        allOptions.push({ value: newTag, label: newTag });
                        // Re-sort master list if a new option was added
                        allOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
                    }
                    searchInput.value = ''; // Clear search input
                    rerenderOptionsList(); // Refresh list to show new tag selected
                } else if (colDef.type === 'select') { // For single select, try to select the first visible option
                    const firstVisibleOption = optionsList.querySelector('li:not([data-filtered-out="true"])'); // Assuming data-filtered-out attribute is used
                    if (firstVisibleOption) firstVisibleOption.click();
                }
            } else if (e.key === 'Escape') { // Close popup on Escape, reverting to original cell display
                if (_activePopup === popup) { popup.remove(); _activePopup = null; }
                td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef); // Re-render original
                validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);
            }
        });
    }

    rerenderOptionsList(); // Initial rendering of options

    if (colDef.type === 'multi-select') { // Add Apply button for multi-select
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply Selections';
        applyBtn.className = 'popup-apply-btn';
        applyBtn.addEventListener('click', () => {
            window._editorUpdateAndCloseFromPopup([...currentSelectionsArray]); // Pass a copy of selections
        });
        popup.appendChild(applyBtn);
    }

    document.body.appendChild(popup);
    // Focus management
    if (useSearch && searchInput) searchInput.focus();
    else if (optionsList.firstChild) optionsList.firstChild.focus(); // Focus first option if no search

    // Add listener to close popup when clicking outside
    setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
}

/**
 * Filters options by search term, then sorts them (selected first for multi-select), and calls renderPopupOptions.
 * @param {HTMLUListElement} listElement - The <ul> element to populate.
 * @param {string} searchTerm - The search term (already lowercased).
 * @param {Array<Object>} allAvailableOptions - The complete list of {value, label} options.
 * @param {Array<string>} currentSelectedValuesArray - Array of currently selected string values (source of truth for selection state).
 * @param {Object} colDef - The column definition.
 */
function filterAndSortPopupOptions(listElement, searchTerm, allAvailableOptions, currentSelectedValuesArray, colDef) {
    // 1. Filter by search term
    const filteredBySearch = searchTerm
        ? allAvailableOptions.filter(opt => opt.label.toLowerCase().includes(searchTerm))
        : [...allAvailableOptions]; // Use a copy if no search

    let optionsToRender;

    if (colDef.type === 'multi-select') {
        // 2. For multi-select, partition into selected and unselected based on `currentSelectedValuesArray`
        const selectedOptions = [];
        const unselectedOptions = [];
        const currentSelectionsSet = new Set(currentSelectedValuesArray.map(String)); // For efficient lookup

        filteredBySearch.forEach(opt => {
            if (currentSelectionsSet.has(String(opt.value))) {
                selectedOptions.push(opt);
            } else {
                unselectedOptions.push(opt);
            }
        });

        // 3. Sort each partition alphabetically (original `allAvailableOptions` was already sorted, but filtering might disrupt)
        selectedOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
        unselectedOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

        // 4. Combine: selected items appear at the top
        optionsToRender = [...selectedOptions, ...unselectedOptions];
    } else {
        // For single 'select', the order from `getOptionsForColumn` (alpha + '(No Selection)' first) is generally fine after search filtering.
        optionsToRender = filteredBySearch;
    }

    // 5. Render the final list of options into the `listElement`
    renderPopupOptions(listElement, optionsToRender, currentSelectedValuesArray, colDef);
}

/**
 * Renders the individual option items (<li>) into the popup's list.
 * @param {HTMLUListElement} listElement - The <ul> element where options will be rendered.
 * @param {Array<Object>} optionsToDisplay - The filtered and sorted list of {value, label} options to display.
 * @param {Array<string>} currentSelectedValuesArrayFromCaller - The array from `createSelectPopup` scope holding current selections. This is mutated for multi-select.
 * @param {Object} colDef - The column definition.
 */
function renderPopupOptions(listElement, optionsToDisplay, currentSelectedValuesArrayFromCaller, colDef) {
    listElement.innerHTML = ''; // Clear previous options
    const isMulti = colDef.type === 'multi-select';
    // Use `currentSelectedValuesArrayFromCaller` to determine checked/selected state
    const currentSelectionsSet = new Set(currentSelectedValuesArrayFromCaller.map(String));

    if (optionsToDisplay.length === 0) {
        const li = document.createElement('li');
        li.textContent = (isMulti && colDef.allowNewTags) ? "Type to add new or filter existing." : "No options match search.";
        li.style.fontStyle = "italic"; li.style.color = "#777";
        listElement.appendChild(li);
        return;
    }

    optionsToDisplay.forEach(opt => {
        const li = document.createElement('li');
        li.tabIndex = 0; // Make focusable for keyboard navigation
        const valStr = String(opt.value);

        if (isMulti) { // Multi-select: render as checkbox items
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = valStr;
            // Create a unique ID for label association
            const uniqueId = `popup-opt-${colDef.name.replace(/\W/g, '_')}-${valStr.replace(/\W/g, '_')}-${Math.random().toString(16).slice(2)}`;
            cb.id = uniqueId;

            if (currentSelectionsSet.has(valStr)) {
                cb.checked = true;
            }

            cb.addEventListener('change', () => {
                // Directly modify the `currentSelectedValuesArrayFromCaller` (from createSelectPopup scope)
                // This array tracks the selections for the multi-select popup.
                if (cb.checked) {
                    if (!currentSelectedValuesArrayFromCaller.includes(valStr)) {
                        currentSelectedValuesArrayFromCaller.push(valStr);
                    }
                } else {
                    const index = currentSelectedValuesArrayFromCaller.indexOf(valStr);
                    if (index > -1) {
                        currentSelectedValuesArrayFromCaller.splice(index, 1);
                    }
                }
                console.log("EDITOR_GRID: renderPopupOptions - Multi-select popup selections changed (direct array mod):", currentSelectedValuesArrayFromCaller);
            });

            const label = document.createElement('label');
            label.htmlFor = cb.id;
            label.appendChild(cb);
            label.appendChild(document.createTextNode(opt.label)); // Use text node for security
            li.appendChild(label);
            // Allow clicking the whole <li> to toggle the checkbox
            li.addEventListener('click', (e) => { if (e.target !== cb && e.target !== label) { cb.click(); } });
            li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cb.click(); } });

        } else { // Single 'select': render as simple list items
            li.textContent = opt.label;
            li.dataset.value = valStr;
            if (currentSelectionsSet.has(valStr)) { // Should only be one for single select
                li.classList.add('selected');
            }
            const selectAndClose = () => {
                window._editorUpdateAndCloseFromPopup(opt.value); // Call global helper to update and close
            };
            li.addEventListener('click', selectAndClose);
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAndClose(); } });
        }
        listElement.appendChild(li);
    });
}

/**
 * Handles clicks outside the active popup to close it.
 * @param {Event} event - The click event.
 */
function handleClickOutsidePopup(event) {
    if (_activePopup && !_activePopup.contains(event.target)) {
        const td = _activePopup.td; // Get the cell associated with the popup
        // Check if the click was on the original cell that opened the popup (or its children)
        const isTargetCellOrChild = td.contains(event.target) || td === event.target;

        if (!isTargetCellOrChild) { // Click was truly outside the popup and its originating cell
            const rowIndex = parseInt(td.dataset.rowIndex);
            const columnName = td.dataset.columnName;
            const colDef = _editorConfigInstance.columns.find(c => c.name === columnName);

            // Revert cell display to its current model value (no changes committed from popup)
            td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef);
            validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);

            _activePopup.remove();
            _activePopup = null;
            // Listener is added with `once: true`, so it removes itself. Re-adding it in `else` is for chained clicks.
            // No need to explicitly remove here unless `once:true` was not used.
            // document.removeEventListener('click', handleClickOutsidePopup, { capture: true });
        } else {
            // Click was back on the originating cell; popup should remain open.
            // Re-attach the listener because `once: true` would have removed it.
            // This handles cases where the user clicks the cell again while popup is open.
            if (_activePopup) {
                // document.removeEventListener('click', handleClickOutsidePopup, { capture: true }); // Already removed by 'once'
                setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
            }
        }
    } else if (_activePopup) {
        // Click was inside the popup, keep it open.
        // Re-attach the listener.
        // document.removeEventListener('click', handleClickOutsidePopup, { capture: true }); // Already removed by 'once'
        setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
    }
}

/**
 * Adds a new empty row to the CSV data and re-renders the grid.
 * @returns {boolean} True if the row was added successfully, false otherwise.
 */
function addNewRow() {
    if (!_editorConfigInstance || !_editorConfigInstance.columns) {
        console.error("EDITOR_GRID: addNewRow - Cannot add row: Editor config not loaded or has no columns.");
        return false;
    }
    if (!_csvDataInstance) {
        console.error("EDITOR_GRID: addNewRow - Cannot add row: _csvDataInstance not initialized.");
        return false;
    }

    const newRowObject = {};
    // Initialize new row with default values based on column types
    _editorConfigInstance.columns.forEach(colDef => {
        if (colDef.type === 'checkbox') {
            newRowObject[colDef.name] = _editorConfigInstance.csvOutputOptions?.booleanFalseValue || "FALSE";
        } else if (colDef.type === 'multi-select') {
            newRowObject[colDef.name] = [];
        } else {
            newRowObject[colDef.name] = '';
        }
    });
    newRowObject._originalIndex = -1; // Mark as a new row (not from initial data)
    const pkColName = _editorConfigInstance?.changeTrackingPrimaryKeyColumn;
    if (pkColName && newRowObject.hasOwnProperty(pkColName)) {
        newRowObject._originalPkValue = newRowObject[pkColName]; // Should be '' or undefined
    } else {
        newRowObject._originalPkValue = undefined;
    }

    // Determine insertion point: if partitioning is active, insert before the first partitioned item.
    const editorCfg = _editorConfigInstance;
    const partitionConfig = editorCfg?.editorDisplaySettings?.partitionBy;
    let insertAtIndex = _csvDataInstance.length; // Default to appending at the very end

    if (partitionConfig?.enabled && partitionConfig?.filter?.conditions?.length > 0) {
        const effectiveHeadersForNewRowCheck = editorCfg.columns.map(c => c.name);
        const configForNewRowCheck = { // Config for checkCondition
            generalSettings: {
                trueValues: (_viewerConfigInstance?.generalSettings?.trueValues) || ["true", "yes", "1", "y", "x", "on", "✓"]
            },
            csvHeaders: effectiveHeadersForNewRowCheck
        };
        // Find the index of the first existing row that meets partition criteria
        const firstPartitionedItemIndex = _csvDataInstance.findIndex(row => {
            // Check against the entire filter group for the partition
            const filterGroup = partitionConfig.filter;
            if (filterGroup.logic && filterGroup.logic.toUpperCase() === 'OR') {
                return filterGroup.conditions.some(singleCondition => checkCondition(row, singleCondition, configForNewRowCheck));
            } else { // Default to AND
                return filterGroup.conditions.every(singleCondition => checkCondition(row, singleCondition, configForNewRowCheck));
            }
        });

        if (firstPartitionedItemIndex !== -1) {
            insertAtIndex = firstPartitionedItemIndex; // Insert before this item
        }
        // If no items meet partition criteria, `insertAtIndex` remains `_csvDataInstance.length`, effectively appending to the main (top) group.
    }

    _csvDataInstance.splice(insertAtIndex, 0, newRowObject); // Insert new row into data model
    console.log(`EDITOR_GRID: addNewRow - New row added at index ${insertAtIndex}.`);

    renderGridData(); // Re-render the entire grid

    // Scroll to and focus the new row for immediate editing
    const { editorGridTbody } = editorDomElements;
    if (editorGridTbody && editorGridTbody.rows[insertAtIndex]) {
        editorGridTbody.rows[insertAtIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Find the first editable cell in the new row
        const firstEditableCell = editorGridTbody.rows[insertAtIndex].querySelector('td:not(.cell-readonly)');
        if (firstEditableCell) {
            // Simulate a click to enter edit mode
            handleCellClickToEdit({ target: firstEditableCell });
        }
    }
    window.dispatchEvent(new CustomEvent('editorDataChanged')); // Notify app of data change
    return true;
}

/**
 * Handles clicks on "Delete" buttons to remove a row.
 * @param {Event} event - The click event from the delete button.
 */
function handleDeleteRowClick(event) {
    const buttonElement = event.target;
    const rowIndex = parseInt(buttonElement.dataset.rowIndex, 10);

    if (confirm(`Are you sure you want to delete row ${rowIndex + 1}?`)) {
        if (_csvDataInstance && rowIndex >= 0 && rowIndex < _csvDataInstance.length) {
            _csvDataInstance.splice(rowIndex, 1); // Remove row from data model
            console.log(`EDITOR_GRID: handleDeleteRowClick - Row ${rowIndex} deleted.`);
            renderGridData(); // Re-render grid
            window.dispatchEvent(new CustomEvent('editorDataChanged')); // Notify app
        } else {
            console.error(`EDITOR_GRID: handleDeleteRowClick - Invalid rowIndex ${rowIndex} or _csvDataInstance issue.`);
        }
    }
}