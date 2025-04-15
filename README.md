Okay, here is a comprehensive, updated `README.md` reflecting the current state of your project, including the new features and detailed configuration options.

---

# Configurable CSV Dashboard Generator

[![Made with Vanilla JS](https://img.shields.io/badge/Made%20with-Vanilla%20JS-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A flexible, client-side dashboard generator that visualizes data from a CSV file based entirely on a single configuration file (`config.js`). No server-side code needed! Load data via URL or file upload, define multiple views (Table, Kanban, Summary, Counts, Graph), customize styling extensively, filter data per view, sort results, search across visible items, and export views to CSV.

**(Optional: Add a Screenshot/GIF Here)**
*A brief animation showing the different dashboard views, filtering, and searching.*

## Key Features

*   **CSV Data Source:** Load data directly from a local CSV file upload or fetch from a specified URL.
*   **Configuration Driven:** All aspects of the dashboard (title, data parsing, views, styling, sorting, etc.) are controlled via `config.js`.
*   **Multiple View Types:**
    *   **Table View:** Classic tabular display with configurable columns, widths, header orientations, and sorting.
    *   **Kanban View:** Group items into columns based on a specific field (e.g., Status) and display them as cards. Configurable column and item sorting.
    *   **Summary View:** Group data hierarchically (e.g., by Region) and display within customizable sections based on filter criteria (e.g., High Priority items). Configurable item sorting.
    *   **Counts View:** Display aggregated counts of items based on filter criteria, grouped by a chosen column. Supports predefined counters and **dynamic counting of all unique values** in a specified column.
    *   **Graph View:** Visualize relationships using a hub-and-spoke model powered by Vis.js. Connect primary nodes (e.g., Regions) to category nodes (e.g., Entry Types, Statuses).
*   **Highly Configurable Styling:**
    *   Define custom styles (background color, text color, icons, text overrides) for specific values using `indicatorStyles`.
    *   Use simple icons or emoji for boolean flags or categorical data.
    *   Style values as tags with distinct colors.
    *   Apply styles using exact value maps or flexible **regular expression rules** (`styleRules`).
    *   Stack multiple tags vertically for multi-value columns using `layout: 'stacked'`.
    *   Optionally hide 'falsey' boolean values (e.g., don't show an icon for `FALSE`).
    *   Customize **tab button colors** (`bgColor`, `textColor`).
*   **Data Handling & Display:**
    *   Configurable CSV delimiter.
    *   Automatic parsing of multi-value columns (split by comma).
    *   Recognizes configurable "truthy" values (e.g., "TRUE", "yes", "x", "✓").
    *   Automatic link generation for specified columns (renders as 🔗 icon).
    *   **Improved Card Indicator Layout:** Uses CSS Flexbox for smarter wrapping and alignment of indicators on Kanban/Summary cards.
*   **Filtering & Sorting:**
    *   Apply **filters per tab** to show specific subsets of data using various operators (equals, not equals, contains, is empty, boolean true/false, etc.) with AND/OR logic.
    *   Define **default sorting** for items within Kanban/Summary groups (`generalSettings.defaultItemSortBy`).
    *   Define **default indicators** for Kanban/Summary cards (`generalSettings.defaultCardIndicatorColumns`).
    *   Override default sorting/indicators per specific Kanban/Summary tab.
    *   Configure **Kanban column sorting** (alphabetical, count, custom array).
    *   Configure **Table column sorting**.
*   **Interaction & Export:**
    *   **Global Quick Search:** Filter the currently visible Table, Kanban, or Summary view using plain text or **regular expressions**. Includes debouncing for performance.
    *   **CSV Export:** Export the *current view* (Table, Kanban, Summary, or Counts) respecting filters and sorting. Outputs data with formatted indicator text/icons. (Kanban/Summary exported linearly, Counts exported in wide or long format).
*   **Client-Side:** Runs entirely in the browser. No backend or database required.
*   **Embedding Ready:** Designed with scoped CSS (`#cdg-dashboard-wrapper`) and includes a deployment script (`deploy.ps1`) to create merged assets suitable for embedding (e.g., Confluence HTML Macro).
*   **Global Icon Key:** Automatically generates a key for configured icon indicators (`type: 'icon'`) and the standard link icon.

## How It Works

1.  **Load `index.html`:** The browser loads the main HTML page and CSS.
2.  **Load `config.js`:** The global `defaultConfig` object is loaded, defining all dashboard settings.
3.  **Load JavaScript Modules:** Core logic (`app.js`), data handling (`data-handler.js`), view management (`view-manager.js`), configuration loading (`config-loader.js`), export handling (`export-handler.js`), and view-specific renderers (`/js/renderers/*`) are loaded.
4.  **Initialize (`app.js`):**
    *   Sets the dashboard title (`applyCustomTitle`).
    *   Generates tab buttons and view containers based on config (`generateTabsAndContainers`).
    *   Renders the global icon key (`renderIconKey`).
    *   Applies dynamic CSS styles (`applyConfigStyles`).
    *   Determines the initial active tab.
    *   Attaches event listeners (file input, tab clicks, search input, export button).
5.  **Load Data:**
    *   If `csvUrl` is set in `config.js`, attempts to fetch the CSV (`loadDataFromUrl`).
    *   Otherwise, enables the file input (`updateUiForLoadMode`).
6.  **Process Data (`loadAndProcessData`):**
    *   Triggered by URL fetch success or file upload (`handleFileSelectEvent`).
    *   Parses the CSV text (`parseCSV`), handling delimiters, quotes, and multi-value columns. Headers are extracted and stored in the config state.
    *   If data exists, calls `renderAllTabs`.
7.  **Render All Tabs (`renderAllTabs`):**
    *   Iterates through enabled tabs in the config.
    *   Applies the tab-specific filter (`applyTabFilter`).
    *   Calls the appropriate renderer (`renderTable`, `renderKanban`, `renderSummaryView`, `renderCountsView`, `renderGraph`), passing filtered data, tab config, global config, the target element, and the `showMessage` function.
        *   Renderers use helper functions (`renderer-shared.js`) like `generateIndicatorsHTML`, `createInitiativeCard`, `sortData`, `getFormattedIndicatorText` to build the view HTML.
        *   Kanban/Summary renderers resolve `itemSortBy` and `cardIndicatorColumns` using defaults if needed.
8.  **Show View (`showView`):**
    *   Called initially and on tab clicks (`handleTabClick`).
    *   Activates the selected tab's container, hiding others.
    *   Sets the correct CSS `display` property (block, grid, flex).
    *   Clears the global search input and resets the search filter (`handleGlobalSearch('')`).
    *   Manages visibility of message placeholders.
9.  **Interact:**
    *   **Search:** User types in the global search box. The `input` event is debounced, then `handleGlobalSearch` runs, attempting regex/text matching on the content of visible elements (`tr`, `.kanban-group-block`, `.summary-group-block`) in the active tab and toggling a `.cdg-search-hidden` class.
    *   **Export:** User clicks the export button. `handleExportClick` gets the active tab's filtered/sorted data, calls the appropriate `generate[ViewType]Csv` function (using `getFormattedIndicatorText` for cell values), and triggers a download (`triggerCsvDownload`).

## Getting Started

1.  **Download or Clone:** Get the project files.
2.  **Configure (`config.js`):** This is the most crucial step.
    *   Open `config.js`.
    *   Set `generalSettings.csvUrl` to your CSV URL **OR** leave `null` for file upload.
    *   Customize `generalSettings.dashboardTitle`.
    *   Define `generalSettings.defaultCardIndicatorColumns` and `generalSettings.defaultItemSortBy` to set defaults for Kanban/Summary views.
    *   Adjust other `generalSettings` (delimiter, multi-value, link columns, true values) as needed.
    *   Define `indicatorStyles` for columns needing special formatting (icons/tags). Use `type`, `valueMap`, `styleRules`, `layout`, etc. (See detailed section below).
    *   Configure the `tabs` array: add/remove/modify tab objects, set `enabled`, `type`, `filter`, `bgColor`, `textColor`, and view-specific `config` options (See detailed section below).
3.  **Prepare Data (`.csv`):** Ensure your CSV matches the delimiter and header expectations in `config.js`. Use consistent values for styling.
4.  **Run:** Open `index.html` in a modern web browser. Use the "Upload CSV" button if `csvUrl` is not set.

## Configuration Details (`config.js`)

This file controls the entire dashboard.

### `generalSettings`

*   `dashboardTitle`: (String) The title shown in the browser tab and H1 tag.
*   `csvUrl`: (String | null) URL to fetch CSV data from. If `null`, enables file upload.
*   `trueValues`: (Array<String>) Case-insensitive strings representing "true" (used by filters, `isTruthy`).
*   `csvDelimiter`: (String) Character separating values in the CSV (e.g., `,`, `;`, `\t`).
*   `multiValueColumns`: (Array<String>) Column header names where comma-separated cell content should be treated as multiple distinct values.
*   `linkColumns`: (Array<String>) Column header names where the cell value (if a valid URL) should render as a clickable link icon (🔗).
*   **`defaultCardIndicatorColumns`**: (Optional Array<String>) Default list of column headers to display as indicators on Kanban and Summary cards if not specified in the tab's config.
*   **`defaultItemSortBy`**: (Optional Array<Object>) Default sorting rules applied to items *within* Kanban columns or *before* sectioning/grouping in Summary views, if not specified in the tab's config. Uses the same format as `sortBy` in table config.

### `indicatorStyles`

Maps column header names to styling rules.

*   **`type`**: (String) Defines rendering method:
    *   `'icon'`: Renders an icon/emoji.
        *   `trueCondition`: (Optional Object) Style `{ value, cssClass, title }` applied if `isTruthy` check passes.
        *   `valueMap`: (Optional Object) Maps specific cell values (case-sensitive, then case-insensitive fallback) or `'default'` to style objects `{ value, cssClass, title }`. Use `{ "value": "" }` to explicitly hide an icon for a specific value (e.g., `false`, `""`).
    *   `'tag'`: Renders the value as a styled tag (pill).
        *   `titlePrefix`: (Optional String) Text prepended to the value in the tag's hover title.
        *   `layout: 'stacked'`: (Optional String) If `'stacked'`, displays each value from a multi-value column as a separate tag vertically. Otherwise, tags appear inline (separated by space).
        *   `valueMap`: (Legacy/Simple Object) Maps specific cell values (case-insensitive fallback) or `'default'` to style objects `{ text, bgColor, textColor, borderColor, title }`.
        *   `styleRules`: (Advanced Array<Object>) Rules evaluated in order. First match applies its style.
            *   `matchType`: `'regex'` or `'exact'`.
            *   `pattern`: (String - For `regex`) The regular expression string (e.g., `"^SEC-"`).
            *   `value`: (String - For `exact`) The exact string value.
            *   `style`: (Object) The style object to apply (`{ bgColor, textColor, ... }`).
        *   `defaultStyle`: (Object - Used with `styleRules`) Style applied if no `styleRules` match.
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
    *   `id`: (String) Unique identifier (used for DOM IDs).
    *   `title`: (String) Text displayed on the tab button.
    *   `type`: (String) View type: `'table'`, `'kanban'`, `'summary'`, `'counts'`, `'graph'`.
    *   `enabled`: (Boolean) `true` to show the tab, `false` to hide.
    *   `bgColor`: (Optional String) Custom background color for the tab button.
    *   `textColor`: (Optional String) Custom text color for the tab button.
    *   `filter`: (Optional Object) Filtering rules for data *before* it reaches this tab's renderer.
        *   `logic`: `'AND'` (default) or `'OR'`.
        *   `conditions`: (Array<Object>) Filter conditions:
            *   `column`: (String) Header name to filter on.
            *   `filterType`: (String) Comparison type (e.g., `'valueEquals'`, `'valueIsNot'`, `'valueInList'`, `'valueNotInList'`, `'valueNotEmpty'`, `'valueIsEmpty'`, `'booleanTrue'`, `'booleanFalse'`, `'contains'`, `'doesNotContain'`).
            *   `filterValue`: (String | Number | Array) Value(s) for comparison.

*   **`type: 'table'` Specific `config`:**
    *   `displayColumns`: (Array<String>) Headers to show, in order.
    *   `columnWidths`: (Optional Object) Maps header names (or `'default'`) to CSS widths (e.g., `'150px'`, `'10%'`).
    *   `headerOrientations`: (Optional Object) Maps header names (or `'default'`) to `'horizontal'` or `'vertical'` (default).
    *   `sortBy`: (Optional Array<Object>) Defines initial sort order for the table rows.
        *   `column`: (String) Header name to sort by.
        *   `direction`: (String) `'asc'`, `'desc'`, or `'custom'`.
        *   `order`: (Array<String> - Required for `direction: 'custom'`) Explicit sort order for values in the `column`.

*   **`type: 'kanban'` Specific `config`:**
    *   `groupByColumn`: (String) Header name to group cards into Kanban columns.
    *   `groupSortBy`: (Optional String | Array<String>) How to sort the Kanban columns themselves.
        *   `'keyAsc'` (default), `'keyDesc'`: Sort columns by group key alphabetically.
        *   `'countAsc'`, `'countDesc'`: Sort columns by the number of cards they contain.
        *   `['Val1', 'Val2', ...]`: Sort columns according to the specified fixed order. Keys not in the array are sorted alphabetically after.
    *   `cardTitleColumn`: (String) Header name for the main title text on cards.
    *   `cardIndicatorColumns`: (Optional Array<String>) Headers for indicators on cards. **Defaults to `generalSettings.defaultCardIndicatorColumns` if omitted.**
    *   `cardLinkColumn`: (Optional String) Header name containing a URL. If set, card title becomes a link.
    *   `itemSortBy`: (Optional Array<Object>) Sort order for cards *within* each Kanban column. Format same as table `sortBy`. **Defaults to `generalSettings.defaultItemSortBy` if omitted.**
    *   `layout`: (Optional Object) Visual layout:
        *   `minColumnWidth`: (String) Minimum width for Kanban columns (e.g., `'300px'`).
        *   `columnGap`: (String) Gap between columns.
        *   `itemGap`: (String) Gap between cards/groups within a column.
        *   `maxItemsPerGroupInColumn`: (Number) Stacks multiple small groups vertically within a visual column area. Default 1.
        *   `preventStackingAboveItemCount`: (Number) If a group has more items than this, it always gets its own column area, ignoring `maxItemsPerGroupInColumn`.

*   **`type: 'summary'` Specific `config`:**
    *   `groupByColumn`: (Optional String) Header name to group items *within* each section below.
    *   `cardIndicatorColumns`: (Optional Array<String>) Headers for indicators on summary cards. **Defaults to `generalSettings.defaultCardIndicatorColumns` if omitted.**
    *   `cardLinkColumn`: (Optional String) Header name for the card title link URL.
    *   `itemSortBy`: (Optional Array<Object>) Sort order applied to data *before* it is split into sections/groups. Format same as table `sortBy`. **Defaults to `generalSettings.defaultItemSortBy` if omitted.**
    *   `internalLayout`: (Optional Object) Layout settings (`minColumnWidth`, `columnGap`, `itemGap`, `maxItemsPerGroupInColumn`) applied to the grid *inside* each section when using `groupByColumn`.
    *   `sections`: (Array<Object>) Defines the sections within the summary view. Order matters.
        *   `id`: (String) Unique ID for the section.
        *   `title`: (String) Title displayed for the section.
        *   `filterColumn`: (String | null) Column to check for this section's filter. (Null for `catchAll`).
        *   `filterType`: (String) Filter type (same as tab filters). Use `catchAll` to include items not matched by previous sections.
        *   `filterValue`: (Any) Value for the filter comparison.
        *   `bgColor`: (Optional String) Background color for the section block.
        *   `textColor`: (Optional String) Text color for the section block.

*   **`type: 'counts'` Specific `config`:**
    *   `groupByColumn`: (String) Header name to group the counts by (e.g., count per 'Domain').
    *   `counters`: (Array<Object>) Defines what to count:
        *   **Predefined Counter:**
            *   `title`: (String) The label for this counter group (e.g., "High Priority").
            *   `column`: (String) Column whose value determines if an item increments this counter.
            *   `filterType`: (String) Filter type to check the `column` value against (e.g., `'valueEquals'`, `'booleanTrue'`).
            *   `filterValue`: (Any) Value for the filter comparison.
            *   `display`: (Optional Object) How to display the counter title: `{ type: 'icon'|'text', value: 'IconOrText', cssClass: 'OptionalClass' }`.
        *   **Dynamic Counter (New):**
            *   `title`: (Optional String) Hint for the overall group title (e.g., "Risk Breakdown").
            *   `column`: (String) Column whose unique values should be counted within each `groupByColumn` group.
            *   `filterType`: Must be set to the string `'countAllValues'`.
            *   `filterValue`: Ignored.
            *   `display`: (Optional Object) Can be used to add an overall icon/text to the group header.

*   **`type: 'graph'` Specific `config`:**
    *   `primaryNodeIdColumn`: (String) Header name containing unique IDs for the primary nodes.
    *   `primaryNodeLabelColumn`: (String) Header name for the labels of primary nodes.
    *   `categoryNodeColumns`: (Array<String>) Header names whose values will become category nodes linked to primary nodes. Handles multi-value columns.
    *   `nodeColorColumn`: (Optional String) Header name whose value is used (with `indicatorStyles`) to determine the color of primary nodes.
    *   `categoryNodeStyle`: (Optional Object) Vis.js node styling options applied specifically to category nodes (e.g., `{ shape: 'dot', color: { background: '#eee', border: '#ccc' }, font: { size: 10 } }`).
    *   `nodeTooltipColumns`: (Optional Array<String>) Headers whose values are included in the hover tooltip for primary nodes.
    *   `edgeDirection`: (Optional String) `'directed'` or `'undirected'` (default).
    *   `edgeColor`: (Optional String) Static color for edges (e.g., `'#cccccc'`).
    *   `layoutEngine`: (Optional String) Layout algorithm (e.g., `'forceDirected'` (default), `'hierarchical'`).
    *   `physicsEnabled`: (Optional Boolean) Enable/disable physics simulation (default: `true`). Often set `false` for hierarchical layouts.
    *   `nodeShape`: (Optional String) Default shape for primary nodes (e.g., `'ellipse'`, `'dot'`, `'box'`).

## New Features in Detail

### Global Search

*   An input box is available near the top controls.
*   Typing filters the *currently visible* **Table**, **Kanban**, or **Summary** view. Counts and Graph views are unaffected.
*   It attempts to interpret the input as a **case-insensitive Regular Expression**. If the regex is invalid, it falls back to a simple case-insensitive substring search.
*   **Table:** Hides rows (`<tr>`) where the text content doesn't match.
*   **Kanban/Summary:** Hides entire group blocks (`.kanban-group-block`, `.summary-group-block`) where the combined text content (header + all cards inside) doesn't match.
*   Filtering uses a debounce mechanism (300ms delay) for better performance while typing.
*   Switching tabs or clearing the search box restores the original view state.

### CSV Export

*   An "Export View" button is available near the top controls.
*   Clicking it exports the data currently displayed in the **active tab**, respecting the tab's filters and sorting.
*   Supported view types:
    *   **Table:** Exports the displayed columns and rows. Cell content matches the formatted text/icons seen on screen (links exported as URLs).
    *   **Kanban:** Exports a linear list with columns: `[GroupByColumnName]`, `[CardTitleColumnName]`, `[IndicatorColumn1]`, `[IndicatorColumn2]`, ... Items are sorted first by Kanban column (respecting `groupSortBy`), then by card order within the column (respecting `itemSortBy`). Indicator columns contain formatted text/icons (links as URLs).
    *   **Summary:** Exports a linear list with columns: `Section Title`, `[GroupByColumnName]` (if used), `[CardTitleColumnName]`, `[IndicatorColumn1]`, ... Items are sorted according to `itemSortBy` *before* being placed into sections. Indicator columns contain formatted text/icons (links as URLs).
    *   **Counts:**
        *   If using **predefined counters** only: Exports a "wide" grid format. Rows are the Counter Titles, Columns are the unique `groupByColumn` values. Cells contain the counts.
        *   If using **`countAllValues`** counters: Exports a "long/tidy" format with columns: `[GroupByColumnName]`, `Counted Column`, `Counted Value`, `Count`. (Ignores predefined counters in this mode). Formatted text/icons are used for the `Counted Value` column.
*   **Graph:** Export is currently *not* supported for the Graph view.
*   Output includes a BOM (Byte Order Mark) for better Excel compatibility.

## File Structure

```
├── css/                  # CSS Stylesheets (base, layout, components, views)
├── js/                   # JavaScript files
│   ├── renderers/        # View-specific rendering logic + shared helpers
│   │   ├── renderer-*.js
│   │   └── renderer-shared.js
│   ├── app.js            # Main application logic
│   ├── config-loader.js  # Apply config settings
│   ├── data-handler.js   # CSV parsing, fetching, filtering
│   ├── export-handler.js # CSV generation and download logic  <-- NEW
│   └── view-manager.js   # Tab/view switching, DOM manipulation
├── sample_data/          # Example CSV files
├── alt_config/           # Alternative config.js examples
├── backup_resources/     # Misc helper/reference files
├── deploy/               # Output for deployment script
├── config.js             # THE Main Configuration File
├── index.html            # Main HTML structure
├── deploy.ps1            # Script for creating embeddable fragment
├── csveditor.html        # Simple CSV data editor utility
└── README.md             # This file
```

## Technology Stack

*   HTML5
*   CSS3 (including CSS Variables, Flexbox, Grid)
*   Vanilla JavaScript (ES6+)
*   Vis.js Network (for Graph view - loaded via CDN)

---