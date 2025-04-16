/**
 * config_builder.js v1.3
 * Logic for the Spreadsheet Aggregator Configuration Builder page.
 * Correction: Added explicit checks for `config` object existence BEFORE accessing its properties.
 */

// --- DOM Elements ---
const masterSampleInput = document.getElementById('masterSampleInput');
const masterFileInfo = document.getElementById('masterFileInfo');
const dataSheetSamplesContainer = document.getElementById('dataSheetSamplesContainer');
const addDataTypeButton = document.getElementById('addDataTypeButton');
const outputColumnsText = document.getElementById('outputColumnsText');
const updateMappingUIButton = document.getElementById('updateMappingUIButton');
const masterConfigSection = document.getElementById('masterConfigSection');
const masterFileNameHint = document.getElementById('masterFileNameHint');
const masterAppIdColumn = document.getElementById('masterAppIdColumn');
const masterLookupColumns = document.getElementById('masterLookupColumns');
const dataSheetMappingSection = document.getElementById('dataSheetMappingSection');
const dataSheetMappingPlaceholder = document.getElementById('dataSheetMappingPlaceholder');
const dataSheetMappingsContainer = document.getElementById('dataSheetMappingsContainer');
const maxUniqueValuesInput = document.getElementById('maxUniqueValues');
const generateConfigButton = document.getElementById('generateConfigButton');
const statusLog = document.getElementById('statusLog');

// --- State Variables ---
let masterHeaders = [];
let dataSheetSamples = {};
let outputColumns = [];
let config = null; // Initialize config as null globally

// --- Utility ---
function logBuilderStatus(message, isError = false) {
    console.log(message);
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    if (isError) { logEntry.style.color = 'red'; console.error(message); }
    statusLog.appendChild(logEntry);
    statusLog.scrollTop = statusLog.scrollHeight;
}

// --- Core Logic ---

function readHeaders(file) {
    // ... (No changes needed in readHeaders) ...
    return new Promise((resolve, reject) => { if (!file) { reject(new Error("No file provided.")); return; } const reader = new FileReader(); reader.onload = (e) => { try { const data = e.target.result; const workbook = XLSX.read(data, { type: 'array', sheetRows: 1 }); const firstSheetName = workbook.SheetNames[0]; if (!firstSheetName) throw new Error(`No sheets in ${file.name}`); const worksheet = workbook.Sheets[firstSheetName]; const headerData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }); if (!headerData?.[0]?.length) throw new Error(`No header row found in ${file.name}`); const headers = headerData[0].map(h => (h ? String(h).trim() : null)).filter(h => h); if (headers.length === 0) throw new Error(`No valid headers found in ${file.name}`); logBuilderStatus(`Read ${headers.length} headers from ${file.name}.`); resolve(headers); } catch (error) { logBuilderStatus(`Error reading headers from ${file.name}: ${error.message}`, true); reject(error); } }; reader.onerror = (e) => { logBuilderStatus(`File read error for ${file.name}: ${reader.error}`, true); reject(new Error(`Failed to read file.`)); }; reader.readAsArrayBuffer(file); });
}

function updateMasterConfigUI() {
    // ... (No changes needed in updateMasterConfigUI) ...
     if (masterHeaders.length > 0) { masterConfigSection.style.display = 'block'; masterAppIdColumn.innerHTML = '<option value="">-- Select Master App ID Column --</option>'; masterHeaders.forEach(h => { masterAppIdColumn.add(new Option(h, h)); }); masterLookupColumns.innerHTML = ''; masterHeaders.forEach(header => { const div = document.createElement('div'); const inputId = `lookup-${header.replace(/[^a-zA-Z0-9]/g, '_')}`; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = inputId; checkbox.value = header; checkbox.name = 'lookupColumns'; const label = document.createElement('label'); label.htmlFor = inputId; label.appendChild(checkbox); label.appendChild(document.createTextNode(` ${header}`)); div.appendChild(label); masterLookupColumns.appendChild(div); }); } else { masterConfigSection.style.display = 'none'; } checkGenerateButtonState();
}

async function handleMasterUpload(event) {
    // ... (No changes needed in handleMasterUpload) ...
     const file = event.target.files[0]; masterHeaders = []; masterFileInfo.textContent = ''; masterConfigSection.style.display = 'none'; if (file) { masterFileInfo.textContent = `Selected: ${file.name}`; try { masterHeaders = await readHeaders(file); updateMasterConfigUI(); } catch (error) { masterFileInfo.textContent = `Error: ${error.message}`; } } checkGenerateButtonState();
}

function addDataTypeSection() {
    // ... (No changes needed in addDataTypeSection) ...
     const typeIndex = document.querySelectorAll('.data-sheet-type').length; const typeIdBase = `dataType${typeIndex}`; const div = document.createElement('div'); div.className = 'data-sheet-type'; div.id = `${typeIdBase}-section`; const nameLabel = document.createElement('label'); nameLabel.htmlFor = `${typeIdBase}-name`; nameLabel.textContent = `Data Sheet Type Name:`; const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = `${typeIdBase}-name`; nameInput.placeholder = 'e.g., WebVulns, InfraScan (unique)'; nameInput.addEventListener('change', (e) => handleTypeNameChange(e, div)); const fileLabel = document.createElement('label'); fileLabel.htmlFor = `${typeIdBase}-file`; fileLabel.textContent = `Sample File for this Type:`; const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.id = `${typeIdBase}-file`; fileInput.accept = '.xlsx'; fileInput.addEventListener('change', (e) => handleDataSheetUpload(e, div)); const fileInfo = document.createElement('div'); fileInfo.className = 'file-info'; fileInfo.id = `${typeIdBase}-fileInfo`; div.appendChild(nameLabel); div.appendChild(nameInput); div.appendChild(fileLabel); div.appendChild(fileInput); div.appendChild(fileInfo); dataSheetSamplesContainer.appendChild(div);
}

function handleTypeNameChange(event, typeDivElement) {
    // ... (No changes needed in handleTypeNameChange) ...
     const oldTypeName = typeDivElement.dataset.typeName; const newTypeName = event.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_'); if (!newTypeName) { if (oldTypeName && dataSheetSamples[oldTypeName]) { logBuilderStatus(`Type name cleared. Removing data for "${oldTypeName}".`, false); delete dataSheetSamples[oldTypeName]; typeDivElement.dataset.typeName = ''; event.target.value = ''; regenerateMappingUI(); checkGenerateButtonState(); } return; } if (newTypeName === oldTypeName) return; if (dataSheetSamples[newTypeName]) { logBuilderStatus(`Error: Type name "${newTypeName}" already exists.`, true); event.target.value = oldTypeName || ''; return; } if (oldTypeName && dataSheetSamples[oldTypeName]) { dataSheetSamples[newTypeName] = dataSheetSamples[oldTypeName]; delete dataSheetSamples[oldTypeName]; logBuilderStatus(`Renamed data sheet type "${oldTypeName}" to "${newTypeName}".`, false); } else { dataSheetSamples[newTypeName] = { file: null, headers: [], hint: '', appIdCol: '' }; logBuilderStatus(`Added new data sheet type "${newTypeName}".`, false); } typeDivElement.dataset.typeName = newTypeName; event.target.value = newTypeName; regenerateMappingUI(); checkGenerateButtonState();
}

async function handleDataSheetUpload(event, typeDivElement) {
    // ... (No changes needed in handleDataSheetUpload) ...
     const file = event.target.files[0]; const typeName = typeDivElement.dataset.typeName; const fileInfo = typeDivElement.querySelector('.file-info'); fileInfo.textContent = ''; if (!typeName) { logBuilderStatus("Please enter a Type Name first.", true); event.target.value = ''; return; } if (!dataSheetSamples[typeName]) dataSheetSamples[typeName] = { file: null, headers: [], hint: '', appIdCol: '' }; dataSheetSamples[typeName].headers = []; dataSheetSamples[typeName].file = null; if (file) { fileInfo.textContent = `Selected: ${file.name}`; dataSheetSamples[typeName].file = file; try { dataSheetSamples[typeName].headers = await readHeaders(file); regenerateMappingUI(); } catch (error) { fileInfo.textContent = `Error reading sample: ${error.message}`; dataSheetSamples[typeName].headers = []; dataSheetSamples[typeName].file = null; regenerateMappingUI(); } } else { regenerateMappingUI(); } checkGenerateButtonState();
}

function updateOutputColumnsAndUI() {
    // ... (No changes needed in updateOutputColumnsAndUI) ...
     outputColumns = outputColumnsText.value.split('\n').map(line => line.trim()).filter(line => line); if(outputColumns.length > 0) logBuilderStatus(`Updated output columns (${outputColumns.length}). Updating mapping UI...`, false); else logBuilderStatus(`Output columns cleared.`, false); regenerateMappingUI(); checkGenerateButtonState();
}

/** Generates the dynamic mapping configuration section. */
function regenerateMappingUI() {
    dataSheetMappingsContainer.innerHTML = ''; // Clear existing

    // *** ADDED CHECK: Ensure config is loaded before proceeding ***
    if (!config) {
        logBuilderStatus("Config not loaded yet. Cannot generate mapping UI.", false);
        dataSheetMappingPlaceholder.textContent = "Upload a config file first.";
        dataSheetMappingPlaceholder.style.display = 'block';
        return; // Exit if config isn't ready
    }
    // *** END ADDED CHECK ***

    let haveOutputCols = outputColumns.length > 0;
    let haveHeaders = Object.values(dataSheetSamples).some(ds => ds?.headers?.length > 0);
    let canMap = haveOutputCols && haveHeaders;

    if (!canMap) {
        dataSheetMappingPlaceholder.textContent = "Upload data sheet samples and define output columns above to configure mappings."; // Restore original text
        dataSheetMappingPlaceholder.style.display = 'block';
        checkGenerateButtonState();
        return;
    }

    dataSheetMappingPlaceholder.style.display = 'none';
    const sortedTypeNames = Object.keys(dataSheetSamples).sort();

    sortedTypeNames.forEach(typeName => {
        const sample = dataSheetSamples[typeName];
        if (!sample?.headers?.length) return;

        const sectionDiv = document.createElement('div'); sectionDiv.className = 'data-sheet-mapping-type';
        const title = document.createElement('h3'); title.textContent = `Mapping for: ${typeName}`; sectionDiv.appendChild(title);

        // File Name Hint
        const hintGroup = document.createElement('div'); hintGroup.className = 'config-group';
        const hintLabel = document.createElement('label'); hintLabel.htmlFor = `hint-${typeName}`; hintLabel.textContent = 'File Name Hint:';
        const hintInput = document.createElement('input'); hintInput.type = 'text'; hintInput.id = `hint-${typeName}`; hintInput.placeholder = `e.g., ${typeName.toLowerCase()}_scan`; hintInput.value = sample.hint || ''; hintInput.addEventListener('change', (e) => { sample.hint = e.target.value.trim(); checkGenerateButtonState(); });
        hintGroup.appendChild(hintLabel); hintGroup.appendChild(hintInput); sectionDiv.appendChild(hintGroup);

        // App ID Column
        const appIdGroup = document.createElement('div'); appIdGroup.className = 'config-group';
        const appIdLabel = document.createElement('label'); appIdLabel.htmlFor = `appId-${typeName}`; appIdLabel.textContent = 'Application ID Column (in this sheet type):';
        const appIdSelect = document.createElement('select'); appIdSelect.id = `appId-${typeName}`; appIdSelect.innerHTML = `<option value="">-- Select ${typeName} Header --</option>`;
        sample.headers.forEach(header => { const option = new Option(header, header); option.selected = (header === sample.appIdCol); appIdSelect.appendChild(option); });
        appIdSelect.addEventListener('change', (e) => { sample.appIdCol = e.target.value; checkGenerateButtonState(); });
        appIdGroup.appendChild(appIdLabel); appIdGroup.appendChild(appIdSelect); sectionDiv.appendChild(appIdGroup);

        // Column Mappings
        const mappingTitle = document.createElement('h4'); mappingTitle.textContent = 'Map Output Columns to Input Columns:'; mappingTitle.style.cssText = 'font-size: 1em; margin-top: 15px;'; sectionDiv.appendChild(mappingTitle);

        outputColumns.forEach(outputCol => {
             // Skip meta columns
             if (outputCol === 'SourceType' || outputCol === 'SourceFile') return;
             // Skip master lookup columns (config is guaranteed to exist here due to check above)
             let isLookup = config.masterSheetIdentifier.lookupColumns.includes(outputCol);
             if (isLookup) return;
             // Skip the primary App ID output column
             if (outputColumns.length > 0 && outputCol === outputColumns[0]) return;

            const itemDiv = document.createElement('div'); itemDiv.className = 'mapping-item';
            const outLabel = document.createElement('label'); outLabel.textContent = `${outputCol}:`; outLabel.htmlFor = `map-${typeName}-${outputCol}`;
            const select = document.createElement('select'); select.id = `map-${typeName}-${outputCol}`; select.dataset.outputColumn = outputCol;
            select.innerHTML = '<option value="">(No Mapping)</option>';
            sample.headers.forEach(header => { if (header === sample.appIdCol) return; select.add(new Option(header, header)); });
            itemDiv.appendChild(outLabel); itemDiv.appendChild(select); sectionDiv.appendChild(itemDiv);
        });
        dataSheetMappingsContainer.appendChild(sectionDiv);
    });
    checkGenerateButtonState();
}

/** Checks if the Generate button should be enabled */
function checkGenerateButtonState() {
    // *** ADDED CHECK: Ensure config is loaded before checking its properties ***
    let masterInfoComplete = config && masterFileNameHint.value.trim() !== '' && masterAppIdColumn.value !== '';
    // *** END ADDED CHECK ***
    let masterSampleUploaded = masterHeaders.length > 0;
    let allDataSheetsComplete = Object.keys(dataSheetSamples).length > 0 && Object.entries(dataSheetSamples).every(([key, ds]) => ds && ds.headers?.length > 0 && ds.hint && ds.appIdCol);
    let outputColsDefined = outputColumns.length > 0;
    generateConfigButton.disabled = !(masterSampleUploaded && masterInfoComplete && outputColsDefined && allDataSheetsComplete);
}


/** Builds the final config object */
function buildConfigObject() {
    // *** ADDED CHECK: Ensure config is loaded ***
    if (!config || !config.masterSheetIdentifier) {
        logBuilderStatus("Cannot build config: Master config details missing or config file not loaded.", true);
        throw new Error("Master configuration is not properly loaded or defined.");
    }
    // *** END ADDED CHECK ***

    logBuilderStatus("Building configuration object...");
    const finalConfig = {};
    finalConfig.masterSheetIdentifier = { fileNameHint: masterFileNameHint.value.trim(), appIdColumn: masterAppIdColumn.value, lookupColumns: Array.from(masterLookupColumns.querySelectorAll('input:checked')).map(cb => cb.value) };
    finalConfig.outputColumns = outputColumns;
    finalConfig.maxUniqueValuesForDropdown = parseInt(maxUniqueValuesInput.value, 10) || 150;
    finalConfig.dataSheetMappings = [];
    Object.keys(dataSheetSamples).sort().forEach(typeName => {
        const sample = dataSheetSamples[typeName];
        if (!sample || !sample.headers?.length || !sample.hint || !sample.appIdCol) return;
        const mappingEntry = { name: typeName, fileNameHint: sample.hint, appIdColumn: sample.appIdCol, columnMapping: {} };
        dataSheetMappingsContainer.querySelectorAll(`select[id^="map-${typeName}-"]`).forEach(select => {
            if (select.value) mappingEntry.columnMapping[select.dataset.outputColumn] = select.value;
        });
        finalConfig.dataSheetMappings.push(mappingEntry);
    });
    logBuilderStatus("Configuration object built.");
    return finalConfig;
}

/** Triggers download of a JSON object */
function downloadJson(jsonObject, baseFilename) { /* ... (No changes needed) ... */ let jsonString; try { jsonString = JSON.stringify(jsonObject, null, 2); } catch (e) { logBuilderStatus(`JSON Error: ${e.message}`, true); return; } try { const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = baseFilename.endsWith('.json') ? baseFilename : `${baseFilename}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); logBuilderStatus(`Download started: '${link.download}'.`, false); } catch (e) { logBuilderStatus(`Download link error: ${e.message}`, true); } }

/** Handles the Generate button click */
function handleGenerateConfig() { if (generateConfigButton.disabled) return; try { const configObject = buildConfigObject(); downloadJson(configObject, 'config.json'); } catch (error) { logBuilderStatus(`Failed to build/download config: ${error.message}`, true); } }


// --- Event Listeners Setup ---
masterSampleInput.addEventListener('change', handleMasterUpload);
addDataTypeButton.addEventListener('click', addDataTypeSection);
outputColumnsText.addEventListener('input', checkGenerateButtonState); // Check state only
updateMappingUIButton.addEventListener('click', updateOutputColumnsAndUI); // Explicit UI update
generateConfigButton.addEventListener('click', handleGenerateConfig);
// Check generate button state when master inputs change
masterFileNameHint.addEventListener('input', checkGenerateButtonState);
masterAppIdColumn.addEventListener('change', checkGenerateButtonState);
masterLookupColumns.addEventListener('change', checkGenerateButtonState);


// --- Initial Setup ---
logBuilderStatus("Config Builder Initialized.");
addDataTypeSection(); // Add the first section
checkGenerateButtonState(); // Check initial state