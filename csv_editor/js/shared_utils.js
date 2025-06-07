// --- START OF FILE csv_editor/js/shared_utils.js ---

/**
 * Checks if a value represents a "truthy" state based on a config's trueValues.
 * @param {*} value The value to check.
 * @param {object} config The configuration object containing generalSettings.trueValues.
 * @returns {boolean} True if the value matches a configured true value.
 */
function isTruthy(value, config) {
    if (value === null || typeof value === 'undefined') return false;
    const stringValue = String(value).toLowerCase();
    if (stringValue === '') return false;
    const trueValsArray = config?.generalSettings?.trueValues || ["true", "yes", "1"];
    const trueValsLower = trueValsArray.map(v => String(v).toLowerCase());
    return trueValsLower.includes(stringValue);
}

/**
 * Reads content from a user-selected file as text.
 * @param {File} file The file object.
 * @returns {Promise<string>} Resolves with the file content as a string.
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No file provided."));
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Error reading file: ${reader.error.message || 'Unknown error'}`));
        reader.readAsText(file);
    });
}

/**
 * Formats a single value as an HTML tag based on indicatorStyles configuration.
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
    return `<span class="editor-cell-mini-tag">${stringValue}</span>`;
}

/**
 * Sorts an array of data objects based on multiple criteria defined in sortByConfig.
 * @param {object[]} dataArray The array of data objects to sort.
 * @param {object[]} sortByConfig Array of sort criteria.
 * @param {object} sortHelperConfig Object containing `csvHeaders`.
 * @returns {object[]} The sorted dataArray.
 */
function sortData(dataArray, sortByConfig, sortHelperConfig) {
    if (!Array.isArray(dataArray) || !Array.isArray(sortByConfig) || sortByConfig.length === 0) {
        return dataArray;
    }

    const validHeaders = sortHelperConfig?.csvHeaders || [];
    const validSortBy = sortByConfig.map(criterion => {
        if (!criterion || !criterion.column || !validHeaders.includes(criterion.column)) return null;
        const direction = String(criterion.direction || 'asc').toLowerCase();
        let order = null;
        if (direction === 'custom') {
            if (!Array.isArray(criterion.order) || criterion.order.length === 0) return { ...criterion, direction: 'asc' };
            order = criterion.order.map(item => String(item ?? '').toLowerCase());
        } else if (!['asc', 'desc'].includes(direction)) {
            return { ...criterion, direction: 'asc' };
        }
        return { ...criterion, direction, order };
    }).filter(Boolean);

    if (validSortBy.length === 0) return dataArray;

    const comparisonFunction = (a, b) => {
        for (const criterion of validSortBy) {
            const { column, direction, order } = criterion;
            const valA = a[column];
            const valB = b[column];
            const aIsNull = valA === null || typeof valA === 'undefined' || valA === '';
            const bIsNull = valB === null || typeof valB === 'undefined' || valB === '';
            if (aIsNull && bIsNull) continue;
            if (aIsNull) return 1;
            if (bIsNull) return -1;
            let comparison = 0;
            if (direction === 'custom') {
                const valALower = String(valA).toLowerCase();
                const valBLower = String(valB).toLowerCase();
                const indexA = order.indexOf(valALower);
                const indexB = order.indexOf(valBLower);
                if (indexA !== -1 && indexB !== -1) comparison = indexA - indexB;
                else if (indexA !== -1) comparison = -1;
                else if (indexB !== -1) comparison = 1;
                else comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
            } else {
                const numA = Number(valA);
                const numB = Number(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    comparison = numA - numB;
                } else {
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
    } catch (error) { console.error("Error during dataArray.sort():", error); }
    return dataArray;
}

/**
 * Checks if a single row matches a specific filter condition.
 * @param {object} row The data row object.
 * @param {object} condition The filter condition object {column, filterType, filterValue}.
 * @param {object} appConfig The config object, needing appConfig.csvHeaders and appConfig.generalSettings.trueValues.
 * @returns {boolean} True if the row matches the condition.
 */
function checkCondition(row, condition, appConfig) {
    if (!condition || typeof condition !== 'object') {
        console.warn("checkCondition received an invalid condition object.");
        return false;
    }
    const { column, filterType, filterValue } = condition;
    const headers = appConfig?.csvHeaders || [];
    const requiresColumn = !['catchAll'].includes(filterType);
    if (requiresColumn && (!column || !headers.includes(column))) {
        console.warn(`checkCondition: Column "${column}" for filtering not found in provided headers. Filter will fail.`);
        return false;
    }
    const rowValueOriginal = requiresColumn ? row[column] : null;
    const valuesToCheck = Array.isArray(rowValueOriginal) ? rowValueOriginal.map(v => String(v ?? '').trim()) : [String(rowValueOriginal ?? '').trim()];
    try {
        switch (filterType) {
            case 'valueEquals': return valuesToCheck.some(v => v.toLowerCase() === String(filterValue ?? '').toLowerCase());
            case 'valueIsNot': return valuesToCheck.every(v => v.toLowerCase() !== String(filterValue ?? '').toLowerCase());
            case 'valueInList':
                const listLower = Array.isArray(filterValue) ? filterValue.map(fv => String(fv ?? '').toLowerCase()) : [];
                return valuesToCheck.some(v => listLower.includes(v.toLowerCase()));
            case 'valueNotInList':
                const listNLower = Array.isArray(filterValue) ? filterValue.map(fv => String(fv ?? '').toLowerCase()) : [];
                return valuesToCheck.every(v => !listNLower.includes(v.toLowerCase()));
            case 'valueNotEmpty': return valuesToCheck.some(v => v !== '');
            case 'valueIsEmpty': return valuesToCheck.every(v => v === '');
            case 'booleanTrue': return valuesToCheck.some(v => isTruthy(v, appConfig));
            case 'booleanFalse': return valuesToCheck.every(v => !isTruthy(v, appConfig));
            case 'contains':
                const termLower = String(filterValue ?? '').toLowerCase();
                return termLower ? valuesToCheck.some(v => v.toLowerCase().includes(termLower)) : false;
            case 'doesNotContain':
                const termNLower = String(filterValue ?? '').toLowerCase();
                return termNLower ? valuesToCheck.every(v => !v.toLowerCase().includes(termNLower)) : true;
            default:
                console.warn(`Unsupported filterType: "${filterType}".`); return false;
        }
    } catch (e) {
        console.error(`Error in checkCondition for column "${column}":`, e); return false;
    }
}

/**
 * NEW HELPER FUNCTION: Evaluates a row against a full filter group ({logic, conditions}).
 * @param {object} row The data row to check.
 * @param {object} filterGroup The filter criteria object {logic, conditions: [...]}.
 * @param {object} appConfig The config object, passed down to checkCondition.
 * @returns {boolean} True if the row matches the entire filter group.
 */
function doesRowMatchFilterGroup(row, filterGroup, appConfig) {
    if (!filterGroup || !Array.isArray(filterGroup.conditions) || filterGroup.conditions.length === 0) {
        return true; // If no filter is defined, all rows match.
    }
    const logicIsOr = filterGroup.logic && filterGroup.logic.toUpperCase() === 'OR';
    if (logicIsOr) {
        return filterGroup.conditions.some(condition => checkCondition(row, condition, appConfig));
    } else { // Default to AND
        return filterGroup.conditions.every(condition => checkCondition(row, condition, appConfig));
    }
}

console.log("shared_utils.js loaded with sortData and checkCondition functions.");