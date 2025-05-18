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