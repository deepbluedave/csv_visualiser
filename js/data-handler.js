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