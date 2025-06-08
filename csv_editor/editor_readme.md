# Config-Driven CSV Editor: User & Configuration Guide

## 1. Introduction

The Config-Driven CSV Editor is a client-side web application designed to provide a structured and user-friendly way to create, view, and modify CSV data. Its primary purpose is to prepare data for use with the "Configurable CSV Dashboard Generator" (the viewer). The editor's behavior, data schema, input types, validation rules, and display filtering are primarily driven by a dedicated `editor_config.js` file. It can also leverage styling hints (like icon definitions and tag colors) from an existing `viewer_config.js` to provide a live preview of how data might appear in the dashboard.

This editor runs entirely in the browser and does not require any third-party JavaScript libraries for its core functionality.

## 2. Core Features

This section details the key capabilities of the CSV Editor.

*   **Schema-Driven Editing:**
    *   The entire structure of the editable grid—which columns appear, their order, their display labels, and how their data is treated—is dictated by the `columns` array within the `editor_config.js` file. This means you define your data's "shape" once in the configuration, and the editor adapts accordingly.

*   **Rich Input Types:**
    *   For each column defined in the schema, you can specify a data `type`, which determines the kind of input control presented to the user when editing a cell:
        *   `text`: A standard single-line text field for general string input.
        *   `textarea`: A multi-line text area suitable for longer descriptions or notes. Can be configured with `displayAsSingleLine: true` to show as a truncated single line in the grid view until clicked for editing.
        *   `checkbox`: A boolean (true/false) input, typically rendered as a clickable checkbox or a toggleable icon in the grid.
        *   `date`: A date input field, usually leveraging the browser's native date picker for easy date selection. Stores dates in YYYY-MM-DD format.
        *   `number`: An input field restricted to numerical values, often with built-in browser spinners for incrementing/decrementing.
        *   `select`: A single-choice picklist. When a cell of this type is clicked, a popup appears allowing the user to select one option from a predefined or dynamically generated list.
        *   `multi-select`: Allows selecting multiple values for a single cell, typically displayed as "tags". A popup interface allows users to check/uncheck multiple options or, if configured, add new custom tags.

*   **Live Cell Preview (Viewer Integration):**
    *   When an optional `viewer_config.js` (the configuration file for the CSV Dashboard Generator) is loaded, the editor can use its `indicatorStyles` definitions.
    *   This means that when cells are not in edit mode, their content can be displayed with the same icons or colored tags that would appear in the viewer dashboard, providing an immediate visual preview of how the data will be interpreted stylistically.

*   **Data Validation:**
    *   The editor supports basic data validation rules defined per column in `editor_config.js`:
        *   `required: true`: Ensures a cell cannot be left empty.
        *   `validationRegex: "pattern"`: For `text` or `textarea` types, allows specifying a JavaScript regular expression pattern that the cell's content must match.
    *   Cells that fail validation (e.g., an empty required field, or text not matching a regex) are visually highlighted, typically with a red border, to alert the user. Tooltips may provide more specific error information.

*   **Dynamic Picklist Options (for `select` and `multi-select`):**
    *   The list of choices available in `select` and `multi-select` popups is highly dynamic and aggregated from several sources to provide comprehensive and relevant options:
        1.  **Explicit Options:** Defined directly in the `columns[n].options` array within `editor_config.js`.
        2.  **Viewer Config Derivation:** If `columns[n].optionsSource: "viewerConfigValueMap"` is set, options are derived from the `valueMap` keys in the corresponding `indicatorStyles` section of the loaded `viewer_config.js`.
        3.  **Relational Lookup with Filtering (New):** Use `columns[n].deriveOptionsFrom` to pull option **values** from another column (e.g., an `ItemID` column) and optionally specify a `labelColumn` to show a friendlier name. This mechanism allows a "Parent" select field to reference other rows, establishing parent/child relationships.
            *   An optional `columns[n].sourceColumnFilter` (using standard filter criteria `{logic, conditions:[]}`) can limit which rows are offered. A common pattern is filtering to only show top-level items as potential parents.
            *   Self-references are automatically excluded (e.g., an entry cannot be its own parent if derived this way).
        4.  **Existing Data Values:** All unique values currently present in the column being edited (or the derived source column, after its own filtering) across all rows of the loaded CSV are automatically included as selectable options.

*   **Adaptive Popup UI for Selects:**
    *   The popup interface for `select` and `multi-select` fields adapts to the number of available options:
        *   For shorter lists, a simple list of radio buttons (for `select`) or checkboxes (for `multi-select`) is shown.
        *   For longer lists (typically 15 or more options), a search/filter input field appears at the top of the popup, allowing users to quickly narrow down the options.
    *   For `multi-select` columns, if `columns[n].allowNewTags: true` is configured, users can type a new value into the popup's search bar and hit Enter to add it as a new custom tag, even if it wasn't in the original list of options. This capability remains even if `sourceColumnFilter` is used for initially populating the list from derived sources.

*   **Data Operations:**
    *   **Add New Row:** A button allows users to append new, empty (or default-valued) rows to the dataset. If display filters are active, new rows (which typically default to "master" status if a parent-child relationship is defined) will appear if they match the current filter.
    *   **Automatic ID Generation (New):** If the configuration includes a column named `ItemID`, newly added rows automatically receive a unique value like `item_[timestamp]_[rand]`, ensuring each entry can be referenced as a parent or child.
    *   **Delete Existing Row:** Each row has a delete button. A confirmation prompt is shown before a row is permanently removed from the dataset.
    *   **Sort Data (Default):** A button allows users to re-apply the default sorting rules (defined in `viewer_config.js`'s `generalSettings.defaultItemSortBy`) and any visual partitioning rules (from `editor_config.js`'s `editorDisplaySettings.partitionBy`) to the entire dataset.

*   **CSV Import/Export:**
    *   **Import:** Users can load existing CSV data into the editor using a file input. This data populates the grid according to the loaded `editor_config.js` schema.
    *   **Export:** The current state of the data grid (all rows and columns, regardless of any active display filter) can be exported back to a CSV file.
        *   The output format (delimiter, boolean representation) is configurable via `csvOutputOptions` in `editor_config.js`.
        *   **Configurable Export Filenames (New):** The base names for the exported CSV data file and the changelog text file can now be specified in `editor_config.js` (e.g., `csvDataFileName: "myProjectData"` and `cumulativeLogName: "myProjectChangelog"`). A timestamp will be appended to these base names.

*   **Change Tracking & Cumulative Changelog:**
    *   The editor tracks changes (additions, deletions, modifications) made to the data relative to when the current CSV file was initially loaded.
    *   **Primary Key for Tracking:** Configuring `changeTrackingPrimaryKeyColumn` in `editor_config.js` with the name of a column containing unique row identifiers greatly improves the accuracy of identifying modified rows versus new/deleted ones, especially if data is sorted.
    *   **View Changes Modal:** A "View Changes" button opens a modal displaying a textual digest of all detected changes for the current session.
    *   **Cumulative Historical Log:**
        *   An optional `cumulativeLogUrl` can be specified in `editor_config.js` pointing to a plain text file containing previously recorded changelogs.
        *   If this URL is provided and the log is successfully fetched, any new changes detected in the current session are **prepended** to the content of this historical log when viewed in the modal or exported. This creates a running, single-file history.
        *   The demarcation includes a timestamp (YYYY-MM-DD HH:MM) for when the new changes were recorded.
    *   **Changelog Export:** When the main CSV data is exported, the (potentially cumulative) changelog is also automatically generated and downloaded as a separate `.txt` file using the configured base name (e.g., `myProjectChangelog_[timestamp].txt`). The user is then responsible for managing this file and updating the `cumulativeLogUrl` for future sessions if they wish to maintain the single historical log.

*   **Visual Data Partitioning:**
    *   The `editorDisplaySettings.partitionBy` option in `editor_config.js` allows for visually separating the grid.
    *   Rows matching a defined filter criteria are grouped together and moved to the bottom of the displayed grid, often separated by a distinct visual line (e.g., "heavyLine").
    *   This reorders the actual `_csvDataInstance` for display purposes but does not hide any data from export.

*   **CSS-Based Display Filtering:**
    *   The `editorDisplaySettings.displayFilters` array in `editor_config.js` allows defining a set of named filters (e.g., "Show All," "Show Masters Only," "Show Active Items").
    *   These filters appear in a dropdown menu above the grid.
    *   When a filter is selected, rows that do *not* match its criteria are hidden using CSS (`display: none`).
    *   **Importantly, the data itself is not removed from the underlying `_csvDataInstance`.** All rows are preserved for editing (if unhidden), sorting, partitioning, and are always included in CSV exports. This feature purely controls the visual presentation in the grid.

*   **Hierarchy View (New):**
    *   When `editorDisplaySettings.hierarchyView.enabled` is `true`, the grid shows parent and child rows in an indented tree structure.
    *   Configure `idColumn` and `parentColumn` to specify which columns store the unique ID and parent reference.
*   Root rows and their children are automatically sorted using the viewer's default sort settings (sorting is skipped when data is already partitioned).
*   Indentation is applied to the second column (typically the title) while the ID column remains flush.

*   **Configuration Preloading:**
    *   To streamline setup, the main `editor_config.js` (which must be included via a `<script>` tag in `editor.html`) can define a `preloadUrls` object.
    *   This object can contain URLs to automatically fetch:
        *   `viewerConfigUrl`: The `viewer_config.js` for styling and sort defaults.
        *   `csvDataUrl`: An initial CSV data file to populate the grid.
        *   `cumulativeLogUrl`: The historical changelog text file.
    *   If preloading is successful for a given file type, the corresponding manual file input in the UI can be hidden. Manual file inputs remain available as fallbacks or for overriding preloaded files.

*   **Client-Side Operation:**
    *   The entire editor application runs within the user's web browser. No server-side processing or database is required for its core functionality, making it portable and easy to deploy.

## 3. Getting Started / Usage Flow

1.  **Prepare Configuration Files:**
    *   **`editor_config.js` (Required):** Create this file based on the schema described in Section 4. This defines your data structure for editing, picklist sources, and display filters.
    *   **`viewer_config.js` (Optional but Recommended):** The configuration file used by your CSV Dashboard Generator. The editor uses this for styling previews, deriving some picklist options, and default sorting.
    *   **CSV Data File (Optional for initial load):** Your existing CSV data.
    *   **Historical Changelog File (Optional):** A plain text file containing previous changelogs if using the `cumulativeLogUrl` feature.
2.  **Embed `editor_config.js` in `editor.html`:**
    Modify `editor.html` to include your primary editor configuration file via a script tag:
    ```html
    <!-- In editor.html, before editor_app.js -->
    <script src="path/to/your/editor_config.js"></script>
    ```
    The `editor_config.js` file must define a global variable `window.editorConfig`.
3.  **Host Files:** Place `editor.html`, its CSS/JS subdirectories, your config files, and any data files to be preloaded on a web server or use a local server for development.
4.  **Open `editor.html` in your Browser.**
    *   The editor attempts to load `window.editorConfig`.
    *   It then attempts to load `viewerConfigUrl`, `csvDataUrl`, and `cumulativeLogUrl` if specified.
    *   The display filter dropdown will populate based on `editor_config.js`.
5.  **Manual File Loading (if preloads fail or are not specified):**
    *   Use the "Choose File" buttons to load or override configurations and data.
6.  **Select Display Filter (Optional):** Use the dropdown menu (if configured and populated) to filter the rows displayed in the grid (e.g., "Show Masters Only").
7.  **Edit Data:** Click a cell to edit. Input controls vary by column type.
8.  **Use Actions:**
    *   **+ Add Row:** Adds a new row (typically as a "master" item). It will be visible if it matches the current display filter.
    *   **Sort Data (Default):** Sorts/partitions the entire dataset. The current display filter is then re-applied.
    *   **Export to CSV:** Downloads the *entire current grid data* as a CSV, plus the (cumulative) changelog.
    *   **View Changes:** Opens a modal showing new changes prepended to any loaded historical changelog.

## 4. `editor_config.js` Schema Definition

The `editor_config.js` file exports a single object assigned to `window.editorConfig`.

## Filter Condition Types (`filterType`)

When defining filter conditions within a `filter` object (for tabs in the viewer, or for `partitionBy` / `displayFilters` / `sourceColumnFilter` in the editor), the `filterType` property specifies the kind of comparison to perform. The `filterValue` property provides the value(s) to compare against.

Here are the available `filterType` options:

| `filterType`      | Description                                                                 | `filterValue` Type             | Notes                                                                                                                               |
|-------------------|-----------------------------------------------------------------------------|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| `valueEquals`     | Row's column value **equals** `filterValue`.                                | String, Number, Boolean        | Case-insensitive for strings. For booleans, it checks against the string representation (e.g., "TRUE", "false").                      |
| `valueIsNot`      | Row's column value **does not equal** `filterValue`.                        | String, Number, Boolean        | Case-insensitive for strings.                                                                                                       |
| `valueInList`     | Row's column value is **one of the values** in the `filterValue` array.     | Array of (String, Number)      | `filterValue` must be an array. Case-insensitive for string comparisons within the list.                                            |
| `valueNotInList`  | Row's column value is **not one of the values** in the `filterValue` array. | Array of (String, Number)      | `filterValue` must be an array. Case-insensitive for string comparisons within the list.                                            |
| `valueNotEmpty`   | Row's column value is **not empty** (not null, undefined, or an empty string). | `null` (not used)              | `filterValue` is not applicable for this type.                                                                                      |
| `valueIsEmpty`    | Row's column value is **empty** (null, undefined, or an empty string).        | `null` (not used)              | `filterValue` is not applicable for this type.                                                                                      |
| `booleanTrue`     | Row's column value evaluates to **true** (based on `generalSettings.trueValues`). | `null` (not used)              | `filterValue` is not applicable. Uses `isTruthy()` logic.                                                                           |
| `booleanFalse`    | Row's column value evaluates to **false** (not true based on `generalSettings.trueValues`). | `null` (not used)              | `filterValue` is not applicable. Uses `!isTruthy()` logic.                                                                          |
| `contains`        | Row's column value (as a string) **contains** the `filterValue` string.      | String                         | Case-insensitive substring match.                                                                                                   |
| `doesNotContain`  | Row's column value (as a string) **does not contain** the `filterValue` string. | String                         | Case-insensitive substring match.                                                                                                   |
| `catchAll`        | **(Summary View Sections Only)** Matches any row not matched by preceding sections in the same summary view. | `null` (not used)              | `filterValue` and `filterColumn` are not applicable. Must be the last section if used.                                               |

**How it Works with Multi-Value Columns:**

When a filter condition is applied to a column that has been configured as a multi-value column (e.g., "Tags" containing "Alpha, Beta, Gamma"):

*   For `valueEquals`, `valueInList`, `contains`: The condition is met if **any** of the individual values within the cell's array match the criteria.
    *   Example: If "Tags" is `["Alpha", "Beta"]` and `filterType: 'valueEquals'`, `filterValue: 'Beta'`, the row matches.
*   For `valueIsNot`, `valueNotInList`, `doesNotContain`: The condition is met if **all** of the individual values within the cell's array meet the criteria (i.e., none of them cause a mismatch).
    *   Example: If "Tags" is `["Alpha", "Beta"]` and `filterType: 'valueIsNot'`, `filterValue: 'Charlie'`, the row matches. If `filterValue: 'Beta'`, the row does *not* match.
*   For `valueNotEmpty`: The condition is met if the array of values is not empty (i.e., contains at least one non-empty string after splitting and trimming).
*   For `valueIsEmpty`: The condition is met if the array of values is empty or all its contained values are empty strings.
*   For `booleanTrue` / `booleanFalse`: The condition is met if any/all values in the array evaluate to true/false respectively, based on the `logic` of the filter group (AND/OR). Typically, you'd use `valueEquals` or `valueInList` with specific boolean string representations for multi-value boolean-like fields.

**Filter Logic (`logic` property):**

When multiple conditions are provided in a `conditions` array, the `logic` property (at the same level as `conditions`) determines how they are combined:
*   `"AND"` (default): All conditions must be true for the row to match.
*   `"OR"`: At least one condition must be true for the row to match.

```javascript
window.editorConfig = {
  "editorSchemaVersion": 1.0,

  "preloadUrls": {
    "viewerConfigUrl": "./viewer_config.js",       // Optional
    "csvDataUrl": "./initial_data.csv",             // Optional
    "cumulativeLogUrl": "./changelog_history.txt" // Optional, New
  },

   "csvDataFileName": "myProject_EditedData", // Base name for exported CSV data
   "cumulativeLogName": "myProject_ChangeLog",  // Base name for exported changelog text file
   // Timestamp will be appended to these, e.g., myProject_EditedData_YYYYMMDD_HHMMSS.csv

  "changeTrackingPrimaryKeyColumn": "UniqueIDColumn", // Optional, Recommended

  "csvOutputOptions": {
    "delimiter": ",",
    "booleanTrueValue": "TRUE",
    "booleanFalseValue": "FALSE"
  },

  "editorDisplaySettings": { // Optional
    "partitionBy": { // Optional: For visual partitioning
      "enabled": true,
      "filter": { /* ... filter criteria ... */ },
      "separatorStyle": "heavyLine"
    },
    "displayFilters": [ // Optional: For CSS-based display filtering (New)
      {
        "id": "show-all",
        "label": "Show All Items",
        "isDefault": true,
        "criteria": null // null means show all
      },
      {
        "id": "masters-only",
        "label": "Show Master Items",
        "criteria": {
          "logic": "AND",
          "conditions": [ { "column": "ParentItemColumn", "filterType": "valueIsEmpty" } ]
        }
      }
      // ... more custom filters ...
    ],
    "hierarchyView": {
      "enabled": true,
      "idColumn": "ItemID",
      "parentColumn": "ParentItemID"
    }
  },

  "columns": [
    {
      "name": "CSV_Header_Name",
      "label": "Display Label",
      "type": "text", // text, textarea, select, checkbox, date, number, multi-select
      "required": false,
      "readOnly": false,
      "validationRegex": "^[A-Z]-\\d+$", // Optional JS regex string
      "columnWidth": "150px",
      "orientation": "vertical", // Optional: "horizontal" or "vertical" for header text

      // For type: "textarea"
      "displayAsSingleLine": true, // Optional: If true, show as single truncated line in grid view

      // For type: "select" or "multi-select"
      "optionsSource": "viewerConfigValueMap", // "viewerConfigValueMap" or "editorConfig" (default if `options` present)
      "options": ["Option A", { "value": "opt_b", "label": "Option B" }], // Explicit options
      "deriveOptionsFrom": { "column": "AnotherColumnName", "labelColumn": "LabelField" }, // Optional: derive options from existing rows
      "sourceColumnFilter": { // Optional filter for options derived via deriveOptionsFrom
        "logic": "AND",
        "conditions": [
          { "column": "ColumnInSourceRow", "filterType": "valueIsEmpty" }
          // e.g., only use 'AnotherColumnName' values from rows where 'ColumnInSourceRow' is empty
        ]
      },      
      "viewerStyleColumnName": "StatusColumnInViewerConfig", // For styling based on another column's viewer style

      // For type: "multi-select"
      "allowNewTags": true
    }
    // ... more column definitions
  ]
};