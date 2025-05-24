# Config-Driven CSV Editor: User & Configuration Guide

## 1. Introduction

The Config-Driven CSV Editor is a client-side web application designed to provide a structured and user-friendly way to create, view, and modify CSV data. Its primary purpose is to prepare data for use with the "Configurable CSV Dashboard Generator" (the viewer). The editor's behavior, data schema, input types, and validation rules are primarily driven by a dedicated `editor_config.js` file. It can also leverage styling hints (like icon definitions and tag colors) from an existing `viewer_config.js` to provide a live preview of how data might appear in the dashboard.

This editor runs entirely in the browser and does not require any third-party JavaScript libraries for its core functionality.

## 2. Core Features

*   **Schema-Driven Editing:** The structure of the data grid (columns, labels, data types) is defined by `editor_config.js`.
*   **Rich Input Types:** Supports various input types per column:
    *   Single-line text (`text`)
    *   Multi-line text (`textarea`)
    *   Boolean checkboxes (`checkbox`)
    *   Date pickers (`date`)
    *   Number inputs (`number`)
    *   Single-select picklists (`select`)
    *   Multi-select tag inputs (`multi-select`)
*   **Live Cell Preview:** Cells can display styled content (icons, tags) based on `viewer_config.js` when not in edit mode, providing a preview of the dashboard appearance.
*   **Data Validation:**
    *   Required fields.
    *   Regex pattern validation for text fields.
    *   Visual feedback (red borders) for invalid cells.
*   **Dynamic Picklist Options:** For `select` and `multi-select` fields, options are consolidated from:
    1.  Explicitly defined options in `editor_config.js`.
    2.  Options derived from `valueMap` in `viewer_config.js` (if configured).
    3.  All unique existing values for that column in the currently loaded CSV data.
*   **Adaptive Popup UI:** For `select` and `multi-select` fields:
    *   Small lists of options use a simple dropdown/checkbox list.
    *   Large lists include a search filter within the popup.
    *   `multi-select` allows adding new tags via the popup search bar if `allowNewTags: true`.
*   **Data Operations:**
    *   Add new rows.
    *   Delete existing rows (with confirmation).
    *   Sort data based on `defaultItemSortBy` criteria from `viewer_config.js`.
*   **CSV Import/Export:**
    *   Load existing CSV data.
    *   Export the edited data grid back to a CSV file.
*   **Configuration Preloading:**
    *   The primary `editor_config.js` is loaded via a `<script>` tag in `editor.html`.
    *   This `editor_config.js` can specify URLs in a `preloadUrls` section to automatically fetch the `viewer_config.js` and an initial `csvDataUrl` on page load.
    *   Manual file inputs are available as fallbacks or for overriding preloaded files.
*   **Client-Side Operation:** Runs entirely in the browser.
*   **Embeddable:** Designed to be bundled into an HTML fragment for use in systems like Confluence (future `deploy_editor.ps1` script).

## 3. Getting Started / Usage Flow

1.  **Prepare Configuration Files:**
    *   **`editor_config.js` (Required):** Create this file based on the schema described in Section 4. This defines your data structure for editing.
    *   **`viewer_config.js` (Optional but Recommended):** The configuration file used by your CSV Dashboard Generator. The editor uses this for:
        *   Styling previews (icons, tag colors).
        *   Deriving picklist options (if `optionsSource: "viewerConfigValueMap"` is used in `editor_config.js`).
        *   Default sorting criteria.
        *   `trueValues` for interpreting booleans on CSV import.
    *   **CSV Data File (Optional for initial load):** Your existing CSV data.
2.  **Embed `editor_config.js` in `editor.html`:**
    Modify `editor.html` to include your primary editor configuration file via a script tag:
    ```html
    <!-- In editor.html, before editor_app.js -->
    <script src="path/to/your/editor_config.js"></script> 
    ```
    *   The `editor_config.js` file must define a global variable `window.editorConfig`.
    *   Inside this `editor_config.js`, you can specify `preloadUrls` for the `viewer_config.js` and an initial `csvDataUrl`.
3.  **Host Files:** Place `editor.html`, its CSS/JS subdirectories, your config files, and any data files to be preloaded on a web server or use a local server for development (e.g., VS Code Live Server, Python's `http.server`).
4.  **Open `editor.html` in your Browser.**
    *   The editor will attempt to load `window.editorConfig` (from the script tag).
    *   It will then attempt to load `viewerConfigUrl` and `csvDataUrl` if specified in the loaded `editorConfig`.
    *   Manual file inputs will be hidden for successfully preloaded files.
5.  **Manual File Loading (if preloads fail or are not specified):**
    *   Use the "Choose File" buttons to load:
        *   **Viewer Config (config.js):** If not preloaded or to override. This provides styling and sorting defaults.
        *   **Editor Config (editor_config.js):** The input for this will be hidden if the initial embedded script loaded successfully. It's primarily for development or if the embedded script fails. Manually loading a new editor config will reset the entire editor.
        *   **CSV Data File:** To load or replace the data in the grid.
6.  **Edit Data:**
    *   Click a cell to edit its content. Input controls will vary based on the column's `type` defined in `editor_config.js`.
    *   For `checkbox` types, click directly on the cell (or its icon) to toggle the boolean state.
    *   For `select` and `multi-select`, a popup will appear.
7.  **Use Actions:**
    *   **+ Add Row:** Adds a new empty row to the grid.
    *   **Sort Data (Default):** Sorts the grid by the `defaultItemSortBy` rules in the loaded `viewer_config.js`.
    *   **Export to CSV:** Downloads the current grid data as a CSV file.
8.  **Status Bar:** Provides feedback on loading processes and actions.

## 4. `editor_config.js` Schema Definition

The `editor_config.js` file exports a single object, typically assigned to `window.editorConfig` if embedded directly in `editor.html`.

```javascript
// Example: editor_config_mydata.js
window.editorConfig = {
  "editorSchemaVersion": 1.0, // Version of this editor schema

  "preloadUrls": { // Optional: URLs for pre-loading files
    "viewerConfigUrl": "./viewer_config_for_mydata.js", // Path to the viewer's config.js
    "csvDataUrl": "./my_initial_data.csv"               // Path to an initial CSV to load
  },

  "csvOutputOptions": { // How the editor should format the exported CSV
    "delimiter": ",",                 // Default: ","
    "booleanTrueValue": "TRUE",       // String for 'true' checkboxes in CSV. Default: "TRUE"
    "booleanFalseValue": "FALSE"      // String for 'false' checkboxes in CSV. Default: "FALSE" (Use "" for blank)
  },

  "columns": [
    // Array of column definition objects. Order here dictates grid column order.
    {
      "name": "CSV_Header_Name", // REQUIRED: Exact header name in the CSV file
      "label": "Display Label for Editor", // REQUIRED: Header label shown in the editor grid
      "type": "text", // REQUIRED: text, textarea, select, checkbox, date, number, multi-select
      "required": false, // Optional: true if field cannot be empty. Default: false
      "readOnly": false, // Optional: true if field cannot be edited. Default: false
      "validationRegex": "^[A-Z]{2}-\\d{4}$", // Optional: JS Regex string for 'text'/'textarea'
      "columnWidth": "150px", // Optional: Suggested CSS width for this column in editor grid
      "orientation": "vertical", // Optional: "horizontal" (default) or "vertical" for header text
      
      // For type: "select" or "multi-select"
      "optionsSource": "viewerConfigValueMap", // Optional: "viewerConfigValueMap" or "editorConfig" (default)
      "options": ["Option A", { "value": "opt_b", "label": "Option B" }], // Optional: Explicit list of options
      "viewerStyleColumnName": "StatusColumnInViewerConfig", // Optional: If styling from a different viewer config column
      
      // For type: "multi-select"
      "allowNewTags": true, // Optional: Default false. If true, user can add new tags not in options.
      
      // For type: "checkbox" (trueValue/falseValue for CSV output are in csvOutputOptions)
    },
    // ... more column definitions
  ]
};
```

### 4.1. Root Properties of `editorConfig`

*   **`editorSchemaVersion`** (Number, Required)
    *   Version of the `editor_config.js` schema itself.
    *   Example: `1.0`
*   **`preloadUrls`** (Object, Optional)
    *   Contains URLs for files to be automatically loaded when the editor starts (if this `editor_config.js` is loaded successfully).
    *   `viewerConfigUrl`: (String, Optional) Path/URL to the `viewer_config.js` file.
    *   `csvDataUrl`: (String, Optional) Path/URL to an initial CSV data file.
    *   Example: `"preloadUrls": { "viewerConfigUrl": "./configs/main_viewer_config.js", "csvDataUrl": "./data/default_data.csv" }`
*   **`csvOutputOptions`** (Object, Optional)
    *   Defines how the editor should format the CSV when exporting.
    *   `delimiter`: (String) Delimiter for exported CSV. Default: `","`.
    *   `booleanTrueValue`: (String) String written to CSV for a checked (`true`) checkbox. Default: `"TRUE"`.
    *   `booleanFalseValue`: (String) String written to CSV for an unchecked (`false`) checkbox. Default: `"FALSE"`. Use `""` for a blank representation of false.
    *   Example: `"csvOutputOptions": { "booleanTrueValue": "Yes", "booleanFalseValue": "No" }`

### 4.2. `columns` Array

This is an array of objects, where each object defines a column in the editor grid and its corresponding data field. The order of objects in this array determines the column order in the editor.

#### Column Definition Object Properties:

*   **`name`** (String, Required)
    *   The exact header name for this column as it exists (or will exist) in the CSV file. This is used for mapping data.
    *   Example: `"TaskStatus"`, `"AssigneeEmail"`
*   **`label`** (String, Required)
    *   The user-friendly display label shown in the editor grid's header for this column.
    *   Example: `"Task Status"`, `"Assigned To"`
*   **`type`** (String, Required)
    *   Determines the data type and the kind of input control used for editing.
    *   Supported values:
        *   `"text"`: A single-line text input. Default if type is invalid.
        *   `"textarea"`: A multi-line text input area.
        *   `"select"`: A single-choice picklist. Options are displayed in a popup.
        *   `"checkbox"`: A boolean true/false input, displayed as a checkbox in edit mode, and potentially as an icon (from `viewer_config.js`) in display mode. Click cell to toggle.
        *   `"date"`: A date input, using the browser's native date picker. Stores date as YYYY-MM-DD.
        *   `"number"`: A number input, using the browser's native number input.
        *   `"multi-select"`: Allows selecting multiple values, displayed as "tags" in the cell. Options are managed in a popup.
    *   Example: `"type": "select"`
*   **`required`** (Boolean, Optional)
    *   If `true`, the cell cannot be empty. Basic validation will flag empty required cells with a red border.
    *   Default: `false`.
    *   Example: `"required": true`
*   **`readOnly`** (Boolean, Optional)
    *   If `true`, the cell's content cannot be edited by the user. It will be displayed as read-only text.
    *   Default: `false`.
    *   Example: `"readOnly": true`
*   **`validationRegex`** (String, Optional)
    *   Used for `text` and `textarea` types. A string representing a JavaScript regular expression pattern (without leading/trailing slashes or flags). If the cell content (and not empty, unless also required) doesn't match, it gets a red border.
    *   Example: `"validationRegex": "^[A-Za-z]+$"` (for alpha characters only)
*   **`columnWidth`** (String, Optional)
    *   A CSS width value (e.g., `"150px"`, `"20%"`) for this column in the editor grid. If not specified, width is auto-adjusted or uses a default.
    *   Example: `"columnWidth": "200px"`
*   **`orientation`** (String, Optional)
    *   Controls the orientation of the header label text.
    *   Values: `"horizontal"` (default), `"vertical"`.
    *   Useful for saving space with narrow columns (e.g., for boolean icons).
    *   Example: `"orientation": "vertical"`

#### Properties specific to `type: "select"` or `type: "multi-select"`:

*   **`optionsSource`** (String, Optional)
    *   Defines where to primarily source the list of selectable options.
    *   `"editorConfig"` (Default if `options` array is present): Use the `options` array defined directly in this column definition.
    *   `"viewerConfigValueMap"`: Derive options from the keys of `viewer_config.js::indicatorStyles[columnName].valueMap` (or `viewer_config.js::indicatorStyles[viewerStyleColumnName].valueMap` if `viewerStyleColumnName` is set).
    *   If omitted, and `options` is defined, `editorConfig` is assumed.
    *   Example: `"optionsSource": "viewerConfigValueMap"`
*   **`options`** (Array of `String` or `Object`, Optional)
    *   An explicit list of options for the select/multi-select.
    *   If strings: `["Apple", "Banana"]`. The string is used as both the value and the label.
    *   If objects: `[{value: "apl", label: "Apple"}, {value: "bnn", label: "Banana"}]`.
    *   If `optionsSource` is also used, these options are *merged* with the derived options. Options from this `options` array generally take precedence for labels if values conflict.
    *   All unique values from the current CSV data for this column are *also* added to the final list of available options in the popup.
    *   Example: `"options": ["High", "Medium", "Low"]`
*   **`viewerStyleColumnName`** (String, Optional)
    *   If the styling (tag color, icon) for the values in this editor column should be taken from a *different* column's definition in `viewer_config.js::indicatorStyles`, specify that viewer config column name here.
    *   Useful if data values are shared but styled under different keys in the viewer config, or if this column's `name` doesn't directly match an `indicatorStyles` key.
    *   Default: The current column's `name`.
    *   Example: `"viewerStyleColumnName": "GlobalStatusCategory"`

#### Properties specific to `type: "multi-select"`:

*   **`allowNewTags`** (Boolean, Optional)
    *   If `true`, users can type new values into the multi-select popup's search bar and add them as new tags (even if not in the predefined `options`).
    *   If `false` (default), users can only select from the available (predefined or data-derived) options.
    *   Example: `"allowNewTags": true`

#### Properties specific to `type: "checkbox"`:

*   The actual string values written to the CSV for `true` and `false` states are controlled by `csvOutputOptions.booleanTrueValue` and `csvOutputOptions.booleanFalseValue` at the root of `editorConfig`.
*   In display mode (not editing), the cell will attempt to show an icon based on the value and the `viewer_config.js::indicatorStyles` for this column (or `viewerStyleColumnName`). If no icon, it appears blank.
*   Clicking the cell directly toggles the boolean state.

## 5. Error Handling & Status Messages

*   The status bar at the top provides feedback on file loading, actions (sort, export), and errors.
*   Invalid cell entries (failing `required` or `validationRegex` checks) will have their borders highlighted in red. Tooltips on these cells may provide more specific error details.
*   Console logs provide more detailed debugging information.

## 6. Deployment (Future)

A `deploy_editor.ps1` script will be provided to bundle the editor's HTML, CSS, and JavaScript into a single HTML fragment suitable for embedding in systems like Confluence. This fragment will expect `editor_config.js` to be included via a `<script>` tag (as described above) and that `editor_config.js` may then specify URLs for other dependencies.

---