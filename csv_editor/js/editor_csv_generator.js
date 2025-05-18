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