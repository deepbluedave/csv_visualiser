// ================================================================
// File: csv_editor/js/editor_data_grid.js
// ================================================================

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

        if (colDef.columnWidth) {
            th.style.width = colDef.columnWidth;
        } else {
            th.style.width = (orientation === 'vertical') ? '50px' : '150px';
        }
        if (index === 0) {
            th.classList.add('sticky-col', 'first-col');
        }
        tr.appendChild(th);
    });

    const thActions = document.createElement('th');
    thActions.textContent = "Actions";
    thActions.style.width = "80px";
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
    clearGridContent();
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
    const originalTitle = `CSV Header: ${colDef.name}`;

    if (colDef.required) {
        let isEmpty = false;
        if (colDef.type === 'multi-select') {
            isEmpty = !Array.isArray(value) || value.length === 0;
        } else {
            isEmpty = value === null || value === undefined || String(value).trim() === '';
            if (colDef.type === 'select' && value === '') {
                isEmpty = true;
            }
        }
        if (isEmpty) {
            isValid = false;
            td.title = `${colDef.label || colDef.name} is required.`;
        }
    }

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
        }
    }

    if (!isValid) {
        td.classList.add('cell-error');
    } else {
        if (td.title.startsWith(colDef.label || colDef.name) && (td.title.includes("is required") || td.title.includes("does not match pattern"))) {
            td.title = originalTitle;
        } else if (!td.title && colDef.name) {
            td.title = originalTitle;
        }
    }
    return isValid;
}

/**
 * Gets the styled HTML display for a cell value based on viewer configuration and column definition.
 * @param {*} cellValue - The value of the cell.
 * @param {Object} colDef - The column definition object.
 * @returns {string} HTML string for the cell's content.
 */
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
                const formatted = formatTag(cellValue, viewerCfg, viewerStyleColName, indicatorStyleConf.titlePrefix);
                return formatted || (cellValue === '' ? '' : String(cellValue ?? ''));
            }
        }
    }

    if (isLinkColInViewer && colDef.type !== 'checkbox') {
        const urlValueStr = String(cellValue ?? '');
        if (urlValueStr.trim() !== '') {
            return `<span class="cell-url-display-span" title="${urlValueStr}">🔗${urlValueStr}</span>`;
        } else { return ''; }
    }

    if (colDef.type === 'multi-select' && Array.isArray(cellValue)) {
        if (cellValue.length === 0) return '';
        return cellValue.map(v => `<span class="editor-cell-mini-tag">${String(v ?? '')}</span>`).join(' ');
    }
    if (colDef.type === 'checkbox') { return ''; }
    if (colDef.type === 'select' && cellValue === '') { return '(No Selection)'; }

    if (colDef.type === 'textarea' && colDef.displayAsSingleLine) {
        return `<span class="editor-single-line-text">${String(cellValue ?? '')}</span>`;
    }

    return String(cellValue ?? '');
}

/**
 * Renders the data rows (tbody) of the grid.
 */
function renderGridData() {
    const { editorGridTbody } = editorDomElements;
    if (!editorGridTbody) { console.error("EDITOR_GRID: renderGridData - Table body (tbody) element not found."); return; }
    clearGridContent();

    if (!_editorConfigInstance || !_editorConfigInstance.columns || _editorConfigInstance.columns.length === 0) {
        console.warn("EDITOR_GRID: renderGridData - No column definitions from editor config. Cannot render data rows.");
        const { editorGridThead } = editorDomElements;
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
        td.colSpan = columnDefinitions.length + 1;
        td.textContent = "No CSV data loaded. Click '+ Add Row' or load a CSV file.";
        td.style.textAlign = "center"; td.style.fontStyle = "italic"; td.style.padding = "20px";
        return;
    }

    const editorCfg = _editorConfigInstance;
    const viewerCfg = _viewerConfigInstance;
    const partitionConfigSettings = editorCfg?.editorDisplaySettings?.partitionBy;
    const isPartitionActive = partitionConfigSettings?.enabled &&
        partitionConfigSettings?.filter?.conditions?.length > 0;
    let previousItemMetPartitionCriteria = null;

    _csvDataInstance.forEach((row, rowIndex) => {
        const tr = editorGridTbody.insertRow();
        tr.dataset.rowIndex = rowIndex;

        if (isPartitionActive) {
            const effectiveHeadersForSeparatorCheck = editorCfg.columns.map(c => c.name);
            const configForSeparatorCheck = {
                generalSettings: {
                    trueValues: viewerCfg?.generalSettings?.trueValues || ["true", "yes", "1", "y", "x", "on", "âœ“"]
                },
                csvHeaders: effectiveHeadersForSeparatorCheck
            };
            let currentItemMeetsPartitionCriteria = false;
            try {
                const filterGroup = partitionConfigSettings.filter;
                if (filterGroup.logic && filterGroup.conditions && filterGroup.conditions.length > 0) {
                    if (filterGroup.logic.toUpperCase() === 'OR') {
                        currentItemMeetsPartitionCriteria = filterGroup.conditions.some(singleCondition =>
                            checkCondition(row, singleCondition, configForSeparatorCheck)
                        );
                    } else {
                        currentItemMeetsPartitionCriteria = filterGroup.conditions.every(singleCondition =>
                            checkCondition(row, singleCondition, configForSeparatorCheck)
                        );
                    }
                }
            } catch (e) {
                console.error("EDITOR_GRID: renderGridData - Error in checkCondition (for separator):", e, "Row:", row, "Filter:", partitionConfigSettings.filter);
            }
            if (previousItemMetPartitionCriteria === false && currentItemMeetsPartitionCriteria === true) {
                if (partitionConfigSettings.separatorStyle === "heavyLine") {
                    tr.classList.add('editor-grid-partition-separator-top');
                }
            }
            previousItemMetPartitionCriteria = currentItemMeetsPartitionCriteria;
        }

        columnDefinitions.forEach((colDef, colIndex) => {
            const td = tr.insertCell();
            td.dataset.columnName = colDef.name;
            td.dataset.rowIndex = rowIndex;
            let cellValue = row[colDef.name];
            if (cellValue === undefined) {
                cellValue = (colDef.type === 'multi-select' ? [] : '');
            }

            const styleConfForCol = viewerCfg?.indicatorStyles?.[colDef.viewerStyleColumnName || colDef.name];
            if (colDef.type === 'checkbox' ||
                colDef.type === 'multi-select' ||
                (styleConfForCol && styleConfForCol.type === 'icon') ||
                (colDef.type === 'select' && styleConfForCol && styleConfForCol.type === 'tag') ||
                (viewerCfg?.generalSettings?.linkColumns?.includes(colDef.name) && !(styleConfForCol && (styleConfForCol.type === 'tag')))
            ) {
                td.classList.add('cell-align-center');
            }
            if (colIndex === 0) {
                td.classList.add('sticky-col', 'first-col');
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
        deleteBtn.textContent = "Delete";
        deleteBtn.dataset.rowIndex = rowIndex;
        deleteBtn.addEventListener('click', handleDeleteRowClick);
        actionTd.appendChild(deleteBtn);
    });
    console.log(`EDITOR_GRID: renderGridData - Grid data rendered: ${_csvDataInstance.length} rows.`);
}

/**
 * Handles clicks on table cells to initiate editing.
 * @param {Event} event - The click event.
 */
function handleCellClickToEdit(event) {
    const td = event.target.closest('td');
    if (!td || td.classList.contains('cell-readonly') || td.querySelector('input, select, textarea, .custom-select-popup')) {
        return;
    }

    const columnName = td.dataset.columnName;
    const rowIndex = parseInt(td.dataset.rowIndex, 10);
    const colDef = _editorConfigInstance.columns.find(c => c.name === columnName);
    if (!colDef) {
        console.error("EDITOR_GRID: handleCellClickToEdit - Column definition not found for:", columnName);
        return;
    }

    if (_activePopup && _activePopup.td !== td) {
        _activePopup.remove();
        _activePopup = null;
    }

    let cellValue = _csvDataInstance[rowIndex][columnName];
    if (colDef.type === 'multi-select' && !Array.isArray(cellValue)) {
        if (typeof cellValue === 'string' && cellValue.trim() !== '') {
            cellValue = cellValue.split(',').map(s => s.trim()).filter(s => s);
        } else {
            cellValue = [];
        }
        _csvDataInstance[rowIndex][columnName] = cellValue;
    }

    td.innerHTML = '';

    let inputElement;
    if (colDef.type === 'checkbox') {
        const isCurrentlyTrue = isTruthy(cellValue, _viewerConfigInstance || { generalSettings: {} });
        const trueVal = _editorConfigInstance.csvOutputOptions?.booleanTrueValue || "TRUE";
        const falseVal = _editorConfigInstance.csvOutputOptions?.booleanFalseValue || "FALSE";
        _csvDataInstance[rowIndex][columnName] = isCurrentlyTrue ? falseVal : trueVal;
        console.log(`EDITOR_GRID: handleCellClickToEdit - Checkbox Toggled: Row ${rowIndex}, Col "${columnName}" = "${_csvDataInstance[rowIndex][columnName]}"`);
        td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef);
        validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);
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
            if (colDef.displayAsSingleLine) { // If configured, keep it single line during edit too
                inputElement.rows = 1; // Force single line for editing textarea
                inputElement.style.resize = 'none'; // Optionally disable resize
                inputElement.style.overflow = 'hidden'; // Hide overflow
                // May need JS to adjust width or prevent newlines in this specific case
            }
            break;
        case 'date':
            inputElement = document.createElement('input'); inputElement.type = 'date';
            try {
                if (cellValue && !isNaN(new Date(cellValue))) {
                    inputElement.value = new Date(cellValue).toISOString().split('T')[0];
                } else {
                    inputElement.value = cellValue ?? '';
                }
            } catch (e) { inputElement.value = cellValue ?? ''; }
            break;
        case 'number':
            inputElement = document.createElement('input'); inputElement.type = 'number';
            inputElement.value = cellValue ?? '';
            break;
        default:
            inputElement = document.createElement('input');
            inputElement.type = colDef.type === 'url' ? 'url' : 'text';
            inputElement.value = String(cellValue ?? '');
            break;
    }

    inputElement.dataset.rowIndex = rowIndex;
    inputElement.dataset.columnName = columnName;

    const finishEdit = (saveChange = true) => {
        if (saveChange) {
            handleCellChange({ target: inputElement });
        }
        const currentValInModel = _csvDataInstance[rowIndex][columnName];
        td.innerHTML = getStyledCellDisplay(currentValInModel, colDef);
        validateCell(td, currentValInModel, colDef);
        if (saveChange) window.dispatchEvent(new CustomEvent('editorDataChanged'));
    };

    inputElement.addEventListener('blur', () => finishEdit(true));
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && colDef.type !== 'textarea') { // Allow enter in textarea
            e.preventDefault();
            inputElement.blur();
        } else if (e.key === 'Escape') {
            finishEdit(false);
        }
    });

    td.appendChild(inputElement);
    if (typeof inputElement.focus === 'function') {
        inputElement.focus();
        if (inputElement.select && colDef.type !== 'textarea') inputElement.select(); // Don't auto-select textarea
    }
}

/**
 * Handles the data model update when an input element's value changes.
 * @param {Event} event - The event (usually blur or keydown) from the input element.
 */
function handleCellChange(event) {
    const inputElement = event.target;
    const rowIndex = parseInt(inputElement.dataset.rowIndex, 10);
    const columnName = inputElement.dataset.columnName;
    let newValue;

    if (inputElement.type === 'number') {
        newValue = inputElement.value === '' ? '' : parseFloat(inputElement.value);
        if (isNaN(newValue) && inputElement.value !== '') {
            newValue = inputElement.value;
        }
    } else {
        newValue = inputElement.value;
    }

    if (_csvDataInstance && _csvDataInstance[rowIndex] !== undefined && columnName !== undefined) {
        if (_csvDataInstance[rowIndex][columnName] !== newValue) {
            _csvDataInstance[rowIndex][columnName] = newValue;
            console.log(`EDITOR_GRID: handleCellChange - Data updated: Row ${rowIndex}, Col "${columnName}" =`, newValue);
        }
    } else {
        console.error("EDITOR_GRID: handleCellChange - Error updating cell: Invalid rowIndex, columnName, or _csvDataInstance reference.");
    }
}

/**
 * Gathers options for select/multi-select columns from various sources.
 * @param {Object} colDef - The column definition.
 * @param {number} [rowIndexBeingEdited=-1] - The index of the row being edited, for self-reference exclusion.
 * @returns {Array<Object>} An array of {value, label} option objects.
 */
function getOptionsForColumn(colDef, rowIndexBeingEdited = -1) { // <<< MODIFIED: Added rowIndexBeingEdited
    const optionsMap = new Map();
    const addOption = (value, label) => {
        const valStr = String(value ?? '');
        if (valStr.trim() === '' && value !== '') return;
        const mapLabel = (label === '' && valStr !== '') ? `(Value: ${valStr})` : (label || valStr);
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

    // <<< MODIFIED: Logic to derive options from another column or own column >>>
    let actualColumnNameToScanForDataValues = colDef.name; // Default to own column
    if (colDef.deriveOptionsFromColumn &&
        _editorConfigInstance && _editorConfigInstance.columns.some(c => c.name === colDef.deriveOptionsFromColumn)) {
        actualColumnNameToScanForDataValues = colDef.deriveOptionsFromColumn;
        console.log(`EDITOR_GRID: getOptionsForColumn for "${colDef.name}" - Deriving options from column "${actualColumnNameToScanForDataValues}".`);
    } else if (colDef.deriveOptionsFromColumn) {
        console.warn(`EDITOR_GRID: getOptionsForColumn for "${colDef.name}" - Specified deriveOptionsFromColumn "${colDef.deriveOptionsFromColumn}" is invalid or not found. Defaulting to self.`);
    }

    if (_csvDataInstance && Array.isArray(_csvDataInstance)) {
        _csvDataInstance.forEach((row, currentRowIndex) => {
            const cellData = row[actualColumnNameToScanForDataValues];

            // Self-reference exclusion logic
            if (colDef.deriveOptionsFromColumn && // Only apply if deriving
                rowIndexBeingEdited !== -1 &&    // And we know which row is being edited
                currentRowIndex === rowIndexBeingEdited) { // And this is the row being edited
                // Skip adding this row's source value to the options for itself
                console.log(`EDITOR_GRID: getOptionsForColumn - Skipping self-reference: Row ${rowIndexBeingEdited}'s value from "${actualColumnNameToScanForDataValues}" for column "${colDef.name}".`);
                return; // Go to next row in _csvDataInstance.forEach
            }

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
    // <<< END MODIFIED >>>

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

/**
 * Creates and displays a custom popup for 'select' and 'multi-select' fields.
 * @param {HTMLTableCellElement} td - The table cell being edited.
 * @param {*} currentValueForPopup - The current value(s) for the cell.
 * @param {Object} colDef - The column definition.
 * @param {number} rowIndex - The row index.
 * @param {string} columnName - The column name.
 */
function createSelectPopup(td, currentValueForPopup, colDef, rowIndex, columnName) {
    if (_activePopup) _activePopup.remove();
    const popup = document.createElement('div');
    _activePopup = popup; _activePopup.td = td;
    popup.className = 'custom-select-popup';
    const rect = td.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.minWidth = `${Math.max(td.offsetWidth, 200)}px`;
    popup.style.zIndex = '1000';

    let allOptions = getOptionsForColumn(colDef, rowIndex); // <<< MODIFIED: Pass rowIndex
    const useSearch = allOptions.length >= 15 || (colDef.type === 'multi-select' && colDef.allowNewTags);

    let currentSelectionsArray = [];
    if (colDef.type === 'multi-select') {
        currentSelectionsArray = Array.isArray(currentValueForPopup) ? [...currentValueForPopup.map(String)] : [];
    } else {
        currentSelectionsArray = currentValueForPopup !== undefined && currentValueForPopup !== null ? [String(currentValueForPopup)] : [''];
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

    window._editorUpdateAndCloseFromPopup = (valueToSet) => {
        _csvDataInstance[rowIndex][columnName] = valueToSet;
        td.innerHTML = getStyledCellDisplay(valueToSet, colDef);
        validateCell(td, valueToSet, colDef);
        if (_activePopup === popup) { popup.remove(); _activePopup = null; }
        window.dispatchEvent(new CustomEvent('editorDataChanged'));
    };

    const rerenderOptionsList = () => {
        const searchTerm = useSearch ? searchInput.value.toLowerCase() : '';
        filterAndSortPopupOptions(optionsList, searchTerm, allOptions, currentSelectionsArray, colDef);
    };

    if (useSearch) {
        searchInput.addEventListener('input', rerenderOptionsList);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (colDef.type === 'multi-select' && colDef.allowNewTags && searchInput.value.trim() !== '') {
                    const newTag = searchInput.value.trim();
                    if (!currentSelectionsArray.includes(newTag)) {
                        currentSelectionsArray.push(newTag);
                    }
                    if (!allOptions.some(opt => opt.value === newTag)) {
                        allOptions.push({ value: newTag, label: newTag });
                        allOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
                    }
                    searchInput.value = '';
                    rerenderOptionsList();
                } else if (colDef.type === 'select') {
                    const firstVisibleOption = optionsList.querySelector('li:not([data-filtered-out="true"])');
                    if (firstVisibleOption) firstVisibleOption.click();
                }
            } else if (e.key === 'Escape') {
                if (_activePopup === popup) { popup.remove(); _activePopup = null; }
                td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef);
                validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);
            }
        });
    }

    rerenderOptionsList();

    if (colDef.type === 'multi-select') {
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply Selections';
        applyBtn.className = 'popup-apply-btn';
        applyBtn.addEventListener('click', () => {
            window._editorUpdateAndCloseFromPopup([...currentSelectionsArray]);
        });
        popup.appendChild(applyBtn);
    }

    document.body.appendChild(popup);
    if (useSearch && searchInput) searchInput.focus();
    else if (optionsList.firstChild) optionsList.firstChild.focus();

    setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
}

/**
 * Filters options by search term, then sorts them, and calls renderPopupOptions.
 * @param {HTMLUListElement} listElement - The <ul> element to populate.
 * @param {string} searchTerm - The search term (already lowercased).
 * @param {Array<Object>} allAvailableOptions - The complete list of {value, label} options.
 * @param {Array<string>} currentSelectedValuesArray - Array of currently selected string values.
 * @param {Object} colDef - The column definition.
 */
function filterAndSortPopupOptions(listElement, searchTerm, allAvailableOptions, currentSelectedValuesArray, colDef) {
    const filteredBySearch = searchTerm
        ? allAvailableOptions.filter(opt => opt.label.toLowerCase().includes(searchTerm))
        : [...allAvailableOptions];

    let optionsToRender;
    if (colDef.type === 'multi-select') {
        const selectedOptions = [];
        const unselectedOptions = [];
        const currentSelectionsSet = new Set(currentSelectedValuesArray.map(String));
        filteredBySearch.forEach(opt => {
            if (currentSelectionsSet.has(String(opt.value))) {
                selectedOptions.push(opt);
            } else {
                unselectedOptions.push(opt);
            }
        });
        selectedOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
        unselectedOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
        optionsToRender = [...selectedOptions, ...unselectedOptions];
    } else {
        optionsToRender = filteredBySearch;
    }
    renderPopupOptions(listElement, optionsToRender, currentSelectedValuesArray, colDef);
}

/**
 * Renders the individual option items (<li>) into the popup's list.
 * @param {HTMLUListElement} listElement - The <ul> element where options will be rendered.
 * @param {Array<Object>} optionsToDisplay - The filtered and sorted list of {value, label} options to display.
 * @param {Array<string>} currentSelectedValuesArrayFromCaller - Array from createSelectPopup scope.
 * @param {Object} colDef - The column definition.
 */
function renderPopupOptions(listElement, optionsToDisplay, currentSelectedValuesArrayFromCaller, colDef) {
    listElement.innerHTML = '';
    const isMulti = colDef.type === 'multi-select';
    const currentSelectionsSet = new Set(currentSelectedValuesArrayFromCaller.map(String));

    if (optionsToDisplay.length === 0 ) {
        const li = document.createElement('li');
        li.textContent = (isMulti && colDef.allowNewTags) ? "Type to add new or filter existing." : "No options match search.";
        li.style.fontStyle = "italic"; li.style.color = "#777";
        listElement.appendChild(li); return;
    }

    optionsToDisplay.forEach(opt => {
        const li = document.createElement('li'); li.tabIndex = 0;
        const valStr = String(opt.value);
        if (isMulti) {
            const cb = document.createElement('input'); cb.type = 'checkbox';
            cb.value = valStr;
            const uniqueId = `popup-opt-${colDef.name.replace(/\W/g, '_')}-${valStr.replace(/\W/g, '_')}-${Math.random().toString(16).slice(2)}`;
            cb.id = uniqueId;
            if (currentSelectionsSet.has(valStr)) cb.checked = true;
            cb.addEventListener('change', () => {
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
                console.log("EDITOR_GRID: renderPopupOptions - Multi-select popup selections changed:", currentSelectedValuesArrayFromCaller);
            });
            const label = document.createElement('label'); label.htmlFor = cb.id;
            label.appendChild(cb); label.appendChild(document.createTextNode(opt.label));
            li.appendChild(label);
            li.addEventListener('click', (e) => { if (e.target !== cb && e.target !== label) cb.click(); });
            li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cb.click(); }});
        } else {
            li.textContent = opt.label; li.dataset.value = valStr;
            if (currentSelectionsSet.has(valStr)) li.classList.add('selected');
            const selectAndClose = () => {
                window._editorUpdateAndCloseFromPopup(opt.value);
            };
            li.addEventListener('click', selectAndClose);
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAndClose(); }});
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
        const td = _activePopup.td;
        const isTargetCellOrChild = td.contains(event.target) || td === event.target;
        if (!isTargetCellOrChild) {
            const rowIndex = parseInt(td.dataset.rowIndex);
            const columnName = td.dataset.columnName;
            const colDef = _editorConfigInstance.columns.find(c => c.name === columnName);
            td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef);
            validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);
            _activePopup.remove();
            _activePopup = null;
        } else {
            if (_activePopup) {
                setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
            }
        }
    } else if (_activePopup) {
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
    _editorConfigInstance.columns.forEach(colDef => {
        if (colDef.type === 'checkbox') {
            newRowObject[colDef.name] = _editorConfigInstance.csvOutputOptions?.booleanFalseValue || "FALSE";
        } else if (colDef.type === 'multi-select') {
            newRowObject[colDef.name] = [];
        } else {
            newRowObject[colDef.name] = '';
        }
    });
    newRowObject._originalIndex = -1;
    const pkColName = _editorConfigInstance?.changeTrackingPrimaryKeyColumn;
    if (pkColName && newRowObject.hasOwnProperty(pkColName)) {
        newRowObject._originalPkValue = newRowObject[pkColName];
    } else {
        newRowObject._originalPkValue = undefined;
    }

    const editorCfg = _editorConfigInstance;
    const partitionConfig = editorCfg?.editorDisplaySettings?.partitionBy;
    let insertAtIndex = _csvDataInstance.length;

    if (partitionConfig?.enabled && partitionConfig?.filter?.conditions?.length > 0) {
        const effectiveHeadersForNewRowCheck = editorCfg.columns.map(c => c.name);
        const configForNewRowCheck = {
            generalSettings: {
                trueValues: (_viewerConfigInstance?.generalSettings?.trueValues) || ["true", "yes", "1", "y", "x", "on", "âœ“"]
            },
            csvHeaders: effectiveHeadersForNewRowCheck
        };
        const firstPartitionedItemIndex = _csvDataInstance.findIndex(row => {
            const filterGroup = partitionConfig.filter;
            if (filterGroup.logic && filterGroup.logic.toUpperCase() === 'OR') {
                return filterGroup.conditions.some(singleCondition => checkCondition(row, singleCondition, configForNewRowCheck));
            } else {
                return filterGroup.conditions.every(singleCondition => checkCondition(row, singleCondition, configForNewRowCheck));
            }
        });
        if (firstPartitionedItemIndex !== -1) {
            insertAtIndex = firstPartitionedItemIndex;
        }
    }

    _csvDataInstance.splice(insertAtIndex, 0, newRowObject);
    console.log(`EDITOR_GRID: addNewRow - New row added at index ${insertAtIndex}.`);
    renderGridData();

    const { editorGridTbody } = editorDomElements;
    if (editorGridTbody && editorGridTbody.rows[insertAtIndex]) {
        editorGridTbody.rows[insertAtIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const firstEditableCell = editorGridTbody.rows[insertAtIndex].querySelector('td:not(.cell-readonly)');
        if (firstEditableCell) {
            handleCellClickToEdit({ target: firstEditableCell });
        }
    }
    window.dispatchEvent(new CustomEvent('editorDataChanged'));
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
            _csvDataInstance.splice(rowIndex, 1);
            console.log(`EDITOR_GRID: handleDeleteRowClick - Row ${rowIndex} deleted.`);
            renderGridData();
            window.dispatchEvent(new CustomEvent('editorDataChanged'));
        } else {
            console.error(`EDITOR_GRID: handleDeleteRowClick - Invalid rowIndex ${rowIndex} or _csvDataInstance issue.`);
        }
    }
}