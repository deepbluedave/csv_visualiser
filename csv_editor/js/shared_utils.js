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