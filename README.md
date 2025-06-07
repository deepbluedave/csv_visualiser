# Configurable CSV Dashboard Generator

[![Made with Vanilla JS](https://img.shields.io/badge/Made%20with-Vanilla%20JS-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A flexible, client-side dashboard generator that visualizes data from a CSV file based entirely on a single configuration file (`config.js`). Load data via URL or file upload, define multiple views (Table, Kanban, Summary, Counts, Graph), customize styling extensively, filter data per view, sort results, search across visible items, and export views to CSV. Runs entirely in the browser with no server-side code needed.

**(Optional: Add a Screenshot/GIF Here)**
*A brief animation showing the different dashboard views, filtering, searching, and exporting.*

## Key Features

*   **CSV Data Source:** Load data directly from a local CSV file upload or fetch from a specified URL. Handles URL fetch failures by falling back to file upload mode.
*   **Configuration Driven:** All aspects of the dashboard (title, data parsing, views, styling, sorting, etc.) are controlled via `config.js`.
*   **Multiple View Types:**
    *   **Table View:** Classic tabular display with configurable columns, widths, header orientations, and initial sorting (`sortBy`). Can utilize `generalSettings.defaultItemSortBy` as a fallback for initial sort if `sortBy` is not specified in the tab config.
    *   **Kanban View:** Group items into columns based on a specific field (e.g., Status) and display them as cards. Configurable column sorting (`groupSortBy`) and item sorting within columns (`itemSortBy`), with fallback to defaults.
    *   **Summary View:** Group data hierarchically (e.g., by Region) and display within customizable sections based on filter criteria (e.g., High Priority items). Configurable item sorting (`itemSortBy`), with fallback to defaults.
    *   **Counts View:** Display aggregated counts of items based on filter criteria, grouped by a chosen column. Supports predefined counters and dynamic counting of all unique values in a specified column (`filterType: 'countAllValues'`).
    *   **Graph View:** Visualize relationships using a hub-and-spoke model powered by Vis.js. Connect primary nodes (e.g., Regions) to category nodes (e.g., Entry Types, Statuses). Configurable node/edge appearance and layout.
*   **Highly Configurable Styling:**
    *   Define custom styles (background color, text color, icons, text overrides) for specific values using `indicatorStyles`.
    *   Use simple icons or emoji for boolean flags or categorical data.
    *   Style values as tags with distinct colors.
    *   Apply styles using exact value maps or flexible regular expression rules (`styleRules`).
    *   Stack multiple tags vertically for multi-value columns using `layout: 'stacked'`.
    *   Optionally hide 'falsey' boolean values (e.g., don't show an icon for `FALSE`).
    *   Customize tab button colors (`bgColor`, `textColor`).
*   **Data Handling & Display:**
    *   Configurable CSV delimiter.
    *   Automatic parsing of multi-value columns (split by comma).
    *   Recognizes configurable "truthy" values (e.g., "TRUE", "yes", "x", "✓").
    *   Generates clickable links (🔗 icon) for specified columns (`linkColumns`). Supports full URLs in data or constructing URLs using prefixes (`linkPrefixes`) combined with IDs from the data.
    *   Improved Card Indicator Layout: Uses CSS Flexbox for smarter wrapping and alignment of indicators on Kanban/Summary cards.
    *   Tag Wrapping: Tag content now wraps within the tag element if space is limited, preventing truncation in narrow columns/containers.
*   **Filtering & Sorting:**
    *   Apply filters per tab to show specific subsets of data using various operators (equals, not equals, contains, is empty, boolean true/false, etc.) with AND/OR logic.
    *   Define default sorting for items within Kanban/Summary groups (`generalSettings.defaultItemSortBy`).
    *   Define default indicators for Kanban/Summary cards (`generalSettings.defaultCardIndicatorColumns`).
    *   Override default sorting/indicators per specific Kanban/Summary tab config.
    *   Configure Kanban column sorting (`groupSortBy` - alphabetical, count, custom array).
    *   Configure Table initial column sorting (`sortBy`), with fallback to `defaultItemSortBy`.
*   **Interaction & Export:**
    *   **Global Quick Search:** Filter the currently visible Table, Kanban, or Summary view using plain text or **regular expressions** (including advanced features like lookaheads if browser JS engine supports them in `new RegExp()`). Includes debouncing for performance. Falls back gracefully to plain text search for invalid regex patterns.
    *   **CSV Export:** Export the *current view* (Table, Kanban, Summary, or Counts) respecting filters and sorting. Outputs data with formatted indicator text/icons/URLs. Kanban/Summary are exported linearly. Counts exported in wide format (predefined counters) or long format (`countAllValues`). Graph view is not exportable. Includes BOM for Excel compatibility.
*   **Client-Side:** Runs entirely in the browser. No backend or database required.
*   **Embedding Ready:** Designed with scoped CSS (`#cdg-dashboard-wrapper`) and includes a deployment script (`deploy.ps1`) to create merged assets suitable for embedding (e.g., Confluence HTML Macro).
*   **Global Icon Key:** Automatically generates a key for configured icon indicators (`type: 'icon'`) and the standard link icon.

## How It Works

1.  **Load `index.html`:** The browser loads the main HTML page and CSS.
2.  **Load `config.js`:** The global `defaultConfig` object is loaded, defining all dashboard settings.
3.  **Load JavaScript Modules:** Core logic (`app.js`), data handling (`data-handler.js`), view management (`view-manager.js`), configuration loading (`config-loader.js`), export handling (`export-handler.js`), and view-specific renderers (`/js/renderers/*`) are loaded.
4.  **Initialize (`app.js`):**
    *   Sets the dashboard title (`applyCustomTitle`).
    *   Generates tab buttons and view containers (`generateTabsAndContainers`).
    *   Renders the global icon key (`renderIconKey`).
    *   Applies dynamic CSS styles (`applyConfigStyles`).
    *   Determines the initial active tab.
    *   Attaches event listeners (file input, tab clicks, search input, export button).
5.  **Load Data (`loadAndProcessData`):**
    *   If `csvUrl` is set in `config.js`, attempts to fetch the CSV (`loadDataFromUrl`).
    *   If URL fetch fails, enables the file input and prompts user (`updateUiForLoadMode`, `showMessage`).
    *   If no `csvUrl`, enables file input immediately.
    *   If file is uploaded, reads content (`readFileContent`).
6.  **Process Data:**
    *   Triggered by successful data load (URL or File).
    *   Parses the CSV text (`parseCSV`), handling delimiters, quotes, and multi-value columns. Headers are extracted and stored.
    *   If data exists, calls `renderAllTabs`.
7.  **Render All Tabs (`renderAllTabs`):**
    *   Iterates through enabled tabs in the config.
    *   Applies the tab-specific filter (`applyTabFilter`).
    *   Resolves sorting configurations (using defaults if needed).
    *   Calls the appropriate renderer (`renderTable`, `renderKanban`, etc.), passing filtered/sorted data, tab config, global config, the target element, and `showMessage`.
        *   Renderers use helper functions (`renderer-shared.js`) like `generateIndicatorsHTML`, `createInitiativeCard`, `sortData`, `getFormattedIndicatorText`.
        *   Kanban/Summary/Table renderers resolve sorting using defaults if needed.
        *   Kanban/Summary renderers resolve card indicators using defaults if needed.
8.  **Show View (`showView`):**
    *   Called initially and on tab clicks (`handleTabClick`).
    *   Activates the selected tab's container, hiding others. Sets the correct CSS `display` property.
    *   Clears the global search input and resets the search filter (`handleGlobalSearch('')`).
    *   Manages visibility of message placeholders.
9.  **Interact:**
    *   **Search:** User types in search box. Input is debounced, then `handleGlobalSearch` runs, attempting regex/text matching on visible elements in the active tab and toggling `.cdg-search-hidden`.
    *   **Export:** User clicks export button. `handleExportClick` gets active tab's data, calls the appropriate `generate[ViewType]Csv` function, and triggers download (`triggerCsvDownload`).

## Getting Started

1.  **Download or Clone:** Get the project files.
2.  **Configure (`config.js`):** This is the most crucial step.
    *   Open `config.js`.
    *   Set `generalSettings.csvUrl` to your CSV URL **OR** leave `null` for file upload.
    *   Customize `generalSettings.dashboardTitle`.
    *   Configure `generalSettings.linkColumns` (columns containing links or IDs) and `generalSettings.linkPrefixes` (if using IDs).
    *   Define `generalSettings.defaultCardIndicatorColumns` and `generalSettings.defaultItemSortBy` for Kanban/Summary/Table defaults.
    *   Adjust other `generalSettings` (delimiter, multi-value, true values) as needed.
    *   Define `indicatorStyles` for columns needing special formatting (icons/tags).
    *   Configure the `tabs` array: add/remove/modify tab objects, set `enabled`, `type`, `filter`, `bgColor`, `textColor`, and view-specific `config` options.
3.  **Prepare Data (`.csv`):** Ensure your CSV matches the delimiter and header expectations in `config.js`. Use consistent values for styling and IDs if using link prefixes.
4.  **Run:** Open `index.html` in a modern web browser. Use the "Upload CSV" button if `csvUrl` is not set or fails to load.

## Configuration Details (`config.js`)

This file controls the entire dashboard via the `defaultConfig` object.

### `generalSettings`

*   `dashboardTitle`: (String) The title shown in the browser tab and H1 tag. *Example: `"Project Status Dashboard"`*
*   `csvUrl`: (String | null) URL to fetch CSV data from. If `null`, enables file upload. If URL fetch fails, falls back to file upload. *Example: `"./data/tasks.csv"` or `null`*
*   `trueValues`: (Array<String>) Case-insensitive strings representing "true" used by filters and `isTruthy`. *Example: `["TRUE", "Yes", "Complete", "✓"]`*
*   `csvDelimiter`: (String) Character separating values in the CSV. *Example: `,`, `;`, `\t`*
*   `multiValueColumns`: (Array<String>) Column header names where comma-separated cell content should be treated as multiple distinct values. *Example: `["Tags", "Assigned Teams"]`*
*   `linkColumns`: (Array<String>) Column header names where the cell value should render as a clickable link icon (🔗). Works with full URLs or with IDs if a prefix is defined in `linkPrefixes`. *Example: `["Task Link", "Ticket ID"]`*
*   `linkPrefixes`: (Optional Object) Maps column names (from `linkColumns`) to a URL prefix. The cell value (assumed to be an ID) will be appended to this prefix to form the final link URL. *Example: `{"Ticket ID": "https://issues.example.com/browse/", "UserID": "https://profiles.example.com/user/"}`*
*   `defaultCardIndicatorColumns`: (Optional Array<String>) Default list of column headers to display as indicators on Kanban and Summary cards if not specified in the tab's config. *Example: `["Status", "Priority", "Assignee"]`*
*   `defaultItemSortBy`: (Optional Array<Object>) Default sorting rules applied to items *within* Kanban columns, *before* sectioning in Summary views, and as a fallback for initial Table sort, if not specified in the tab's config. Uses the same format as `sortBy` in table config (see below). *Example: `[{ "column": "Priority", "direction": "custom", "order": ["High", "Medium", "Low"] }, { "column": "DueDate", "direction": "asc" }]`*

### `indicatorStyles`

Maps column header names to styling rules for tags and icons.

*   **`type`**: (String) Defines rendering method:
    *   `'icon'`: Renders an icon/emoji.
        *   `trueCondition`: (Optional Object) Style `{ value, cssClass, title }` applied if `isTruthy` check passes on the cell value. Primarily for boolean columns. *Example: `{ "value": "✅", "cssClass": "icon-success", "title": "Complete" }`*
        *   `valueMap`: (Optional Object) Maps specific cell values (case-sensitive, then case-insensitive fallback) or `'default'` to style objects `{ value, cssClass, title }`. Use `value: ""` to explicitly hide an icon for a specific value (like `FALSE` or empty string). *Example: `{"Open": {"value": "🟢"}, "Closed": {"value": "🔴"}, "Blocked": {"value": "🚫"}, "": {"value": ""}}`*
    *   `'tag'`: Renders the value as a styled tag (pill). Allows text wrapping.
        *   `titlePrefix`: (Optional String) Text prepended to the value in the tag's hover title. *Example: `"Status: "`*
        *   `layout: 'stacked'`: (Optional String) If `'stacked'`, displays each value from a multi-value column as a separate tag vertically. Otherwise, tags appear inline.
        *   `valueMap`: (Legacy/Simple Object) Maps specific cell values (case-insensitive fallback) or `'default'` to style objects `{ text, bgColor, textColor, borderColor, title }`. Less flexible than `styleRules`.
        *   `styleRules`: (Advanced Array<Object>) Rules evaluated in order. First match applies its style. Use for RegEx or complex conditional styling.
            *   `matchType`: `'regex'` or `'exact'`.
            *   `pattern`: (String - For `regex`) The regular expression string (e.g., `"^P[1-3]"`).
            *   `value`: (String - For `exact`) The exact string value.
            *   `style`: (Object) The style object to apply (`{ bgColor, textColor, text, title, ... }`). *Example: `{ "matchType": "regex", "pattern": "^High", "style": { "bgColor": "#dc3545", "textColor": "#fff", "text": "🔥 High" } }`*
        *   `defaultStyle`: (Object - Used with `styleRules`) Style applied if no `styleRules` match. *Example: `{ "bgColor": "#eee", "textColor": "#333" }`*
    *   `'none'`: Value displayed as plain text (unless handled by `linkColumns`).

*   **Style Object Properties** (used in `valueMap`, `styleRules`, `defaultStyle`):
    *   `value`: (String - For icons) The icon/emoji character. `""` renders nothing.
    *   `text`: (String - For tags) Optional text to display instead of the raw value. `""` renders nothing.
    *   `cssClass`: (String - For icons) CSS class added to the icon's `<span>`.
    *   `bgColor`: (String - For tags) Background color (e.g., `#e9d8fd`, `rgba(0,0,0,0.1)`).
    *   `textColor`: (String - For tags) Text color.
    *   `borderColor`: (String - For tags) Border color. Defaults to `bgColor`.
    *   `title`: (String) Custom hover tooltip text. Defaults to `titlePrefix` + value.

### `tabs`

Array defining the dashboard views.

*   **Common Properties:**
    *   `id`: (String) Unique identifier (used for DOM IDs). *Example: `"tasks-by-status"`*
    *   `title`: (String) Text displayed on the tab button. *Example: `"Status Board"`*
    *   `type`: (String) View type: `'table'`, `'kanban'`, `'summary'`, `'counts'`, `'graph'`.
    *   `enabled`: (Boolean) `true` to show the tab, `false` to hide.
    *   `bgColor`: (Optional String) Custom background color for the tab button. *Example: `"#cfe2ff"`*
    *   `textColor`: (Optional String) Custom text color for the tab button. *Example: `"#0a367a"`*
    *   `filter`: (Optional Object) Filtering rules for data *before* it reaches this tab's renderer.
        *   `logic`: `'AND'` (default) or `'OR'`.
        *   `conditions`: (Array<Object>) Filter conditions:
            *   `column`: (String) Header name to filter on.
            *   `filterType`: (String) Comparison type (e.g., `'valueEquals'`, `'valueIsNot'`, `'valueInList'`, `'valueNotInList'`, `'valueNotEmpty'`, `'valueIsEmpty'`, `'booleanTrue'`, `'booleanFalse'`, `'contains'`, `'doesNotContain'`).
            *   `filterValue`: (String | Number | Array) Value(s) for comparison. *Example: `{ "logic": "OR", "conditions": [{"column": "Status", "filterType": "valueEquals", "filterValue": "Blocked"}, {"column": "Priority", "filterType": "valueEquals", "filterValue": "High"}] }`*

*   **`type: 'table'` Specific `config`:**
    *   `displayColumns`: (Array<String>) Headers to show, in order.
    *   `columnWidths`: (Optional Object) Maps header names (or `'default'`) to CSS widths (e.g., `'150px'`, `'10%'`).
    *   `headerOrientations`: (Optional Object) Maps header names (or `'default'`) to `'horizontal'` or `'vertical'` (default).
    *   `sortBy`: (Optional Array<Object>) Defines initial sort order. **If omitted, falls back to `generalSettings.defaultItemSortBy`.**
        *   `column`: (String) Header name to sort by.
        *   `direction`: (String) `'asc'`, `'desc'`, or `'custom'`.
        *   `order`: (Array<String> - Required for `direction: 'custom'`) Explicit sort order for values. *Example: `[{ "column": "Status", "direction": "desc" }]`*

*   **`type: 'kanban'` Specific `config`:**
    *   `groupByColumn`: (String) Header name to group cards into columns.
    *   `groupSortBy`: (Optional String | Array<String>) How to sort columns: `'keyAsc'` (default), `'keyDesc'`, `'countAsc'`, `'countDesc'`, or custom array `['Val1', 'Val2', ...]`.
    *   `cardTitleColumn`: (String) Header name for the main title text on cards.
    *   `cardIndicatorColumns`: (Optional Array<String>) Headers for indicators on cards. **Defaults to `generalSettings.defaultCardIndicatorColumns` if omitted.**
    *   `cardLinkColumn`: (Optional String) Header name containing a URL or ID (used with `linkPrefixes`). If set, card title becomes a link.
    *   `itemSortBy`: (Optional Array<Object>) Sort order for cards *within* each column. Format same as table `sortBy`. **Defaults to `generalSettings.defaultItemSortBy` if omitted.**
    *   `layout`: (Optional Object) Visual layout: `minColumnWidth`, `columnGap`, `itemGap`, `maxItemsPerGroupInColumn`, `preventStackingAboveItemCount`.

*   **`type: 'summary'` Specific `config`:**
    *   `groupByColumn`: (Optional String) Header name to group items *within* each section.
    *   `cardIndicatorColumns`: (Optional Array<String>) Headers for indicators on cards. **Defaults to `generalSettings.defaultCardIndicatorColumns` if omitted.**
    *   `cardLinkColumn`: (Optional String) Header name for the card title link URL/ID.
    *   `itemSortBy`: (Optional Array<Object>) Sort order applied to data *before* sectioning. Format same as table `sortBy`. **Defaults to `generalSettings.defaultItemSortBy` if omitted.**
    *   `internalLayout`: (Optional Object) Layout settings (`minColumnWidth`, etc.) applied to the grid *inside* each section when using `groupByColumn`.
    *   `sections`: (Array<Object>) Defines the sections. Order matters.
        *   `id`: (String) Unique ID for the section.
        *   `title`: (String) Title displayed for the section.
        *   `filterColumn`: (String | null) Column to check for this section's filter. (`null` for `catchAll`).
        *   `filterType`: (String) Filter type (same as tab filters). Use `'catchAll'` to include items not matched by previous sections.
        *   `filterValue`: (Any) Value for the filter comparison.
        *   `bgColor`: (Optional String) Background color for the section block.
        *   `textColor`: (Optional String) Text color for the section block. *Example: `{ "id": "s-high", "title": "High Priority", "filterColumn": "Priority", "filterType": "valueEquals", "filterValue": "High", "bgColor": "#f8d7da" }`*

*   **`type: 'counts'` Specific `config`:**
    *   `groupByColumn`: (String) Header name to group the counts by (e.g., count per 'Project').
    *   `counters`: (Array<Object>) Defines what to count:
        *   **Predefined Counter:** Define `title`, `column`, `filterType`, `filterValue`. Optional `display` object `{ type: 'icon'|'text', value: 'IconOrText', cssClass: 'OptionalClass' }`. *Example: `{ "title": "Blocked Tasks", "column": "Status", "filterType": "valueEquals", "filterValue": "Blocked", "display": { "type": "icon", "value": "🚫" } }`*
        *   **Dynamic Counter:** Define `column` (whose unique values to count). Set `filterType` to the string `'countAllValues'`. Optional `title` (hint for group) and `display` (overall group icon/text). *Example: `{ "title": "Status Breakdown", "column": "Status", "filterType": "countAllValues" }`*

*   **`type: 'graph'` Specific `config`:**
    *   `primaryNodeIdColumn`: (String) Header name for unique IDs of primary nodes.
    *   `primaryNodeLabelColumn`: (String) Header name for labels of primary nodes.
    *   `categoryNodeColumns`: (Array<String>) Headers whose values become category nodes linked to primary nodes. Handles multi-value columns.
    *   `nodeColorColumn`: (Optional String) Header name whose value is used (with `indicatorStyles`) to determine the color of primary nodes.
    *   `categoryNodeStyle`: (Optional Object) Vis.js node styling options applied specifically to category nodes (e.g., `{ shape: 'dot', color: { background: '#eee', border: '#ccc' }, font: { size: 10 } }`).
    *   `nodeTooltipColumns`: (Optional Array<String>) Headers whose values are included in the hover tooltip for primary nodes.
    *   `edgeDirection`: (Optional String) `'directed'` or `'undirected'` (default).
    *   `edgeColor`: (Optional String) Static color for edges (e.g., `'#cccccc'`).
    *   `layoutEngine`: (Optional String) Layout algorithm (e.g., `'forceDirected'` (default), `'hierarchical'`).
    *   `physicsEnabled`: (Optional Boolean) Enable/disable physics simulation (default: `true`). Often set `false` for hierarchical layouts.
    *   `nodeShape`: (Optional String) Default shape for primary nodes (e.g., `'ellipse'`, `'dot'`, `'box'`).

## Interaction Features

### Global Search

*   Input box near the top controls allows filtering the *currently visible* **Table**, **Kanban**, or **Summary** view. Counts and Graph views are unaffected.
*   Attempts to interpret input as a **case-insensitive Regular Expression**. Invalid regex patterns trigger a fallback to simple case-insensitive substring search.
*   **Table:** Hides rows (`<tr>`) where the text content doesn't match.
*   **Kanban/Summary:** Hides entire group blocks (`.kanban-group-block`, `.summary-group-block`) where the combined text content doesn't match.
*   Uses a 300ms debounce mechanism for performance while typing.
*   Clearing the search box or switching tabs restores the original view state.

### CSV Export

*   "Export View" button exports data from the **active tab**, respecting its filters and sorting.
*   Supported view types:
    *   **Table:** Exports displayed columns and rows. Cell content matches formatted text/icons/URLs seen on screen.
    *   **Kanban:** Exports a linear list: `[GroupByColumnName]`, `[CardTitleColumnName]`, `[IndicatorColumn1]`, ... Items sorted by Kanban column (`groupSortBy`), then by card order within column (`itemSortBy`). Indicator columns contain formatted text/icons/URLs.
    *   **Summary:** Exports a linear list: `Section Title`, `[GroupByColumnName]` (if used), `[CardTitleColumnName]`, `[IndicatorColumn1]`, ... Items sorted by `itemSortBy` *before* sectioning. Indicator columns contain formatted text/icons/URLs.
    *   **Counts:**
        *   If using *only* predefined counters: Exports a "wide" format (Rows=Counters, Columns=GroupBy Values, Cells=Counts).
        *   If using *any* `countAllValues` counters: Exports a "long/tidy" format (`[GroupByColumnName]`, `Counted Column`, `Counted Value`, `Count`), ignoring predefined counters. Formatted text/icons used for `Counted Value`.
*   **Graph:** Export is *not* supported.
*   Output includes a BOM (Byte Order Mark) for better Excel compatibility.

## File Structure

```
csv_visualiser/
├── readme.md
├── config.js             # THE Main Configuration File
├── index.html            # Main HTML structure
├── deploy.ps1            # Script for creating embeddable fragment
├── csveditor.html        # Simple CSV data editor utility
├── listfiles.ps1         # Utility to list files
├── alt_config/           # Alternative config.js examples
├── backup_resources/     # Misc helper/reference files
├── css/                  # CSS Stylesheets (base, layout, components, views)
│   ├── base.css
│   ├── components.css
│   ├── layout.css
│   ├── view-counts.css
│   ├── view-graph.css
│   ├── view-kanban.css
│   ├── view-summary.css
│   └── view-table.css
├── deploy/               # Output for deployment script
│   ├── config.js
│   ├── dashboard_fragment.html
│   ├── script.js
│   └── style.css
├── js/                   # JavaScript files
│   ├── app.js            # Main application logic
│   ├── config-loader.js  # Apply config settings
│   ├── data-handler.js   # CSV parsing, fetching, filtering
│   ├── export-handler.js # CSV generation and download logic
│   ├── view-manager.js   # Tab/view switching, DOM manipulation
│   └── renderers/        # View-specific rendering logic + shared helpers
│       ├── renderer-counts.js
│       ├── renderer-graph.js
│       ├── renderer-kanban.js
│       ├── renderer-shared.js
│       ├── renderer-summary.js
│       └── renderer-table.js
├── sample_data/          # Example CSV files
└── .vscode/              # VS Code settings
    └── settings.json
```

## Technology Stack

*   HTML5
*   CSS3 (including CSS Variables, Flexbox, Grid)
*   Vanilla JavaScript (ES6+)
*   Vis.js Network (for Graph view - loaded via CDN)

## Deployment / Embedding

The project is designed to be embeddable within other web pages or platforms (like Confluence using its HTML Macro).

*   **Scoped CSS:** All CSS rules are scoped under the `#cdg-dashboard-wrapper` ID to minimize conflicts with the host page's styles.
*   **Deployment Script:** Run `deploy.ps1` (PowerShell) from the project root. This script:
    *   Creates a `deploy/` subfolder.
    *   Copies `config.js`.
    *   Merges all necessary CSS files into `deploy/style.css`.
    *   Merges all necessary JS files (excluding `config.js`) into `deploy/script.js`.
    *   Generates `deploy/dashboard_fragment.html`, which contains the core HTML structure needed for the dashboard, along with `<link>` and `<script>` tags pointing to the merged assets (`style.css`, `config.js`, `script.js`).
*   **Embedding:** Copy the contents of the `deploy/` folder to your target hosting location (e.g., Confluence attachments). Edit the `href` and `src` paths within `dashboard_fragment.html` to correctly point to the location of the deployed `style.css`, `config.js`, and `script.js` files relative to where the fragment is being embedded. Paste the content of the (edited) `dashboard_fragment.html` into the host page or macro.

---