

# CSV Dashboard Generator: config.js Documentation

This document provides a detailed explanation of all configuration options available in the `config.js` file for the CSV Dashboard Generator. This file controls every aspect of the dashboard, from data loading and parsing to view rendering and styling.

## Overall Structure

The `config.js` file exports a single object, typically named `defaultConfig`.

```javascript
let defaultConfig = {
  "configVersion": 9.0, // Version of the configuration schema
  "csvHeaders": [],    // Automatically populated by the application

  "generalSettings": { /* ... */ },
  "indicatorStyles": { /* ... */ },
  "tabs": [ /* ... */ ]
};
```

---

## 1. Root Level Properties

### `configVersion`
*   **Type:** `Number`
*   **Description:** A version number for your configuration file. This can be useful for tracking changes to your config schema if you evolve it over time. The application itself might use this for compatibility checks in future versions.
*   **Example:** `"configVersion": 9.0`

### `csvHeaders`
*   **Type:** `Array<String>`
*   **Description:** This array is **automatically populated by the application** when a CSV file is loaded. It will contain the header names extracted from the first row of the CSV. You do not need to manually set this.
*   **Example (Auto-populated):** `csvHeaders: ["ItemID", "ItemName", "Status", ...]`

---

## 2. `generalSettings`

This object contains global settings that apply to the entire dashboard.

```javascript
"generalSettings": {
  "dashboardTitle": "My Project Dashboard",
  "csvUrl": null,
  "trueValues": ["TRUE", "Yes", "1", "Done"],
  "csvDelimiter": ",",
  "multiValueColumns": ["Tags", "Assignees"],
  "linkColumns": ["TaskLink", "TicketID"],
  "linkPrefixes": {
    "TicketID": "https://issues.example.com/browse/"
  },
  "defaultCardIndicatorColumns": ["Status", "Priority"],
  "defaultItemSortBy": [{ "column": "DueDate", "direction": "asc" }]
}
```

### `dashboardTitle`
*   **Type:** `String`
*   **Description:** The main title displayed at the top of the dashboard and in the browser tab.
*   **Example:** `"dashboardTitle": "Aethelgard's Arcane Archives"`

### `csvUrl`
*   **Type:** `String | null`
*   **Description:**
    *   If a URL string is provided (e.g., `"./sample_data/my_data.csv"`), the application will attempt to fetch the CSV data from this URL on load.
    *   If the URL fetch fails (e.g., network error, file not found, CORS issue), the application will **fall back to file upload mode**, allowing the user to upload a CSV manually.
    *   If `null` or an empty string, the application will start in file upload mode by default.
*   **Example (URL load):** `"csvUrl": "https://api.example.com/data.csv"`
*   **Example (File upload):** `"csvUrl": null`

### `trueValues`
*   **Type:** `Array<String>`
*   **Description:** A list of strings that should be interpreted as "true" when performing boolean checks (e.g., for `booleanTrue` / `booleanFalse` filters or for `isTruthy` checks in icon styling). Comparisons are case-insensitive.
*   **Example:** `"trueValues": ["TRUE", "true", "Yes", "1", "Cursed", "Active", "Done", "✓"]`

### `csvDelimiter`
*   **Type:** `String`
*   **Description:** The character used to separate values in your CSV file.
*   **Common Values:** `","` (comma), `";"` (semicolon), `"\t"` (tab).
*   **Example:** `"csvDelimiter": ","`

### `multiValueColumns`
*   **Type:** `Array<String>`
*   **Description:** A list of column header names where the cell content should be treated as multiple distinct values. These values are expected to be separated by a comma (`,`) within the cell. The application will split these into an array of strings.
*   **Example:** `"multiValueColumns": ["Keywords", "AssignedTeams", "AffectedSystems"]`
    *   If a cell in the "Keywords" column contains `"Magic,Scroll,Ancient"`, it will be parsed as `["Magic", "Scroll", "Ancient"]`.

### `linkColumns`
*   **Type:** `Array<String>`
*   **Description:** A list of column header names whose values should be rendered as clickable links (typically with a 🔗 icon).
    *   If the cell value is a full URL (starts with `http://` or `https://`), it will be used directly.
    *   If the cell value is an ID, and a corresponding prefix is defined in `linkPrefixes`, a full URL will be constructed.
*   **Example:** `"linkColumns": ["WikiLink", "ItemID", "ReferenceDocument"]`

### `linkPrefixes`
*   **Type:** `Object | null`
*   **Description:** An object mapping column names (from `linkColumns`) to a URL prefix. The cell's value (assumed to be an ID) will be appended to this prefix to form the complete link. Columns listed in `linkColumns` but *not* here will be treated as potentially containing full URLs.
*   **Example:**
    ```javascript
    "linkPrefixes": {
      "ItemID": "https://aethelgard-archive.local/wiki/item/",
      "JiraTicket": "https://jira.example.com/browse/"
    }
    ```
    *   If `ItemID` column has value `SCR001`, the link becomes `https://aethelgard-archive.local/wiki/item/SCR001`.
    *   If `WikiLink` (from `linkColumns`) has value `https://example.com/docs/page1`, it's used directly as it's not in `linkPrefixes`.

### `defaultCardIndicatorColumns`
*   **Type:** `Array<String> | null`
*   **Description:** A default list of column header names to be displayed as indicators on cards in Kanban and Summary views. This is used if a specific Kanban or Summary tab does *not* define its own `cardIndicatorColumns` in its `config`.
*   **Example:** `"defaultCardIndicatorColumns": ["Status", "Priority", "Assignee", "DangerLevel"]`

### `defaultItemSortBy`
*   **Type:** `Array<Object> | null`
*   **Description:** Defines the default sorting order for items. This is used:
    *   As the initial sort order for **Table** views if the table tab's `config` does not specify its own `sortBy`.
    *   For sorting items *within* each column/group in **Kanban** views if the Kanban tab's `config` does not specify its own `itemSortBy`.
    *   For sorting items *before* they are grouped into sections in **Summary** views if the Summary tab's `config` does not specify its own `itemSortBy`.
*   **Structure:** An array of sort objects. Each object has:
    *   `column`: (String) The header name of the column to sort by.
    *   `direction`: (String) Can be `'asc'` (ascending), `'desc'` (descending), or `'custom'`.
    *   `order`: (Array<String> - *Required if `direction` is `'custom'`*) An array specifying the exact order of values. Values not in this array are typically sorted alphabetically after the specified ones.
*   **Example:**
    ```javascript
    "defaultItemSortBy": [
      { "column": "DangerLevel", "direction": "custom", "order": ["Existential Risk", "Significant Threat", "Minor Anomaly", "Mundane"] },
      { "column": "DiscoveryDate", "direction": "desc" }
    ]
    ```

---

## 3. `indicatorStyles`

This object maps column header names to specific styling rules for how their values should be displayed (e.g., as icons, tags, or plain text).

```javascript
"indicatorStyles": {
  "ColumnName1": { /* Style config for ColumnName1 */ },
  "ColumnName2": { /* Style config for ColumnName2 */ }
}
```

Each key in `indicatorStyles` is a column header name from your CSV. The value is an object defining the styling.

### Common Style Object Properties (used within `valueMap`, `styleRules`, `defaultStyle`):

*   `value`: (String - For `type: 'icon'`) The icon/emoji character(s) to display. An empty string (`""`) means no icon will be rendered for that specific value.
*   `text`: (String - For `type: 'tag'`) Optional text to display inside the tag instead of the raw cell value. An empty string (`""`) can be used to render an empty tag (if `bgColor` is set) or effectively hide the tag if no other styles make it visible.
*   `cssClass`: (String - For `type: 'icon'`) A CSS class name to be added to the icon's `<span>` element, allowing for further custom styling via CSS.
*   `bgColor`: (String - For `type: 'tag'`) The background color of the tag (e.g., `"#e9d8fd"`, `"rgba(0,0,0,0.1)"`, `"lightcoral"`).
*   `textColor`: (String - For `type: 'tag'`) The text color of the tag.
*   `borderColor`: (String - For `type: 'tag'`) The border color of the tag. If not specified, it often defaults to `bgColor`.
*   `title`: (String) Custom hover tooltip text for the icon or tag. If not provided, a default title is often generated (e.g., "ColumnName: CellValue").

### Styling Types:

#### a) `type: 'icon'`
Renders the cell value as an icon or emoji.
*   **`type`**: (String) Must be `"icon"`.
*   **`titlePrefix`**: (Optional String) Text to prepend to the auto-generated tooltip if a specific `title` isn't provided in `trueCondition` or `valueMap`. Example: `"Type: "`.
*   **`trueCondition`**: (Optional Object) Used primarily for boolean-like columns. If the cell value evaluates to "true" (based on `generalSettings.trueValues`), this style is applied.
    *   Contains `value`, `cssClass`, `title` (see Common Style Object Properties).
    *   **Example:**
        ```javascript
        "IsCursed": {
          "type": "icon",
          "trueCondition": { "value": "☠️", "title": "Cursed!", "cssClass": "icon-cursed" }
          // To hide "FALSE" values, add a valueMap:
          // "valueMap": { "FALSE": {"value": ""}, "false": {"value": ""} }
        }
        ```
*   **`valueMap`**: (Optional Object) Maps specific cell values to icon styles.
    *   Keys are the exact cell values (case-sensitive match first, then case-insensitive fallback for convenience).
    *   Values are objects with `value`, `cssClass`, `title`.
    *   A special key `'default'` can provide a fallback icon style if no other value matches.
    *   To explicitly *hide* an icon for a specific value (like "FALSE", "0", or an empty string), map that value to an object with `value: ""`.
    *   **Example:**
        ```javascript
        "ItemType": {
          "type": "icon", "titlePrefix": "Type: ",
          "valueMap": {
            "Scroll":   { "value": "📜", "title": "Scroll" },
            "Artifact": { "value": "💎", "title": "Artifact" },
            "FALSE":    { "value": "" }, // Hide icon for "FALSE"
            "default":  { "value": "❓", "title": "Unknown Item Type" }
          }
        }
        ```

#### b) `type: 'tag'`
Renders the cell value as a styled tag (pill). Tags support text wrapping.
*   **`type`**: (String) Must be `"tag"`.
*   **`titlePrefix`**: (Optional String) Text prepended to the value in the tag's hover title if a specific `title` isn't provided in `valueMap` or `styleRules`. Example: `"Status: "`.
*   **`layout: 'stacked'`**: (Optional String) If set to `'stacked'`, and the column is a multi-value column (defined in `generalSettings.multiValueColumns`), each value will be displayed as a separate tag stacked vertically. Otherwise, tags for multi-value items appear inline.
*   **`valueMap`**: (Optional Object - Simpler Method) Maps specific cell values to tag styles.
    *   Keys are cell values (case-sensitive match first, then case-insensitive fallback).
    *   Values are objects with `text`, `bgColor`, `textColor`, `borderColor`, `title` (see Common Style Object Properties).
    *   A `'default'` key provides a fallback style.
    *   **Example:**
        ```javascript
        "LocationFound": {
          "type": "tag", "titlePrefix": "Location: ",
          "valueMap": {
            "Sunken Library":   { "bgColor": "#cfe2ff", "textColor": "#0a367a" },
            "Obsidian Peak":    { "bgColor": "#adb5bd", "textColor": "#ffffff", "text": "Mt. Obsidian" },
            "default":          { "bgColor": "#e9ecef", "textColor": "#495057" }
          }
        }
        ```
*   **`styleRules`**: (Optional Array<Object> - Advanced Method) An array of rules evaluated in order. The *first* rule that matches applies its style. This allows for more complex conditional styling, including regular expressions. **If `styleRules` is present, `valueMap` for the same column is typically ignored or used as a final fallback if no rules match and no `defaultStyle` is provided.**
    *   Each rule object has:
        *   `matchType`: (String) Either `'regex'` or `'exact'`.
        *   `pattern`: (String - Required for `matchType: 'regex'`) The regular expression string (e.g., `"^High"` to match values starting with "High"). The regex is typically case-insensitive by default in the matching logic.
        *   `value`: (String - Required for `matchType: 'exact'`) The exact string value to match (case-sensitive).
        *   `style`: (Object) The style object to apply if the rule matches. Contains properties like `text`, `bgColor`, `textColor`, `borderColor`, `title`.
    *   **Example:**
        ```javascript
        "DangerLevel": {
          "type": "tag", "titlePrefix": "Danger: ",
          "styleRules": [
            { "matchType": "exact", "value": "Existential Risk", "style": { "bgColor": "#6f1d1b", "textColor": "#ffffff", "text": "💀 Existential Risk" } },
            { "matchType": "regex", "pattern": "^High", "style": { "bgColor": "#dc3545", "textColor": "#ffffff" } }, // Matches "High Threat", "High Alert"
            { "matchType": "exact", "value": "Mundane", "style": { "bgColor": "#d1e7dd", "textColor": "#0f5132", "text": "⚪ Mundane" } }
          ],
          "defaultStyle": { "bgColor": "#e9ecef", "textColor": "#495057", "title": "Standard Danger" } // Applied if no rules match
        }
        ```
*   **`defaultStyle`**: (Optional Object - Used with `styleRules`) A style object applied if no rules in `styleRules` match.
    *   Contains `text`, `bgColor`, `textColor`, `borderColor`, `title`.

#### c) `type: 'none'`
The cell value will be displayed as plain text. This is useful if the column is handled by `generalSettings.linkColumns` or if no special styling is needed.
*   **`type`**: (String) Must be `"none"`.
*   **Example:**
    ```javascript
    "ItemName": { "type": "none" }
    ```

---

## 4. `tabs`

This is an array of objects, where each object defines a view (a tab) in the dashboard.

```javascript
"tabs": [
  { /* Tab 1 Configuration */ },
  { /* Tab 2 Configuration */ },
  // ... more tabs
]
```

### Common Properties for All Tab Types:

*   **`id`**:
    *   **Type:** `String`
    *   **Description:** A unique identifier for the tab. Used for DOM element IDs and internal references. Should be URL-friendly (e.g., no spaces or special characters other than hyphens/underscores).
    *   **Example:** `"master-catalog-table"`
*   **`title`**:
    *   **Type:** `String`
    *   **Description:** The text displayed on the tab button.
    *   **Example:** `"📜 Master Catalog"`
*   **`type`**:
    *   **Type:** `String`
    *   **Description:** Specifies the kind of view to render for this tab.
    *   **Possible Values:** `'table'`, `'kanban'`, `'summary'`, `'counts'`, `'graph'`.
    *   **Example:** `"type": "kanban"`
*   **`enabled`**:
    *   **Type:** `Boolean`
    *   **Description:** Set to `true` to show this tab, `false` to hide it.
    *   **Example:** `"enabled": true`
*   **`bgColor`**:
    *   **Type:** `String` (Optional)
    *   **Description:** Custom background color for this specific tab button. Overrides default tab button styling.
    *   **Example:** `"#e2f0d9"`
*   **`textColor`**:
    *   **Type:** `String` (Optional)
    *   **Description:** Custom text color for this specific tab button.
    *   **Example:** `"#537d3b"`
*   **`filter`**:
    *   **Type:** `Object | null`
    *   **Description:** Defines filtering rules to apply to the data *before* it is passed to this tab's renderer. If `null` or omitted, no filter is applied (all data is passed).
    *   **Structure:**
        *   `logic`: (String) How to combine the `conditions`. Can be `'AND'` (default) or `'OR'`.
        *   `conditions`: (Array<Object>) An array of filter condition objects. Each condition object has:
            *   `column`: (String) The header name of the column to filter on.
            *   `filterType`: (String) The type of comparison to perform. Examples:
                *   `'valueEquals'`: Exact match (case-insensitive for strings).
                *   `'valueIsNot'`: Not an exact match.
                *   `'valueInList'`: Value is one of a list of specified values. `filterValue` should be an array.
                *   `'valueNotInList'`: Value is not one of a list. `filterValue` should be an array.
                *   `'valueNotEmpty'`: Cell value is not null, undefined, or an empty string.
                *   `'valueIsEmpty'`: Cell value is null, undefined, or an empty string.
                *   `'booleanTrue'`: Cell value evaluates to true (based on `generalSettings.trueValues`).
                *   `'booleanFalse'`: Cell value evaluates to false.
                *   `'contains'`: String value contains the `filterValue` (case-insensitive).
                *   `'doesNotContain'`: String value does not contain the `filterValue`.
                *   *(Numeric/Date comparisons like `greaterThan`, `lessThan` might be added in future or handled by specific filter types).*
            *   `filterValue`: (String | Number | Array) The value(s) to compare against. For `valueInList` or `valueNotInList`, this should be an array.
    *   **Example:**
        ```javascript
        "filter": {
          "logic": "AND",
          "conditions": [
            { "column": "Status", "filterType": "valueIsNot", "filterValue": "Complete" },
            { "column": "Priority", "filterType": "valueEquals", "filterValue": "High" }
          ]
        }
        ```
*   **`config`**:
    *   **Type:** `Object`
    *   **Description:** An object containing configuration options specific to the `type` of this tab. See view-specific configurations below.

---

### View-Specific `config` Properties:

#### 4.1 `type: 'table'`

*   **`config.displayColumns`**:
    *   **Type:** `Array<String>`
    *   **Description:** An ordered list of column header names to be displayed in the table.
    *   **Example:** `["ItemID", "ItemName", "Status", "DangerLevel"]`
*   **`config.columnWidths`**:
    *   **Type:** `Object` (Optional)
    *   **Description:** Maps column header names to CSS width values (e.g., `"150px"`, `"10%"`). A `'default'` key can set a default width for columns not explicitly listed.
    *   **Example:** `{"default": "100px", "ItemName": "250px", "Notes": "30%"}`
*   **`config.headerOrientations`**:
    *   **Type:** `Object` (Optional)
    *   **Description:** Maps column header names to `'horizontal'` or `'vertical'` (default) for the header text orientation. A `'default'` key can set a default orientation.
    *   **Example:** `{"default": "vertical", "ItemName": "horizontal"}`
*   **`config.sortBy`**:
    *   **Type:** `Array<Object>` (Optional)
    *   **Description:** Defines the *initial* sort order for the table. If omitted, the table will use `generalSettings.defaultItemSortBy`. If both are omitted, data appears in its original CSV order.
    *   **Structure:** Same as `generalSettings.defaultItemSortBy` (array of objects with `column`, `direction`, and optional `order` for custom sorts).
    *   **Example:**
        ```javascript
        "sortBy": [
          { "column": "Status", "direction": "desc" },
          { "column": "ItemName", "direction": "asc" }
        ]
        ```

#### 4.2 `type: 'kanban'`

*   **`config.groupByColumn`**:
    *   **Type:** `String`
    *   **Description:** The header name of the column whose unique values will form the Kanban columns (groups).
    *   **Example:** `"Status"`
*   **`config.groupSortBy`**:
    *   **Type:** `String | Array<String>` (Optional)
    *   **Description:** How to sort the Kanban columns themselves.
        *   `'keyAsc'` (default): Sort column titles alphabetically A-Z.
        *   `'keyDesc'`: Sort column titles alphabetically Z-A.
        *   `'countAsc'`: Sort columns by the number of items they contain, ascending.
        *   `'countDesc'`: Sort columns by item count, descending.
        *   `Array<String>`: A specific custom order for column titles. Columns not in this array are typically appended alphabetically.
    *   **Example (String):** `"groupSortBy": "countDesc"`
    *   **Example (Array):** `"groupSortBy": ["Not Started", "In Progress", "Blocked", "Complete"]`
*   **`config.cardTitleColumn`**:
    *   **Type:** `String`
    *   **Description:** The header name of the column whose value will be used as the main title on each Kanban card.
    *   **Example:** `"ItemName"`
*   **`config.cardIndicatorColumns`**:
    *   **Type:** `Array<String>` (Optional)
    *   **Description:** A list of column header names to display as indicators on each card. If omitted, `generalSettings.defaultCardIndicatorColumns` is used.
    *   **Example:** `["Priority", "DueDate", "Assignee"]`
*   **`config.cardLinkColumn`**:
    *   **Type:** `String` (Optional)
    *   **Description:** The header name of a column containing a URL (or an ID to be used with `generalSettings.linkPrefixes`). If set, the card title will become a clickable link pointing to this URL.
    *   **Example:** `"WikiLink"`
*   **`config.itemSortBy`**:
    *   **Type:** `Array<Object>` (Optional)
    *   **Description:** Defines the sort order for cards *within* each Kanban column. If omitted, `generalSettings.defaultItemSortBy` is used.
    *   **Structure:** Same as table `sortBy`.
    *   **Example:** `[{ "column": "Priority", "direction": "custom", "order": ["High", "Medium", "Low"] }]`
*   **`config.layout`**:
    *   **Type:** `Object` (Optional)
    *   **Description:** Visual layout settings for the Kanban board.
        *   `minColumnWidth`: (String) Minimum width for Kanban columns (e.g., `"300px"`).
        *   `columnGap`: (String) Gap between columns (e.g., `"15px"`).
        *   `itemGap`: (String) Gap between item cards within a column (or between stacked group blocks).
        *   `maxItemsPerGroupInColumn`: (Number) If multiple Kanban group blocks would stack vertically in a wide grid cell, this limits how many before forcing a new visual column in the grid.
        *   `preventStackingAboveItemCount`: (Number) If a single Kanban group (e.g., "Status: In Progress") has more than this many items, it will try to occupy its own full-width column in the grid layout, preventing other smaller groups from stacking next to it.
    *   **Example:** `{"minColumnWidth": "320px", "columnGap": "10px", "maxItemsPerGroupInColumn": 3}`

#### 4.3 `type: 'summary'`

*   **`config.groupByColumn`**:
    *   **Type:** `String` (Optional)
    *   **Description:** If provided, items *within* each summary section will be further grouped into sub-columns based on the unique values in this column.
    *   **Example:** `"ApplicationName"` (to group findings by application within a "High Risk" section).
*   **`config.cardIndicatorColumns`**:
    *   **Type:** `Array<String>` (Optional)
    *   **Description:** List of column headers for indicators on cards within summary sections. Defaults to `generalSettings.defaultCardIndicatorColumns` if omitted.
    *   **Example:** `["Status", "RiskLevel", "Owner"]`
*   **`config.cardTitleColumn`**:
    *   **Type:** `String` (Optional - but recommended if `groupByColumn` is used)
    *   **Description:** The column whose value becomes the title of each card within a sub-group (or list item if no `groupByColumn`).
    *   **Example:** `"ExceptionTitle"`
*   **`config.cardLinkColumn`**:
    *   **Type:** `String` (Optional)
    *   **Description:** Column for the card title link URL/ID within summary sections.
    *   **Example:** `"Link"`
*   **`config.itemSortBy`**:
    *   **Type:** `Array<Object>` (Optional)
    *   **Description:** Sort order applied to data *before* it's filtered into sections and (optionally) sub-grouped. Defaults to `generalSettings.defaultItemSortBy` if omitted.
    *   **Structure:** Same as table `sortBy`.
*   **`config.internalLayout`**:
    *   **Type:** `Object` (Optional)
    *   **Description:** Layout settings (like `minColumnWidth`, `columnGap`, `itemGap`) applied to the grid *inside* each summary section if `groupByColumn` is used.
    *   **Example:** `{"minColumnWidth": "350px", "itemGap": "8px"}`
*   **`config.sections`**:
    *   **Type:** `Array<Object>`
    *   **Description:** Defines the distinct sections of the summary view. Items are processed by these sections in order.
    *   Each section object has:
        *   `id`: (String) Unique ID for the section.
        *   `title`: (String) Title displayed for the section.
        *   `filterColumn`: (String | null) The column to check for this section's filter criteria. If `null`, it's often used with `filterType: 'catchAll'`.
        *   `filterType`: (String) The filter type (same as tab-level filters like `'valueEquals'`, `'valueInList'`, etc.). Use `'catchAll'` for the last section to include any items not matched by previous sections.
        *   `filterValue`: (Any) The value for the filter comparison.
        *   `bgColor`: (Optional String) Background color for the section block.
        *   `textColor`: (Optional String) Text color for the section block.
    *   **Example:**
        ```javascript
        "sections": [
          { "id": "sec-high-risk", "title": "🔥 High Risk Items", "filterColumn": "RiskLevel", "filterType": "valueEquals", "filterValue": "High", "bgColor": "#f8d7da" },
          { "id": "sec-pending", "title": "⏳ Pending Review", "filterColumn": "Status", "filterType": "valueEquals", "filterValue": "Pending", "bgColor": "#fff3cd" },
          { "id": "sec-other", "title": "Other Items", "filterColumn": null, "filterType": "catchAll" }
        ]
        ```

#### 4.4 `type: 'counts'`

*   **`config.groupByColumn`**:
    *   **Type:** `String`
    *   **Description:** The header name of the column whose unique values will form the main groups for counting (e.g., count "Blocked Tasks" *per Project*).
    *   **Example:** `"LocationFound"`
*   **`config.counters`**:
    *   **Type:** `Array<Object>`
    *   **Description:** Defines what to count. Each object in the array is a counter definition.
        *   **Predefined Counter:** Counts items matching specific criteria.
            *   `title`: (String) The display title for this counter (e.g., "☠️ Cursed Items").
            *   `logic`: (Optional String - For multi-condition filters) `'AND'` or `'OR'` to combine `conditions`. Defaults to `'AND'`.
            *   `conditions`: (Optional Array<Object> - For multi-condition filters) An array of filter condition objects, same structure as tab-level filter conditions (`column`, `filterType`, `filterValue`).
            *   `column`: (String - For single-condition legacy format) Column to filter on.
            *   `filterType`: (String - For single-condition legacy format) Filter type.
            *   `filterValue`: (Any - For single-condition legacy format) Filter value.
            *   `display`: (Optional Object) How to display the counter's title icon/text.
                *   `type`: `'icon'` or `'text'`.
                *   `value`: The icon character or text string.
                *   `cssClass`: (Optional String) CSS class for the display element.
            *   **Example (Predefined - Multi-condition):**
                ```javascript
                {
                  "title": "Contained Threats",
                  "logic": "AND",
                  "conditions": [
                    { "column": "RequiresContainment", "filterType": "booleanTrue" },
                    { "column": "ResearchStatus", "filterType": "valueEquals", "filterValue": "Requires Containment" }
                  ],
                  "display": { "type": "icon", "value": "🔒"}
                }
                ```
        *   **Dynamic Counter (`countAllValues`)**: Counts occurrences of all unique values within a specified column, for each `groupByColumn` group.
            *   `column`: (String) The header name of the column whose unique values you want to count (e.g., count all unique "ItemType"s).
            *   `filterType`: (String) Must be the exact string `'countAllValues'`.
            *   `title`: (Optional String) A title for this dynamic grouping (e.g., "Item Type Breakdown").
            *   `display`: (Optional Object) An overall icon/text for this dynamic grouping.
            *   **Example (Dynamic):**
                ```javascript
                {
                  "title": "Status Breakdown by Location", // Overall title for this counter group
                  "column": "ResearchStatus", // Column whose values will be counted
                  "filterType": "countAllValues"
                  // groupByColumn is taken from the parent config.groupByColumn ("LocationFound" in this example)
                }
                ```

#### 4.5 `type: 'graph'`

*   **`config.primaryNodeIdColumn`**:
    *   **Type:** `String`
    *   **Description:** The column header name containing unique IDs for the primary nodes in the graph.
    *   **Example:** `"ItemID"`
*   **`config.primaryNodeLabelColumn`**:
    *   **Type:** `String`
    *   **Description:** The column header name whose values will be used as labels for the primary nodes.
    *   **Example:** `"ItemName"`
*   **`config.categoryNodeColumns`**:
    *   **Type:** `Array<String>`
    *   **Description:** A list of column header names whose unique values will become "category" nodes. Edges will be created from primary nodes to these category nodes based on the row's data. Handles multi-value columns.
    *   **Example:** `["ItemType", "LocationFound", "Keywords"]`
*   **`config.nodeColorColumn`**:
    *   **Type:** `String` (Optional)
    *   **Description:** The column header name whose value will be used (in conjunction with `indicatorStyles`) to determine the color of the *primary* nodes.
    *   **Example:** `"DangerLevel"`
*   **`config.categoryNodeStyle`**:
    *   **Type:** `Object` (Optional)
    *   **Description:** Vis.js node styling options applied specifically to category nodes.
    *   **Properties (examples from Vis.js):** `shape` (e.g., `'dot'`, `'box'`), `color` (e.g., `{ background: '#eee', border: '#ccc' }`), `font` (e.g., `{ size: 10, color: '#555' }`), `size`.
    *   **Example:** `{"shape": "dot", "color": { "background": "#EEEEEE", "border": "#CCCCCC" }, "size": 5 }`
*   **`config.nodeTooltipColumns`**:
    *   **Type:** `Array<String>` (Optional)
    *   **Description:** A list of column header names whose values will be included in the hover tooltip for *primary* nodes.
    *   **Example:** `["ItemType", "ResearchStatus", "DiscoveryDate"]`
*   **`config.edgeDirection`**:
    *   **Type:** `String` (Optional)
    *   **Description:** Specifies if edges should be directed.
    *   **Values:** `'directed'` (shows arrows), `'undirected'` (default, no arrows).
    *   **Example:** `"undirected"`
*   **`config.edgeColor`**:
    *   **Type:** `String` (Optional)
    *   **Description:** A static color for all edges (e.g., `"#cccccc"`, `"grey"`).
    *   **Example:** `"#cccccc"`
*   **`config.layoutEngine`**:
    *   **Type:** `String` (Optional)
    *   **Description:** Specifies the layout algorithm for Vis.js.
    *   **Values:** `'forceDirected'` (default, uses physics), `'hierarchical'`, etc. (refer to Vis.js documentation for more).
    *   **Example:** `"forceDirected"`
*   **`config.physicsEnabled`**:
    *   **Type:** `Boolean` (Optional)
    *   **Description:** Whether to enable physics simulation for layout. Default is `true`. Often set to `false` when `layoutEngine` is `'hierarchical'`.
    *   **Example:** `true`
*   **`config.nodeShape`**:
    *   **Type:** `String` (Optional)
    *   **Description:** The default shape for *primary* nodes (e.g., `'ellipse'`, `'dot'`, `'box'`, `'star'`). Can be overridden by `nodeColorColumn` styling if that style also implies a shape.
    *   **Example:** `"ellipse"`

---