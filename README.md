# Configurable CSV Dashboard Generator

[![Made with Vanilla JS](https://img.shields.io/badge/Made%20with-Vanilla%20JS-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A flexible, client-side dashboard generator that visualizes data from a CSV file based entirely on a single configuration file (`config.js`). No server-side code needed! Inspired by the need for a quick way to track initiatives (like the "RA Security Initiative Tracker" example in the config), this tool allows you to define multiple views (Table, Kanban, Summary, Counts) and customize styling for different data points using tags and icons.

**(Optional: Add a Screenshot/GIF Here)**
*A brief animation showing the different dashboard views.*

## Features

*   **CSV Data Source:** Load data directly from a local CSV file upload or fetch from a specified URL.
*   **Configuration Driven:** All aspects of the dashboard (title, data parsing, views, styling) are controlled via `config.js`.
*   **Multiple View Types:**
    *   **Table View:** Classic tabular display with configurable columns, widths, and header orientations.
    *   **Kanban View:** Group items into columns based on a specific field (e.g., Status, Owner) and display them as cards.
    *   **Summary View:** Group data hierarchically (e.g., by Domain) and display within customizable sections based on filter criteria (e.g., High Priority items).
    *   **Counts View:** Display aggregated counts of items based on filter criteria, grouped by a chosen column (e.g., count of 'High' priority items per 'Domain').
*   **Highly Configurable Styling:**
    *   Define custom styles (background color, text color, icons, text overrides) for specific values using `indicatorStyles`.
    *   Use simple icons or emoji for boolean flags or categorical data.
    *   Style values as tags with distinct colors.
    *   Apply styles using exact value maps or flexible **regular expression rules** (`styleRules`).
    *   Stack multiple tags vertically for multi-value columns (e.g., Organizations).
    *   Optionally hide 'falsey' boolean values (e.g., don't show an icon for `FALSE`).
*   **Data Handling:**
    *   Configurable CSV delimiter.
    *   Automatic parsing of multi-value columns (split by comma).
    *   Recognizes configurable "truthy" values (e.g., "TRUE", "yes", "x", "✓").
    *   Automatic link generation for specified columns.
*   **Filtering:** Apply filters per tab to show specific subsets of data using various operators (equals, not equals, contains, is empty, boolean true/false, etc.) with AND/OR logic.
*   **Client-Side:** Runs entirely in the browser. No backend or database required. Easy to deploy (just host the static files).
*   **Global Icon Key:** Automatically generates a key for configured icon indicators.

## How It Works

1.  **Load `index.html`:** The browser loads the main HTML page.
2.  **Load `config.js`:** The configuration file is loaded, defining all dashboard settings.
3.  **Load JavaScript Modules:** Core logic (`app.js`), data handling (`data-handler.js`), view management (`view-manager.js`), configuration loading (`config-loader.js`), and view-specific renderers (`/js/renderers/*`) are loaded.
4.  **Initialize:** The app sets the title, generates tab controls and view containers based on the config.
5.  **Load Data:**
    *   If `csvUrl` is set in `config.js`, the app attempts to fetch the CSV data from the URL.
    *   Otherwise, it enables the file input for user upload.
6.  **Parse Data:** The fetched or uploaded CSV text is parsed by `data-handler.js` according to `generalSettings` (delimiter, multi-value columns). Headers are extracted.
7.  **Render Views:** For each enabled tab in the config:
    *   The data is filtered based on the tab's `filter` configuration.
    *   The appropriate renderer (`renderer-table.js`, `renderer-kanban.js`, etc.) is called.
    *   The renderer uses `renderer-shared.js` to format data points (tags, icons, links) according to `indicatorStyles`.
    *   The generated HTML is injected into the corresponding view container.
8.  **Interact:** Users can switch between tabs to see different views of the data. Uploading a new file re-triggers the parse and render steps.

## Getting Started

1.  **Download or Clone:** Get the project files:
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```
    Or download the ZIP archive and extract it.

2.  **Configure (`config.js`):**
    *   Open `config.js` in a text editor.
    *   **Crucial:** Set `generalSettings.csvUrl` to the URL of your CSV file **OR** leave it as `null` to enable file upload.
    *   Customize `generalSettings.dashboardTitle`.
    *   Adjust `generalSettings.trueValues`, `csvDelimiter`, `multiValueColumns`, `linkColumns` as needed for your CSV data.
    *   Define `indicatorStyles` for columns you want to style as icons or tags (see **Configuration Details** below).
    *   Configure the `tabs` array:
        *   Add, remove, or modify tab objects.
        *   Set `enabled: true/false` for each tab.
        *   Choose the `type` ('table', 'kanban', 'summary', 'counts').
        *   Define filters (`filter` object) for each tab.
        *   Set view-specific options within the `config` object for each tab (e.g., `displayColumns` for table, `groupByColumn` for kanban).

3.  **Prepare Data (`.csv`):**
    *   Ensure your CSV file is correctly formatted (matching the delimiter in `config.js`).
    *   The first row should contain the headers.
    *   Use consistent values that match your `indicatorStyles` configuration.
    *   A sample file is provided at `/sample_data/security.csv`.

4.  **Run:**
    *   Open the `index.html` file directly in your web browser (Firefox, Chrome, Edge, Safari).
    *   If you didn't set `csvUrl`, use the "Upload CSV" button to load your data file.

## Configuration Details (`config.js`)

This file is central to the dashboard's behavior.

### `generalSettings`

*   `dashboardTitle`: The title shown in the browser tab and at the top of the page.
*   `csvUrl`: URL to fetch the CSV data from. If `null`, enables file upload.
*   `trueValues`: An array of strings (case-insensitive) that represent a "true" value for boolean checks (used by filters and icon conditions).
*   `csvDelimiter`: The character separating values in your CSV (e.g., `,`, `;`, `\t`).
*   `multiValueColumns`: An array of column header names where cell values containing commas should be treated as multiple distinct values (e.g., `["Organization", "Tags"]`).
*   `linkColumns`: An array of column header names where the cell value should be rendered as a clickable link icon (🔗). Assumes the value is a valid URL.

### `indicatorStyles`

This object maps column header names to styling rules.

*   **`type`**: Defines how the column's value should be rendered.
    *   `'icon'`: Renders an icon/emoji.
        *   `trueCondition`: (Optional) Defines the icon, CSS class, and title to show if the value matches `generalSettings.trueValues`.
        *   `valueMap`: (Optional) An object mapping specific cell values (or `default`) to style objects (`{ value: '❓', cssClass: 'optional-css', title: 'Custom Title' }`). **Important:** You can map values like `"false"`, `"FALSE"`, `"0"`, `""` to `{"value": ""}` to explicitly *hide* the icon for those values.
    *   `'tag'`: Renders the value as a styled tag (pill).
        *   `titlePrefix`: (Optional) Text prepended to the value in the tag's hover title.
        *   `layout: 'stacked'`: (Optional) If the column is multi-value, displays each value as a separate tag stacked vertically. Otherwise, tags appear inline.
        *   `valueMap`: (Legacy/Simple) An object mapping specific cell values (case-insensitive fallback) or `'default'` to style objects (`{ text: 'Override Text', bgColor: '#ff0000', textColor: '#ffffff', title: 'Specific Title' }`).
        *   `styleRules`: (Advanced) An array of rules evaluated in order. The first match applies its style.
            *   `matchType`: `'regex'` or `'exact'`.
            *   `pattern`: (For `regex`) The regular expression string (e.g., `":XL$"` to match values ending in `:XL`).
            *   `value`: (For `exact`) The exact string value to match.
            *   `style`: The style object to apply (`{ bgColor, textColor, borderColor, text, title, etc. }`).
        *   `defaultStyle`: (Used with `styleRules`) The style object to apply if no `styleRules` match.
    *   `'none'`: The column value will be displayed as plain text (or handled by `linkColumns`).

*   **Style Object Properties** (used in `valueMap`, `styleRules`, `defaultStyle`):
    *   `value`: (For icons) The icon/emoji character. `""` means render nothing.
    *   `text`: (For tags) Optional text to display instead of the raw value. `""` means render nothing.
    *   `cssClass`: (For icons) CSS class added to the icon's `<span>`.
    *   `bgColor`: (For tags) Background color (e.g., `#e9d8fd`, `rgba(0,0,0,0.1)`).
    *   `textColor`: (For tags) Text color.
    *   `borderColor`: (For tags) Border color. Defaults to `bgColor`.
    *   `title`: Custom hover tooltip text. Defaults to `titlePrefix` + value.

### `tabs`

An array defining the different views available.

*   **Common Properties:**
    *   `id`: A unique identifier for the tab (used internally).
    *   `title`: The text displayed on the tab button.
    *   `type`: The view type: `'table'`, `'kanban'`, `'summary'`, `'counts'`.
    *   `enabled`: `true` to show the tab, `false` to hide it.
    *   `filter`: (Optional) An object defining filtering rules for this tab:
        *   `logic`: `'AND'` (default) or `'OR'`. How multiple conditions are combined.
        *   `conditions`: An array of filter conditions:
            *   `column`: The header name of the column to filter on.
            *   `filterType`: The comparison type (e.g., `'valueEquals'`, `'valueIsNot'`, `'valueInList'`, `'valueNotEmpty'`, `'booleanTrue'`, `'contains'`, `'doesNotContain'`).
            *   `filterValue`: The value(s) to compare against (string, number, or array for `valueInList`/`valueNotInList`).

*   **`type: 'table'` Specific `config`:**
    *   `displayColumns`: Array of header names to show in the table, in order.
    *   `columnWidths`: (Optional) Object mapping header names (or `'default'`) to CSS widths (e.g., `'150px'`, `'10%'`).
    *   `headerOrientations`: (Optional) Object mapping header names (or `'default'`) to `'horizontal'` or `'vertical'` (default).

*   **`type: 'kanban'` Specific `config`:**
    *   `groupByColumn`: Header name of the column to group cards into Kanban columns.
    *   `cardTitleColumn`: Header name for the main title text on each card.
    *   `cardIndicatorColumns`: Array of header names whose values should be displayed as indicators (icons/tags) on the card.
    *   `cardLinkColumn`: (Optional) Header name of a column containing a URL. If set, the card title becomes a link to this URL.
    *   `layout`: (Optional) Object for visual layout:
        *   `minColumnWidth`: Minimum width for Kanban columns (e.g., `'300px'`).
        *   `columnGap`: Gap between Kanban columns.
        *   `itemGap`: Gap between cards/groups within a column.
        *   `maxItemsPerGroupInColumn`: (Optional) Stacks multiple small groups vertically within a visual column before starting a new visual column. Default is 1 (each group gets its own column space).
        *   `preventStackingAboveItemCount`: (Optional) If a group has more items than this number, it will always get its own column, ignoring `maxItemsPerGroupInColumn`.

*   **`type: 'summary'` Specific `config`:**
    *   `groupByColumn`: (Optional) Header name to group items *within* each section below.
    *   `cardIndicatorColumns`: Array of header names for indicators on summary cards.
    *   `cardLinkColumn`: (Optional) Header name for the card title link URL.
    *   `internalLayout`: (Optional) Layout settings (`minColumnWidth`, `columnGap`, `itemGap`, `maxItemsPerGroupInColumn`) applied to the grid *inside* each section.
    *   `sections`: Array defining the sections within the summary view:
        *   `id`: Unique ID for the section.
        *   `title`: Title displayed for the section.
        *   `filterColumn`: Column to check for this section's filter.
        *   `filterType`: Filter type to apply (e.g., `'booleanTrue'`, `'valueEquals'`). `catchAll` includes items not matched by previous sections.
        *   `filterValue`: Value for the filter comparison.
        *   `bgColor`: (Optional) Background color for the section block.
        *   `textColor`: (Optional) Text color for the section block.

*   **`type: 'counts'` Specific `config`:**
    *   `groupByColumn`: Header name to group the counts by (e.g., count per 'Domain').
    *   `counters`: Array defining what to count:
        *   `title`: The label for this counter group (e.g., "High Priority").
        *   `column`: The column whose value determines if an item increments this counter.
        *   `filterType`: Filter type to check the `column` value against (e.g., `'valueEquals'`, `'booleanTrue'`).
        *   `filterValue`: Value for the filter comparison.
        *   `display`: (Optional) How to display the counter title:
            *   `type`: `'icon'` or `'text'`.
            *   `value`: The icon/emoji or text symbol.
            *   `cssClass`: Optional CSS class.

## File Structure

```
├── css/                  # CSS Stylesheets
│   ├── base.css          # Basic HTML element styling, variables
│   ├── components.css    # Shared component styles (cards, tags, icons)
│   ├── layout.css        # Main page layout, tabs, containers
│   ├── view-counts.css   # Styles specific to the Counts view
│   ├── view-kanban.css   # Styles specific to the Kanban view
│   ├── view-summary.css  # Styles specific to the Summary view
│   ├── view-table.css    # Styles specific to the Table view
├── js/                   # JavaScript files
│   ├── renderers/        # View-specific rendering logic
│   │   ├── renderer-counts.js
│   │   ├── renderer-kanban.js
│   │   ├── renderer-shared.js # Common rendering functions (tags, icons, cards)
│   │   ├── renderer-summary.js
│   │   └── renderer-table.js
│   ├── app.js            # Main application logic, event handling, initialization
│   ├── config-loader.js  # Applies settings from config (title, styles)
│   ├── data-handler.js   # CSV parsing, data fetching, filtering logic
│   └── view-manager.js   # Handles tab switching, view display, messages
├── sample_data/          # Example data file
│   └── security.csv
├── config.js             # THE Main Configuration File
├── index.html            # Main HTML structure
└── README.md             # This file
```

## Technology Stack

*   HTML5
*   CSS3
*   Vanilla JavaScript (ES6+)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue for bugs, feature requests, or improvements.

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -am 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

## License

(Optional: Add your license here, e.g., MIT)
This project is licensed under the MIT License - see the LICENSE.md file for details.

```

**Before committing:**

1.  **Replace Placeholders:**
    *   Update the GitHub repository link in the "Download or Clone" section.
    *   Add an actual screenshot/GIF link where indicated (highly recommended!).
    *   Choose and add a LICENSE file and update the "License" section if desired.
2.  **Review:** Read through the README one last time to ensure it accurately reflects your project and is easy to understand. Make sure the configuration details match the features present in your `config.js`.