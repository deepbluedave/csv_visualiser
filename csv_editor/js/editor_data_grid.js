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
        th.colSpan = 10;
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
    thActions.style.width = "80px"; // Fixed width for actions
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
        }
        if (isEmpty) {
            isValid = false;
            td.title = `${colDef.label} is required.`;
        }
    }

    if (isValid && colDef.validationRegex && String(value).trim() !== '' && !['select', 'multi-select', 'checkbox'].includes(colDef.type)) {
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
        // Only reset title if it was an error message before
        if (td.title.startsWith(colDef.label) && (td.title.includes("is required") || td.title.includes("does not match pattern"))) {
            td.title = originalTitle;
        } else if (!td.title) { // If title was empty, set it
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
                return formatTag(cellValue, viewerCfg, viewerStyleColName, indicatorStyleConf.titlePrefix) || String(cellValue ?? '');
            }
        }
    }

    if (isLinkColInViewer && colDef.type !== 'checkbox') { // Don't treat styled checkboxes as generic links
        const urlValueStr = String(cellValue ?? '');
        if (urlValueStr.trim() !== '') {
            return `<span class="editor-cell-icon" title="Link: ${urlValueStr}">🔗</span> <span class="cell-url-display-span" title="${urlValueStr}">${urlValueStr}</span>`;
        } else { return ''; }
    }

    if (colDef.type === 'multi-select' && Array.isArray(cellValue)) {
        if (cellValue.length === 0) return '';
        return cellValue.map(v => `<span class="editor-cell-mini-tag">${String(v ?? '')}</span>`).join(' ');
    }
    if (colDef.type === 'checkbox') { return ''; }
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

            // Apply alignment class based on content/type
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
     // Ensure cellValue is an array for multi-select if it's not already
    if (colDef.type === 'multi-select' && !Array.isArray(cellValue)) {
        if (typeof cellValue === 'string' && cellValue.trim() !== '') {
            cellValue = cellValue.split(',').map(s => s.trim()).filter(s => s);
        } else {
            cellValue = [];
        }
        _csvDataInstance[rowIndex][columnName] = cellValue; // Update model to array type
    }


    td.innerHTML = ''; // Clear current display content

    let inputElement;
    if (colDef.type === 'checkbox') {
        const isCurrentlyTrue = isTruthy(cellValue, _viewerConfigInstance || { generalSettings: {} });
        const trueVal = _editorConfigInstance.csvOutputOptions?.booleanTrueValue || "TRUE";
        const falseVal = _editorConfigInstance.csvOutputOptions?.booleanFalseValue || "FALSE";
        _csvDataInstance[rowIndex][columnName] = isCurrentlyTrue ? falseVal : trueVal;
        td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef);
        validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);
        console.log(`Checkbox Toggled: Row ${rowIndex}, Col "${columnName}" = "${_csvDataInstance[rowIndex][columnName]}"`);
        window.dispatchEvent(new CustomEvent('editorDataChanged')); // Notify app of data change
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
            inputElement.type = colDef.type === 'url' ? 'url' : 'text'; // Use 'url' type if specified
            inputElement.value = String(cellValue ?? '');
            break;
    }

    inputElement.dataset.rowIndex = rowIndex; inputElement.dataset.columnName = columnName;
    const finishEdit = () => {
        handleCellChange({target: inputElement}); // Save current value
        const currentValInModel = _csvDataInstance[rowIndex][columnName];
        td.innerHTML = getStyledCellDisplay(currentValInModel, colDef);
        validateCell(td, currentValInModel, colDef);
        window.dispatchEvent(new CustomEvent('editorDataChanged'));
    };
    inputElement.addEventListener('blur', finishEdit);
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); inputElement.blur(); }
        else if (e.key === 'Escape') {
            const originalValue = _csvDataInstance[rowIndex][columnName]; // Re-fetch, as it might have changed if blur also fired
            td.innerHTML = getStyledCellDisplay(originalValue, colDef);
            validateCell(td, originalValue, colDef); // Validate original
        }
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
    // Checkbox is handled by its direct toggle in handleCellClickToEdit
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

/**
 * Gathers all unique options for a column.
 * Combines options from editorConfig, viewerConfig's valueMap (if applicable),
 * AND all unique existing data values from the current CSV data for that column.
 * For 'select' type columns that are NOT required, a blank option is prepended.
 * @param {object} colDef The column definition from editorConfig.
 * @returns {Array<object>} An array of option objects like {value: string, label: string}, sorted by label.
 */
function getOptionsForColumn(colDef) {
    const optionsMap = new Map();

    const addOption = (value, label) => {
        const valStr = String(value ?? '');
        // Allow explicitly adding an empty string value if defined in configs,
        // but don't automatically pick up empty strings from data as distinct options unless desired.
        if (valStr.trim() === '' && value !== '') return; // Avoid adding trimmed empty strings unless original was empty
        
        // If label is explicitly empty for a non-empty value, use a placeholder for the label in the map.
        // The actual display will handle empty labels appropriately.
        const mapLabel = (label === '' && valStr !== '') ? `(Empty Label for: ${valStr})` : (label || valStr);

        if (!optionsMap.has(valStr)) {
            optionsMap.set(valStr, mapLabel);
        } else if (label && label !== mapLabel && optionsMap.get(valStr) === valStr) {
            // If an explicit label comes later (e.g. from config after data) and current is just value, update label
            optionsMap.set(valStr, label);
        }
    };

    // 1. Options from editor_config.js (colDef.options)
    if (Array.isArray(colDef.options) && colDef.options.length > 0) {
        colDef.options.forEach(opt => {
            if (typeof opt === 'string') {
                addOption(opt, opt);
            } else if (opt && typeof opt.value !== 'undefined') {
                addOption(opt.value, opt.label || opt.value);
            }
        });
    }

    // 2. Options from viewer_config.js valueMap
    if (colDef.optionsSource === 'viewerConfigValueMap' && _viewerConfigInstance?.indicatorStyles) {
        const styleColName = colDef.viewerStyleColumnName || colDef.name;
        const styleConf = _viewerConfigInstance.indicatorStyles[styleColName];
        const valueMap = styleConf?.valueMap;
        if (valueMap) {
            Object.keys(valueMap)
                .filter(key => key !== 'default')
                .forEach(key => {
                    const label = valueMap[key].text || key;
                    addOption(key, label);
                });
        }
    }

    // 3. Options from existing data
    if (_csvDataInstance && Array.isArray(_csvDataInstance)) {
        _csvDataInstance.forEach(row => {
            const cellData = row[colDef.name];
            if (cellData !== undefined && cellData !== null) {
                if (Array.isArray(cellData)) {
                    cellData.forEach(item => addOption(String(item), String(item)));
                } else if (typeof cellData === 'string' && colDef.type === 'multi-select' && cellData.includes(',')){
                    cellData.split(',').map(s => s.trim()).filter(s => s).forEach(item => addOption(item, item));
                } else { // For single select or non-array multi-select, add if not just whitespace
                     const valStr = String(cellData);
                     if (valStr.trim() !== '' || valStr === '') { // Add if it's an intentional empty string or non-whitespace
                        addOption(valStr, valStr);
                     }
                }
            }
        });
    }

    const finalOptions = [];
    optionsMap.forEach((label, value) => {
        // If label was placeholder, revert to original value for display if necessary, or use a generic "Value: X"
        const displayLabel = label.startsWith('(Empty Label for:') ? value : label;
        finalOptions.push({ value, label: displayLabel });
    });

    finalOptions.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

    // --- ADD BLANK OPTION FOR NON-REQUIRED SINGLE-SELECT ---
    if (colDef.type === 'select' && !colDef.required) {
        // Check if a truly blank option (value: '') already exists from data/config
        const hasExplicitBlank = finalOptions.some(opt => opt.value === '');
        if (!hasExplicitBlank) {
            finalOptions.unshift({ value: '', label: '(No Selection)' }); // Or just "---" or ""
        } else {
            // If an explicit blank option exists, ensure its label is user-friendly
            const blankOption = finalOptions.find(opt => opt.value === '');
            if (blankOption && (blankOption.label === '' || blankOption.label === '(Empty Label for: )')) {
                blankOption.label = '(No Selection)';
            }
        }
    }
    // --- END ADD BLANK OPTION ---

    return finalOptions;
}


function createSelectPopup(td, currentValueForPopup, colDef, rowIndex, columnName) {
    // ... (no change from previous full version in the setup of popup, searchInput, optionsList) ...
    if (_activePopup) _activePopup.remove();
    const popup = document.createElement('div');
    _activePopup = popup; _activePopup.td = td;
    popup.className = 'custom-select-popup';
    const rect = td.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.minWidth = `${Math.max(td.offsetWidth, 200)}px`;
    popup.style.zIndex = '1000';

    let allOptions = getOptionsForColumn(colDef); // This now includes blank option for non-required selects
    const useSearch = allOptions.length >= 15 || (colDef.type === 'multi-select' && colDef.allowNewTags);

    let currentSelectionsArray = [];
    if (colDef.type === 'multi-select') {
        currentSelectionsArray = Array.isArray(currentValueForPopup) ? [...currentValueForPopup.map(String)] : [];
    } else { // single select
        currentSelectionsArray = currentValueForPopup !== undefined && currentValueForPopup !== null ? [String(currentValueForPopup)] : ['']; // Default to selecting blank if current is null/undefined
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

    // updateAndClose and rerenderOptionsList are defined below or globally scoped via window
    window._editorUpdateAndCloseFromPopup = (valueToSet) => { // Ensure this is available
        _csvDataInstance[rowIndex][columnName] = valueToSet;
        td.innerHTML = getStyledCellDisplay(valueToSet, colDef);
        validateCell(td, valueToSet, colDef);
        if (_activePopup === popup) { popup.remove(); _activePopup = null; }
        window.dispatchEvent(new CustomEvent('editorDataChanged'));
    };

    const rerenderOptionsList = () => {
        const searchTerm = useSearch ? searchInput.value : '';
        filterPopupOptions(optionsList, searchTerm, allOptions, currentSelectionsArray, colDef);
    };

    if (useSearch) {
        searchInput.addEventListener('input', rerenderOptionsList);
        searchInput.addEventListener('keydown', (e) => {
            // ... (keydown logic for searchInput - no change from previous full version) ...
            if (e.key === 'Enter') {
                e.preventDefault();
                if (colDef.type === 'multi-select' && colDef.allowNewTags && searchInput.value.trim() !== '') {
                    const newTag = searchInput.value.trim();
                    if (!currentSelectionsArray.includes(newTag)) {
                        currentSelectionsArray.push(newTag);
                    }
                    if (!allOptions.some(opt => opt.value === newTag)) {
                        allOptions.push({ value: newTag, label: newTag });
                        allOptions.sort((a, b) => a.label.localeCompare(b.label));
                    }
                    searchInput.value = '';
                    rerenderOptionsList();
                } else if (colDef.type === 'select') {
                    const firstVisibleOption = optionsList.querySelector('li:not([data-filtered-out="true"])'); // Assuming data-filtered-out is used by filterPopupOptions
                    if (firstVisibleOption) firstVisibleOption.click();
                }
            } else if (e.key === 'Escape') {
                if (_activePopup === popup) { popup.remove(); _activePopup = null; }
                td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef);
            }
        });
    }

    rerenderOptionsList(); // Initial render of options

    if (colDef.type === 'multi-select') {
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply Selections';
        applyBtn.className = 'popup-apply-btn';
        applyBtn.addEventListener('click', () => {
            window._editorUpdateAndCloseFromPopup([...currentSelectionsArray]); // Pass a copy
        });
        popup.appendChild(applyBtn);
    }

    document.body.appendChild(popup);
    if (useSearch && searchInput) searchInput.focus();
    else if (optionsList.firstChild) optionsList.firstChild.focus();

    setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
}

function renderPopupOptions(listElement, optionsToDisplay, currentSelectedValuesArray, colDef) {
    listElement.innerHTML = '';
    const isMulti = colDef.type === 'multi-select';
    // For single select, currentSelectedValuesArray will have one item (or empty string for 'No Selection')
    // For multi-select, it's an array of selected string values.
    const currentValuesSet = new Set(currentSelectedValuesArray.map(String));

    if (optionsToDisplay.length === 0 && isMulti && colDef.allowNewTags) {
        // ... (no change from previous)
    }
    if (optionsToDisplay.length === 0 && !(isMulti && colDef.allowNewTags)) { // Adjusted condition
        // ... (no change from previous)
    }

    optionsToDisplay.forEach(opt => {
        const li = document.createElement('li');
        li.tabIndex = 0;
        if (isMulti) {
            // ... (multi-select checkbox logic - no change from previous) ...
        } else { // 'select'
            li.textContent = opt.label;
            li.dataset.value = opt.value;
            // For single select, currentValuesSet will contain the single selected value string, or "" for blank
            if (currentValuesSet.has(String(opt.value))) {
                li.classList.add('selected');
            }
            const selectAndClose = () => {
                // window._editorUpdateAndCloseFromPopup is defined in createSelectPopup
                window._editorUpdateAndCloseFromPopup(opt.value, _activePopup.td.dataset.rowIndex, _activePopup.td.dataset.columnName, colDef);
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

            // For multi-select, "Apply" is explicit. If clicked outside without apply,
            // revert to state before popup for that cell.
            // For single-select, a click outside means no change from before popup.
            td.innerHTML = getStyledCellDisplay(_csvDataInstance[rowIndex][columnName], colDef);
            validateCell(td, _csvDataInstance[rowIndex][columnName], colDef);

            _activePopup.remove();
            _activePopup = null;
            document.removeEventListener('click', handleClickOutsidePopup, { capture: true }); // Remove this instance
        } else {
            // Click was likely on the cell that opened it. Re-attach listener if popup still somehow exists.
             if (_activePopup) { // Should have been removed by opening cell again
                document.removeEventListener('click', handleClickOutsidePopup, { capture: true });
                setTimeout(() => { document.addEventListener('click', handleClickOutsidePopup, { once: true, capture: true }); }, 0);
             }
        }
    } else if (_activePopup) { // Click was inside the popup, re-register listener
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