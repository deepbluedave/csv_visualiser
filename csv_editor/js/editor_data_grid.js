// --- START OF FILE csv_editor/js/editor_data_grid.js ---

// Module-level state variables
let _csvDataInstance = [];
let _editorConfigInstance = null;
let _viewerConfigInstance = null;
let _activePopup = null;

function initDataGridReferences(csvDataArrayRef, editorConfigRef, viewerConfigRef) {
    _csvDataInstance = csvDataArrayRef;
    _editorConfigInstance = editorConfigRef;
    _viewerConfigInstance = viewerConfigRef;
    console.log("EDITOR_GRID: initDataGridReferences - DataGrid's local references updated.");
}

function renderGridStructure(columnDefinitions) {
    const { editorGridThead } = editorDomElements;
    if (!editorGridThead) { console.error("EDITOR_GRID: renderGridStructure - thead not found."); return; }
    editorGridThead.innerHTML = '';
    if (!columnDefinitions || columnDefinitions.length === 0) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = "Load Editor Config to define columns.";
        th.colSpan = 10;
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
        th.title = `CSV Header: ${colDef.name}`;
        const orientation = colDef.orientation || 'horizontal';
        th.classList.add(`header-${orientation}`);
        if (colDef.columnWidth) {
            th.style.width = colDef.columnWidth;
        } else {
            th.style.width = (orientation === 'vertical') ? '50px' : '150px';
        }
        if (index === 0) { th.classList.add('sticky-col', 'first-col'); }
        tr.appendChild(th);
    });
    const thActions = document.createElement('th');
    thActions.textContent = "Actions";
    thActions.style.width = "80px";
    tr.appendChild(thActions);
    editorGridThead.appendChild(tr);
    console.log("EDITOR_GRID: renderGridStructure - Grid structure (headers) rendered.");
}

function clearGridContent() {
    const { editorGridTbody } = editorDomElements;
    if (editorGridTbody) { editorGridTbody.innerHTML = ''; }
    if (_activePopup) { _activePopup.remove(); _activePopup = null; }
    console.log("EDITOR_GRID: clearGridContent - Grid content (tbody) and active popups cleared.");
}

function clearGridStructure() {
    const { editorGridThead } = editorDomElements;
    if (editorGridThead) { editorGridThead.innerHTML = ''; }
    clearGridContent();
    console.log("EDITOR_GRID: clearGridStructure - Entire grid structure cleared.");
}

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
            if (colDef.type === 'select' && value === '') isEmpty = true;
        }
        if (isEmpty) {
            isValid = false;
            td.title = `${colDef.label || colDef.name} is required.`;
        }
    }
    if (isValid && colDef.validationRegex && String(value).trim() !== '' &&
        !['select', 'multi-select', 'checkbox', 'date', 'number'].includes(colDef.type)) {
        try {
            if (!new RegExp(colDef.validationRegex).test(String(value))) {
                isValid = false;
                td.title = `${colDef.label || colDef.name} does not match pattern.`;
            }
        } catch (e) {
            console.warn(`Invalid regex for column "${colDef.name}": ${colDef.validationRegex}`, e);
        }
    }
    if (!isValid) { td.classList.add('cell-error'); }
    else if (td.title !== originalTitle) { td.title = originalTitle; }
    return isValid;
}

/**
 * Gets the styled HTML display for a cell value based on viewer configuration and column definition.
 * Handles lookups for relational columns, respecting the 'styleAs' property from viewer config.
 * @param {*} cellValue - The value of the cell.
 * @param {Object} colDef - The column definition object.
 * @returns {string} HTML string for the cell's content.
 */
function getStyledCellDisplay(cellValue, colDef) {
    const viewerCfg = _viewerConfigInstance || { generalSettings: {}, indicatorStyles: {} };
    const derivationConfig = colDef.deriveOptionsFrom;

    // --- Logic for relational "lookup" display ---
    if (derivationConfig && derivationConfig.column && derivationConfig.labelColumn) {
        // This column's value is an ID (or array of IDs) that needs to be looked up.
        const idsToLookup = Array.isArray(cellValue) ? cellValue : [cellValue];
        const displayValues = [];

        idsToLookup.forEach(id => {
            if (id === null || typeof id === 'undefined' || String(id).trim() === '') return;
            
            const linkedItem = _csvDataInstance.find(row => String(row[derivationConfig.column]) === String(id));
            
            if (linkedItem) {
                const displayLabel = linkedItem[derivationConfig.labelColumn] || `(Label missing for ${id})`;
                
                // --- CORRECTED LOGIC: Check viewer config for how to style the lookup ---
                const viewerStyleColName = colDef.viewerStyleColumnName || colDef.name;
                const styleConfig = viewerCfg.indicatorStyles?.[viewerStyleColName];

                if (styleConfig && styleConfig.type === 'lookup' && styleConfig.styleAs === 'tag') {
                    // If explicitly styled as a tag in the viewer config
                    const tagStyle = styleConfig.defaultStyle || { bgColor: '#e9ecef', textColor: '#495057' };
                    displayValues.push(`<span class="editor-cell-mini-tag" style="background-color:${tagStyle.bgColor}; color:${tagStyle.textColor}; border-color:${tagStyle.borderColor || tagStyle.bgColor};" title="ID: ${id}">${displayLabel}</span>`);
                } else {
                    // Default to plain text for lookups
                    displayValues.push(`<span class="cell-text" title="ID: ${id}">${displayLabel}</span>`);
                }
                // --- END CORRECTION ---

            } else {
                // The stored ID doesn't exist in the data (dangling reference)
                displayValues.push(`<span class="editor-cell-mini-tag cell-error" title="ID not found: ${id}">${id} (Not Found)</span>`);
            }
        });

        // Join multiple parent tags/texts with a space or other separator
        return displayValues.join(' ');
    }

    // --- Fallback to existing indicator/styling logic for all other non-relational columns ---
    const viewerStyleColName = colDef.viewerStyleColumnName || colDef.name;
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
                    if (valStr === '' && indicatorStyleConf.valueMap.hasOwnProperty('')) mapping = indicatorStyleConf.valueMap[''];
                    else if (isTruthy(cellValue, viewerCfg) && indicatorStyleConf.valueMap.hasOwnProperty('true')) mapping = indicatorStyleConf.valueMap['true'];
                    else if (!isTruthy(cellValue, viewerCfg) && indicatorStyleConf.valueMap.hasOwnProperty('false')) mapping = indicatorStyleConf.valueMap['false'];
                }
                if (mapping === undefined) mapping = indicatorStyleConf.valueMap['default'];
                if (mapping && mapping.value !== undefined) iconToShow = mapping.value;
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

function renderGridData() {
    const { editorGridTbody } = editorDomElements;
    if (!editorGridTbody) { console.error("EDITOR_GRID: renderGridData - tbody not found."); return; }
    clearGridContent();
    if (!_editorConfigInstance || !_editorConfigInstance.columns || _editorConfigInstance.columns.length === 0) {
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
    const isPartitionActive = partitionConfigSettings?.enabled && partitionConfigSettings?.filter?.conditions?.length > 0;
    let previousItemMetPartitionCriteria = null;
    _csvDataInstance.forEach((row, rowIndex) => {
        const tr = editorGridTbody.insertRow();
        tr.dataset.rowIndex = rowIndex;
        if (isPartitionActive) {
            const effectiveHeadersForSeparatorCheck = editorCfg.columns.map(c => c.name);
            const configForSeparatorCheck = {
                generalSettings: { trueValues: viewerCfg?.generalSettings?.trueValues || [] },
                csvHeaders: effectiveHeadersForSeparatorCheck
            };
            let currentItemMeetsPartitionCriteria = false;
            try {
                const filterGroup = partitionConfigSettings.filter;
                if (filterGroup.logic && filterGroup.conditions && filterGroup.conditions.length > 0) {
                    if (filterGroup.logic.toUpperCase() === 'OR') {
                        currentItemMeetsPartitionCriteria = filterGroup.conditions.some(c => checkCondition(row, c, configForSeparatorCheck));
                    } else {
                        currentItemMeetsPartitionCriteria = filterGroup.conditions.every(c => checkCondition(row, c, configForSeparatorCheck));
                    }
                }
            } catch (e) { console.error("Error in checkCondition (for separator):", e); }
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
            if (cellValue === undefined) cellValue = (colDef.type === 'multi-select' ? [] : '');
            const styleConfForCol = viewerCfg?.indicatorStyles?.[colDef.viewerStyleColumnName || colDef.name];
            if (colDef.type === 'checkbox' || colDef.type === 'multi-select' || (styleConfForCol && styleConfForCol.type === 'icon') || (colDef.type === 'select' && styleConfForCol && styleConfForCol.type === 'tag') || (viewerCfg?.generalSettings?.linkColumns?.includes(colDef.name) && !(styleConfForCol && (styleConfForCol.type === 'tag')))) {
                td.classList.add('cell-align-center');
            }
            if (colIndex === 0) td.classList.add('sticky-col', 'first-col');
            if (colDef.type === 'multi-select') td.classList.add('cell-type-multi-select');
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

function handleCellClickToEdit(event) {
    const td = event.target.closest('td');
    if (!td || td.classList.contains('cell-readonly') || td.querySelector('input, select, textarea, .custom-select-popup')) return;
    const columnName = td.dataset.columnName;
    const rowIndex = parseInt(td.dataset.rowIndex, 10);
    const colDef = _editorConfigInstance.columns.find(c => c.name === columnName);
    if (!colDef) return;
    if (_activePopup && _activePopup.td !== td) { _activePopup.remove(); _activePopup = null; }
    let cellValue = _csvDataInstance[rowIndex][columnName];
    if (colDef.type === 'multi-select' && !Array.isArray(cellValue)) {
        cellValue = (typeof cellValue === 'string' && cellValue.trim() !== '') ? cellValue.split(',').map(s => s.trim()).filter(s => s) : [];
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
            if (colDef.displayAsSingleLine) {
                inputElement.rows = 1;
                inputElement.style.resize = 'none';
                inputElement.style.overflow = 'hidden';
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
        if (saveChange) handleCellChange({ target: inputElement });
        const currentValInModel = _csvDataInstance[rowIndex][columnName];
        td.innerHTML = getStyledCellDisplay(currentValInModel, colDef);
        validateCell(td, currentValInModel, colDef);
        if (saveChange) {
            const refreshNeeded = _editorConfigInstance?.columns?.some(cfg =>
                cfg.deriveOptionsFrom && cfg.deriveOptionsFrom.labelColumn === columnName);
            if (refreshNeeded) {
                renderGridData();
                if (typeof applyDisplayFilter === 'function') {
                    applyDisplayFilter();
                }
            }
            window.dispatchEvent(new CustomEvent('editorDataChanged'));
        }
    };
    inputElement.addEventListener('blur', () => finishEdit(true));
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && colDef.type !== 'textarea') { e.preventDefault(); inputElement.blur(); }
        else if (e.key === 'Escape') { finishEdit(false); }
    });
    td.appendChild(inputElement);
    if (typeof inputElement.focus === 'function') {
        inputElement.focus();
        if (inputElement.select && colDef.type !== 'textarea') inputElement.select();
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
        }
    }
}

function getOptionsForColumn(colDef, rowIndexBeingEdited = -1) {
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

    if (Array.isArray(colDef.options)) {
        colDef.options.forEach(opt => {
            if (typeof opt === 'string') addOption(opt, opt);
            else if (opt && typeof opt.value !== 'undefined') addOption(opt.value, opt.label || opt.value);
        });
    }

    if (colDef.optionsSource === 'viewerConfigValueMap' && _viewerConfigInstance?.indicatorStyles) {
        const styleColName = colDef.viewerStyleColumnName || colDef.name;
        const styleConf = _viewerConfigInstance.indicatorStyles[styleColName];
        if (styleConf?.valueMap) {
            Object.keys(styleConf.valueMap).filter(key => key !== 'default')
                .forEach(key => addOption(key, styleConf.valueMap[key].text || key));
        }
    }

    const derivationConfig = colDef.deriveOptionsFrom;
    if (derivationConfig && derivationConfig.column && derivationConfig.labelColumn) {
        let configForFilterCheck = null;
        if (colDef.sourceColumnFilter?.conditions?.length > 0) {
            const headersForCheck = _editorConfigInstance.columns.map(c => c.name);
            configForFilterCheck = {
                csvHeaders: headersForCheck,
                generalSettings: { trueValues: _viewerConfigInstance?.generalSettings?.trueValues || ["true", "yes", "1"] }
            };
        }
        _csvDataInstance.forEach((sourceRow, currentRowIndex) => {
            const optionValue = sourceRow[derivationConfig.column];
            const optionLabel = sourceRow[derivationConfig.labelColumn];
            if (optionValue === undefined || optionValue === null || optionValue === '' || optionLabel === undefined) return;
            if (rowIndexBeingEdited !== -1 && currentRowIndex === rowIndexBeingEdited) return;

            // --- CORRECTED LOGIC: Use the new helper function ---
            if (configForFilterCheck) {
                // doesRowMatchFilterGroup is now in shared_utils.js
                if (!doesRowMatchFilterGroup(sourceRow, colDef.sourceColumnFilter, configForFilterCheck)) {
                    return; // Skip this row as it's filtered out
                }
            }
            // --- END CORRECTION ---

            addOption(optionValue, optionLabel);
        });
    } else {
        _csvDataInstance.forEach(row => {
            const cellData = row[colDef.name];
            if (cellData !== undefined && cellData !== null) {
                if (Array.isArray(cellData)) {
                    cellData.forEach(item => addOption(String(item), String(item)));
                } else if (String(cellData).trim() !== '' || String(cellData) === '') {
                    addOption(String(cellData), String(cellData));
                }
            }
        });
    }

    const finalOptions = [];
    optionsMap.forEach((label, value) => {
        finalOptions.push({ value, label });
    });
    finalOptions.sort((a, b) => {
        if (a.label === '(No Selection)') return -1;
        if (b.label === '(No Selection)') return 1;
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });
    if (colDef.type === 'select' && !colDef.required) {
        if (!finalOptions.some(opt => opt.value === '')) {
            finalOptions.unshift({ value: '', label: '(No Selection)' });
        }
    }
    return finalOptions;
}

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
    let allOptions = getOptionsForColumn(colDef, rowIndex);
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
                    if (!currentSelectionsArray.includes(newTag)) currentSelectionsArray.push(newTag);
                    if (!allOptions.some(opt => opt.value === newTag)) {
                        allOptions.push({ value: newTag, label: newTag });
                        allOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
                    }
                    searchInput.value = '';
                    rerenderOptionsList();
                } else if (colDef.type === 'select') {
                    const firstVisibleOption = optionsList.querySelector('li');
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
        applyBtn.addEventListener('click', () => { window._editorUpdateAndCloseFromPopup([...currentSelectionsArray]); });
        popup.appendChild(applyBtn);
    }
    document.body.appendChild(popup);
    if (useSearch && searchInput) searchInput.focus();
    else if (optionsList.firstChild) optionsList.firstChild.focus();
    setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
}

function filterAndSortPopupOptions(listElement, searchTerm, allAvailableOptions, currentSelectedValuesArray, colDef) {
    const filteredBySearch = searchTerm ? allAvailableOptions.filter(opt => opt.label.toLowerCase().includes(searchTerm)) : [...allAvailableOptions];
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
                    if (!currentSelectedValuesArrayFromCaller.includes(valStr)) currentSelectedValuesArrayFromCaller.push(valStr);
                } else {
                    const index = currentSelectedValuesArrayFromCaller.indexOf(valStr);
                    if (index > -1) currentSelectedValuesArrayFromCaller.splice(index, 1);
                }
            });
            const label = document.createElement('label'); label.htmlFor = cb.id;
            label.appendChild(cb); label.appendChild(document.createTextNode(opt.label));
            li.appendChild(label);
            li.addEventListener('click', (e) => { if (e.target !== cb && e.target !== label) cb.click(); });
            li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cb.click(); }});
        } else {
            li.textContent = opt.label; li.dataset.value = valStr;
            if (currentSelectionsSet.has(valStr)) li.classList.add('selected');
            const selectAndClose = () => { window._editorUpdateAndCloseFromPopup(opt.value); };
            li.addEventListener('click', selectAndClose);
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAndClose(); }});
        }
        listElement.appendChild(li);
    });
}

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

function addNewRow() {
    if (!_editorConfigInstance || !_editorConfigInstance.columns) return false;
    if (!_csvDataInstance) return false;
    const newRowObject = {};
    _editorConfigInstance.columns.forEach(colDef => {
        if (colDef.name === 'ItemID') return;
        if (colDef.type === 'checkbox') newRowObject[colDef.name] = _editorConfigInstance.csvOutputOptions?.booleanFalseValue || "FALSE";
        else if (colDef.type === 'multi-select') newRowObject[colDef.name] = [];
        else newRowObject[colDef.name] = '';
    });
    const idColumnName = "ItemID";
    if (_editorConfigInstance.columns.some(c => c.name === idColumnName)) {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 5);
        newRowObject[idColumnName] = `item_${timestamp}_${randomSuffix}`;
    } else { console.warn(`ID column "${idColumnName}" not found in config.`); }
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
            generalSettings: { trueValues: (_viewerConfigInstance?.generalSettings?.trueValues) || [] },
            csvHeaders: effectiveHeadersForNewRowCheck
        };
        const firstPartitionedItemIndex = _csvDataInstance.findIndex(row => {
            const filterGroup = partitionConfig.filter;
            if (filterGroup.logic && filterGroup.logic.toUpperCase() === 'OR') {
                return filterGroup.conditions.some(c => checkCondition(row, c, configForNewRowCheck));
            } else {
                return filterGroup.conditions.every(c => checkCondition(row, c, configForNewRowCheck));
            }
        });
        if (firstPartitionedItemIndex !== -1) insertAtIndex = firstPartitionedItemIndex;
    }
    _csvDataInstance.splice(insertAtIndex, 0, newRowObject);
    renderGridData();
    const { editorGridTbody } = editorDomElements;
    if (editorGridTbody && editorGridTbody.rows[insertAtIndex]) {
        editorGridTbody.rows[insertAtIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const firstEditableCell = editorGridTbody.rows[insertAtIndex].querySelector('td:not(.cell-readonly)');
        if (firstEditableCell) handleCellClickToEdit({ target: firstEditableCell });
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
            renderGridData();
            window.dispatchEvent(new CustomEvent('editorDataChanged'));
        }
    }
}

// --- END OF FILE csv_editor/js/editor_data_grid.js ---