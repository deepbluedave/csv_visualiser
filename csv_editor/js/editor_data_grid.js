// csv_editor/js/editor_data_grid.js

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
        if (index === 0) { // Apply sticky to the first column header
            th.classList.add('sticky-col', 'first-col');
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
            isEmpty = value === null || value === undefined || String(value).trim() === '';
            if (colDef.type === 'select' && value === '') {
                isEmpty = true;
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
        } else if (!td.title && colDef.name) {
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
                return formatted || (cellValue === '' ? '' : String(cellValue ?? ''));
            }
        }
    }

    if (isLinkColInViewer && colDef.type !== 'checkbox') {
        const urlValueStr = String(cellValue ?? '');
        if (urlValueStr.trim() !== '') {
            // For editor, show icon AND text to make it clear it's a link and what the value is
            return `<span class="cell-url-display-span" title="${urlValueStr}">🔗${urlValueStr}</span>`;
        } else { return ''; }
    }

    if (colDef.type === 'multi-select' && Array.isArray(cellValue)) {
        if (cellValue.length === 0) return '';
        return cellValue.map(v => `<span class="editor-cell-mini-tag">${String(v ?? '')}</span>`).join(' ');
    }
    if (colDef.type === 'checkbox') { return ''; }
    if (colDef.type === 'select' && cellValue === '') { return '(No Selection)'; }

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

        columnDefinitions.forEach((colDef, index) => {
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

            if (index === 0) { // Apply sticky to the first data cell in each row
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
        // No logging change here as per revised plan
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
            handleCellChange({ target: inputElement }); // Updates _csvDataInstance
        }
        const currentValInModel = _csvDataInstance[rowIndex][columnName];
        td.innerHTML = getStyledCellDisplay(currentValInModel, colDef);
        validateCell(td, currentValInModel, colDef);
        if (saveChange) window.dispatchEvent(new CustomEvent('editorDataChanged'));
    };
    inputElement.addEventListener('blur', () => finishEdit(true));
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); inputElement.blur(); }
        else if (e.key === 'Escape') { finishEdit(false); }
    });

    td.appendChild(inputElement);
    if (typeof inputElement.focus === 'function') {
        inputElement.focus();
        if (inputElement.select) inputElement.select();
    }
}

function handleCellChange(event) { // This function now ONLY updates _csvDataInstance
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
            _csvDataInstance[rowIndex][columnName] = newValue; // Update the live data model
            console.log(`Data updated in _csvDataInstance: Row ${rowIndex}, Col "${columnName}" =`, newValue);
        }
    } else {
        console.error("Error updating cell: Invalid rowIndex, columnName, or data reference.");
    }
}

function getOptionsForColumn(colDef) {
    // This function remains largely the same, its primary role is to gather ALL possible options.
    // The sorting of selected items to the top will happen just before rendering the popup list.
    const optionsMap = new Map();
    const addOption = (value, label) => {
        const valStr = String(value ?? '');
        if (valStr.trim() === '' && value !== '') return; // Don't add if value is effectively empty but not literally ''
        const mapLabel = (label === '' && valStr !== '') ? `(Value: ${valStr})` : (label || valStr);
        if (!optionsMap.has(valStr)) {
            optionsMap.set(valStr, mapLabel);
        } else if (label && label !== mapLabel && optionsMap.get(valStr) === valStr) {
            // Prefer a more descriptive label if one becomes available
            optionsMap.set(valStr, label);
        }
    };

    // 1. Explicit options from editorConfig
    if (Array.isArray(colDef.options) && colDef.options.length > 0) {
        colDef.options.forEach(opt => {
            if (typeof opt === 'string') addOption(opt, opt);
            else if (opt && typeof opt.value !== 'undefined') addOption(opt.value, opt.label || opt.value);
        });
    }

    // 2. Options from viewerConfigValueMap
    if (colDef.optionsSource === 'viewerConfigValueMap' && _viewerConfigInstance?.indicatorStyles) {
        const styleColName = colDef.viewerStyleColumnName || colDef.name;
        const styleConf = _viewerConfigInstance.indicatorStyles[styleColName];
        const valueMap = styleConf?.valueMap;
        if (valueMap) {
            Object.keys(valueMap).filter(key => key !== 'default') // Exclude 'default' key
                .forEach(key => addOption(key, valueMap[key].text || key));
        }
    }

    // 3. Options from existing CSV data for this column
    if (_csvDataInstance && Array.isArray(_csvDataInstance)) {
        _csvDataInstance.forEach(row => {
            const cellData = row[colDef.name];
            if (cellData !== undefined && cellData !== null) {
                if (Array.isArray(cellData)) { // If it's already an array (multi-select data)
                    cellData.forEach(item => addOption(String(item), String(item)));
                } else { // If it's a single value (can happen for select, or unparsed multi-select string)
                    const valStr = String(cellData);
                    if (valStr.trim() !== '' || valStr === '') addOption(valStr, valStr); // Add if not effectively empty or literally ''
                }
            }
        });
    }

    const finalOptions = [];
    optionsMap.forEach((label, value) => {
        const displayLabel = label.startsWith('(Value:') ? value : label;
        finalOptions.push({ value, label: displayLabel });
    });

    // Initial alpha sort of ALL gathered options. Specific selected-first sort happens later.
    finalOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

    if (colDef.type === 'select' && !colDef.required) {
        const hasExplicitBlank = finalOptions.some(opt => opt.value === '');
        if (!hasExplicitBlank) {
            finalOptions.unshift({ value: '', label: '(No Selection)' });
        } else { // Ensure the blank option has the correct label
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
    _activePopup = popup; _activePopup.td = td;
    popup.className = 'custom-select-popup';
    const rect = td.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.minWidth = `${Math.max(td.offsetWidth, 200)}px`;
    popup.style.zIndex = '1000';

    let allOptions = getOptionsForColumn(colDef);
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
        searchInput.placeholder = colDef.type === 'multi-select' && colDef.allowNewTags ? 'Search or Add New & Enter...' : 'Search options...';
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
        // Pass allOptions, the current selections (for highlighting), and the column definition
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
 * Filters options based on search term and then sorts them with selected items at the top.
 * Calls renderPopupOptions to update the UI.
 * @param {HTMLUListElement} listElement The <ul> element to populate.
 * @param {string} searchTerm The search term (already lowercased).
 * @param {Array<object>} allAvailableOptions The complete list of options for the column.
 * @param {Array<string>} currentSelectedValuesArray The array of currently selected string values.
 * @param {object} colDef The column definition object.
 */
function filterAndSortPopupOptions(listElement, searchTerm, allAvailableOptions, currentSelectedValuesArray, colDef) {
    // 1. Filter by search term (if any)
    const filteredBySearch = searchTerm
        ? allAvailableOptions.filter(opt => opt.label.toLowerCase().includes(searchTerm))
        : [...allAvailableOptions]; // Use a copy if no search term

    let optionsToRender;

    if (colDef.type === 'multi-select') {
        // 2. For multi-select, partition into selected and unselected
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

        // 3. Sort each partition alphabetically (allAvailableOptions was already alpha sorted)
        // The filtering might change order, so re-sort is good.
        selectedOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
        unselectedOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

        // 4. Combine: selected on top
        optionsToRender = [...selectedOptions, ...unselectedOptions];
    } else {
        // For single 'select', just use the search-filtered (and pre-alpha-sorted) list
        optionsToRender = filteredBySearch; 
        // The "(No Selection)" option for non-required single-selects should already be at the top due to getOptionsForColumn.
    }

    // 5. Render the final list
    renderPopupOptions(listElement, optionsToRender, currentSelectedValuesArray, colDef);
}

// renderPopupOptions needs to be aware that currentSelectedValuesArray IS THE SOURCE OF TRUTH for "checked"
// for multi-select, and "selected" class for single-select.
function renderPopupOptions(listElement, optionsToDisplay, currentSelectedValuesArrayFromCaller, colDef) { // Renamed arg for clarity
    listElement.innerHTML = '';
    const isMulti = colDef.type === 'multi-select';
    // Use the passed currentSelectedValuesArrayFromCaller for checking initial state
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
        li.tabIndex = 0; // Make it focusable
        const valStr = String(opt.value);

        if (isMulti) {
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = valStr;
            const uniqueId = `popup-opt-${colDef.name.replace(/\W/g, '_')}-${valStr.replace(/\W/g, '_')}-${Math.random().toString(16).slice(2)}`;
            cb.id = uniqueId;

            if (currentSelectionsSet.has(valStr)) {
                cb.checked = true;
            }

            cb.addEventListener('change', () => {
                // --- CORRECTED ACCESS ---
                // currentSelectedValuesArrayFromCaller IS the array from createSelectPopup's scope
                // that we need to modify.
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
                console.log("Multi-select popup selections changed (direct array mod):", currentSelectedValuesArrayFromCaller);
                // --- END CORRECTION ---
            });

            const label = document.createElement('label');
            label.htmlFor = cb.id;
            label.appendChild(cb);
            label.appendChild(document.createTextNode(opt.label));
            li.appendChild(label);
            li.addEventListener('click', (e) => { if (e.target !== cb && e.target !== label) { cb.click(); } });
            li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cb.click(); } });

        } else { // Single 'select'
            li.textContent = opt.label;
            li.dataset.value = valStr;
            if (currentSelectionsSet.has(valStr)) {
                li.classList.add('selected');
            }
            const selectAndClose = () => {
                window._editorUpdateAndCloseFromPopup(opt.value);
            };
            li.addEventListener('click', selectAndClose);
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAndClose(); } });
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
    // --- MODIFIED: Add _originalIndex and _originalPkValue for new rows ---
    newRow._originalIndex = -1; // Mark as a new row, not present in initialCsvData
    const pkColName = _editorConfigInstance?.changeTrackingPrimaryKeyColumn;
    if (pkColName && newRow.hasOwnProperty(pkColName)) {
        newRow._originalPkValue = newRow[pkColName]; // Initially, original PK is same as current for new row
    } else {
        newRow._originalPkValue = undefined;
    }
    // --- END MODIFICATION ---

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
            // No logging change here as per revised plan
            _csvDataInstance.splice(rowIndex, 1); // Just remove from live data
            console.log(`Row ${rowIndex} deleted from _csvDataInstance.`);
            renderGridData();
            window.dispatchEvent(new CustomEvent('editorDataChanged'));
        }
    }
}
// --- End of file editor_data_grid.js ---