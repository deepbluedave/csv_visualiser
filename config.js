// --- START OF FILE config.js ---

let defaultConfig = {
  "configVersion": 9.0, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load

  "generalSettings": {
    "dashboardTitle": "Aethelgard's Arcane Archives",
    "csvUrl": null, // Use null for upload initially, fallback works if URL specified & fails
    "csvUrl": "./sample_data/aethelgard_archive.csv", // Example if hosting locally
    "trueValues": ["TRUE", "true", "Yes", "1", "Cursed", "Dangerous"], // Flexible true values
    "csvDelimiter": ",",
    "multiValueColumns": ["Keywords", "RelatedItems"], // Columns with comma-separated values
    "linkColumns": ["WikiLink", "ItemID"], // Columns that CAN be links
    "linkPrefixes": {
      // Defines prefix for columns in linkColumns that DON'T contain full URLs
      "ItemID": "https://aethelgard-archive.local/wiki/item/"
      // WikiLink is NOT listed here, so its values are treated as full URLs if they look like them
    },
    "defaultCardIndicatorColumns": [ // Default indicators on Kanban/Summary cards
      "ItemType",
      "DangerLevel",
      "ResearchStatus",
      "LocationFound",
      "IsCursed" // Added cursed status to default indicators
    ],
    "defaultItemSortBy": [ // Default sort order for items within groups/tables
      { "column": "DangerLevel", "direction": "custom", "order": ["Existential Risk", "Significant Threat", "Minor Anomaly", "Mundane"] },
      { "column": "DiscoveryDate", "direction": "desc" }
    ]
  },

  "indicatorStyles": {
    // --- Columns handled by linkColumns/linkPrefixes or plain text ---
    "ItemID": { "type": "none" },
    "ItemName": { "type": "none" },
    "DiscoveryDate": { "type": "none" },
    "RelatedItems": { "type": "none" }, // Usually just text or handled by graph
    "ArchiveSection": { "type": "none" },
    "WikiLink": { "type": "none" },
    "Notes": { "type": "none" },

    // --- Icons ---
    "ItemType": {
      "type": "icon", "titlePrefix": "Type: ",
      "valueMap": {
        "Scroll":           { "value": "📜", "title": "Scroll" },
        "Artifact":         { "value": "💎", "title": "Artifact" },
        "Potion":           { "value": "🧪", "title": "Potion" },
        "Bestiary Note":    { "value": "🐾", "title": "Bestiary Note" },
        "Location Fragment":{ "value": "🗺️", "title": "Location Fragment" },
        "Research Log":     { "value": "🔬", "title": "Research Log" },
        "default":          { "value": "❓", "title": "Unknown Item Type" }
      }
    },
    "IsCursed": {
      "type": "icon",
      "trueCondition": { "value": "☠️", "title": "Cursed!", "cssClass": "icon-cursed" },
      // Hide false values explicitly
      "valueMap": { "FALSE": {"value": ""}, "false": {"value": ""}, "0": {"value":""}, "": {"value":""} }
    },
    "RequiresContainment": {
      "type": "icon",
      "trueCondition": { "value": "🔒", "title": "Containment Required" },
      "valueMap": { "FALSE": {"value": ""}, "false": {"value": ""}, "0": {"value":""}, "": {"value":""} } // Hide false
    },

    // --- Tags ---
    "LocationFound": {
      "type": "tag", "titlePrefix": "Location: ",
      "valueMap": {
        "Sunken Library":   { "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
        "Obsidian Peak":    { "bgColor": "#adb5bd", "textColor": "#ffffff" }, // Grey
        "Whispering Caves": { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" }, // Purple
        "Astral Plane":     { "bgColor": "#495057", "textColor": "#ffffff" }, // Dark Grey
        "Unknown":          { "bgColor": "#f8f9fa", "textColor": "#6c757d" }, // Light Grey
        "default":          { "bgColor": "#e9ecef", "textColor": "#495057" }
      }
    },
    "ResearcherAssigned": {
      "type": "tag", "titlePrefix": "Scholar: ",
      "valueMap": {
        "Elara Meadowlight": { "bgColor": "#e2f0d9", "textColor": "#537d3b" },
        "Borin Stonehand":   { "bgColor": "#fef4e5", "textColor": "#885f25" },
        "Zara the Subtle":   { "bgColor": "#fce8f3", "textColor": "#8f2c5f" },
        "Pending Assignment":{ "bgColor": "#fff3cd", "textColor": "#664d03" },
        "default":           { "bgColor": "#e9ecef", "textColor": "#495057" }
      }
    },
    "ResearchStatus": {
      "type": "tag", "titlePrefix": "Status: ",
      "styleRules": [ // Use rules for specific emphasis
        { "matchType": "exact", "value": "Uncatalogued", "style": { "bgColor": "#f8f9fa", "textColor": "#6c757d" } },
        { "matchType": "exact", "value": "Requires Containment", "style": { "bgColor": "#f8d7da", "textColor": "#58151c", "text": "🔒 Requires Containment"} },
        { "matchType": "exact", "value": "Verified Safe", "style": { "bgColor": "#d1e7dd", "textColor": "#0f5132", "text": "✅ Verified Safe" } },
        { "matchType": "exact", "value": "Archival Recommended", "style": { "bgColor": "#6c757d", "textColor": "#ffffff" } }
      ],
      "defaultStyle": { "bgColor": "#cfe2ff", "textColor": "#0a367a" } // Default for "Analysis Pending", "Active Research" etc.
    },
    "DangerLevel": {
      "type": "tag", "titlePrefix": "Danger: ",
      "styleRules": [ // Use rules for severity levels
        { "matchType": "exact", "value": "Existential Risk", "style": { "bgColor": "#6f1d1b", "textColor": "#ffffff", "text": "💀 Existential Risk" } },
        { "matchType": "exact", "value": "Significant Threat", "style": { "bgColor": "#dc3545", "textColor": "#ffffff", "text": "❗ Significant Threat"} },
        { "matchType": "exact", "value": "Minor Anomaly", "style": { "bgColor": "#ffc107", "textColor": "#343a40", "text": "⚠️ Minor Anomaly" } },
        { "matchType": "exact", "value": "Mundane", "style": { "bgColor": "#d1e7dd", "textColor": "#0f5132", "text": "⚪ Mundane" } }
      ],
      "defaultStyle": { "bgColor": "#e9ecef", "textColor": "#495057" } // Fallback for unknown levels
    },
    "Keywords": {
      "type": "tag", "titlePrefix": "Keyword: ",
      "layout": "stacked", // Stack multiple keywords vertically
      "defaultStyle": { "bgColor": "#dee2e6", "textColor": "#495057" } // Simple default style
    }
  },

  // --- Tab Definitions ---
  "tabs": [
    // --- Tab 1: Master Catalog (Table) ---
    {
      "id": "master-catalog",
      "title": "📜 Master Catalog",
      "type": "table",
      "enabled": true,
      "filter": null, // Show all items
      "config": {
        "displayColumns": [ // Select and order columns
          "ItemID", // Will render as link based on linkColumns/linkPrefixes
          "ItemName",
          "ItemType",
          "DangerLevel",
          "ResearchStatus",
          "LocationFound",
          "IsCursed",
          "RequiresContainment",
          "Keywords", // Multi-value column
          "WikiLink" // Will render link icon if value is a valid URL
        ],
        "columnWidths": { // Customize widths
          "default": "100px",
          "ItemID": "60px",
          "ItemName": "250px",
          "ItemType": "50px",
          "DangerLevel": "140px",
          "ResearchStatus": "160px",
          "Keywords": "200px",
          "IsCursed": "50px",
          "RequiresContainment": "50px",
          "WikiLink": "50px"
        },
        "headerOrientations": { // Customize header text direction
          "default": "vertical", // Most vertical
          "ItemName": "horizontal",
          "Keywords": "horizontal"
        },
        "sortBy": [ // Specific initial sort for this table
          { "column": "DiscoveryDate", "direction": "desc" },
          { "column": "ItemName", "direction": "asc" }
        ]
      }
    },

    // --- Tab 2: Table Sorted by Default ---
    {
      "id": "default-sort-table",
      "title": "⚠️ Sorted by Danger",
      "type": "table",
      "enabled": true,
      "filter": null,
      "config": {
        "displayColumns": ["ItemName", "DangerLevel", "DiscoveryDate", "ResearchStatus"],
        // No "sortBy" defined here, so it will use generalSettings.defaultItemSortBy
        "columnWidths": { "ItemName": "250px", "DangerLevel": "140px" },
        "headerOrientations": { "default": "horizontal" }
      }
    },

    // --- Tab 3: Research Workflow (Kanban) ---
    {
      "id": "research-workflow",
      "title": "🔬 Research Status",
      "type": "kanban",
      "enabled": true,
      "bgColor": "#e2f0d9", // Custom tab color
      "textColor": "#537d3b",
      "filter": { // Filter out items already deemed safe or archived
          "logic": "AND",
          "conditions": [
              { "column": "ResearchStatus", "filterType": "valueNotInList", "filterValue": ["Verified Safe", "Archival Recommended"] }
          ]
      },
      "config": {
        "groupByColumn": "ResearchStatus",
        "groupSortBy": ["Requires Containment", "Uncatalogued", "Analysis Pending", "Active Research"], // Custom sort order for columns
        "cardTitleColumn": "ItemName",
        // "cardIndicatorColumns": null, // Explicitly null would use the default defined in generalSettings
        "cardLinkColumn": "ItemID", // Link card title using prefix
        // "itemSortBy": null, // Explicitly null would use the default defined in generalSettings
        "layout": {
          "minColumnWidth": "320px",
          "columnGap": "15px",
          "itemGap": "10px",
          "maxItemsPerGroupInColumn": 3, // Allow stacking up to 5 small groups vertically
          "preventStackingAboveItemCount": 5 // Groups >10 items get their own column space
        }
      }
    },

    // --- Tab 4: Regional Threats (Summary) ---
    {
      "id": "regional-threats",
      "title": "🗺️ Regional Threats",
      "type": "summary",
      "enabled": true,
      "filter": { // Only show items that pose some risk
        "logic": "AND",
        "conditions": [
          { "column": "DangerLevel", "filterType": "valueIsNot", "filterValue": "Mundane" }
        ]
      },
      "config": {
        "groupByColumn": "DangerLevel", // Sub-group items WITHIN sections by danger level
        "cardIndicatorColumns": [ // Override default indicators for this view
          "ItemType",
          "ResearchStatus",
          "IsCursed",
          "RequiresContainment",
          "ItemID" // Show ItemID link on card
        ],
        "cardLinkColumn": "ItemID", // Also link the card title
        // "itemSortBy": null, // Will use default sort (by danger, then date) before sectioning
        "internalLayout": { // Layout settings for the grid INSIDE each section
          "minColumnWidth": "350px",
          "columnGap": "10px",
          "itemGap": "8px"
        },
        "sections": [ // Define the sections based on LocationFound
          { "id": "sec-obsidian", "title": "Obsidian Peak Findings", "filterColumn": "LocationFound", "filterType": "valueEquals", "filterValue": "Obsidian Peak", "bgColor": "#e9ecef" },
          { "id": "sec-sunken", "title": "Sunken Library Discoveries", "filterColumn": "LocationFound", "filterType": "valueEquals", "filterValue": "Sunken Library", "bgColor": "#d1ecf1" },
          { "id": "sec-whispering", "title": "Whispering Caves Mysteries", "filterColumn": "LocationFound", "filterType": "valueEquals", "filterValue": "Whispering Caves", "bgColor": "#fff3cd" },
          { "id": "sec-astral", "title": "Astral Plane Anomalies", "filterColumn": "LocationFound", "filterType": "valueEquals", "filterValue": "Astral Plane", "bgColor": "#495057", "textColor": "#ffffff"},
          { "id": "sec-unknown", "title": "Unlocated Threats", "filterColumn": "LocationFound", "filterType": "valueEquals", "filterValue": "Unknown", "textColor": "#6c757d" },
          { "id": "sec-catchall", "title": "Other Locations", "filterColumn": null, "filterType": "catchAll", "bgColor": "#f8f9fa" } // Catch any remaining locations
        ]
      }
    },

    // --- Tab 5: Archive Statistics (Counts) ---
    {
      "id": "archive-stats",
      "title": "📊 Statistics",
      "type": "counts",
      "enabled": true,
      "filter": null, // Count across all items
      "config": {
        "groupByColumn": "LocationFound", // Group counts by location
        "counters": [
          // Predefined counter (simple)
          {
            "title": "☠️ Cursed Items",
            "logic": "AND", // Technically only one condition
            "conditions": [
              { "column": "IsCursed", "filterType": "booleanTrue" }
            ]
            // Optional display can be added
          },
          // Predefined counter (multi-condition)
          {
            "title": "Contained Threats",
            "logic": "AND",
            "conditions": [
              { "column": "RequiresContainment", "filterType": "booleanTrue" },
              { "column": "ResearchStatus", "filterType": "valueEquals", "filterValue": "Requires Containment" }
            ],
            "display": { "type": "icon", "value": "🔒"}
          },
           // Predefined counter (multi-condition with list)
          {
            "title": "High/Existential Risk (Not Safe)",
            "logic": "AND",
            "conditions": [
              { "column": "DangerLevel", "filterType": "valueInList", "filterValue": ["Significant Threat", "Existential Risk"] },
              { "column": "ResearchStatus", "filterType": "valueIsNot", "filterValue": "Verified Safe" }
            ],
             "display": { "type": "icon", "value": "🚨"}
          },
          // Dynamic counter
          {
            "title": "Item Type Breakdown",
            "column": "ItemType",
            "filterType": "countAllValues"
          },
          // Dynamic counter
          {
            "title": "Researcher Load",
            "column": "ResearcherAssigned",
            "filterType": "countAllValues"
          }
        ]
      }
    },

    // --- Tab 6: Knowledge Web (Graph) ---
    {
      "id": "knowledge-web",
      "title": "🕸️ Knowledge Web",
      "type": "graph",
      "enabled": true,
      "filter": null, // Graph the whole archive
      "config": {
        "primaryNodeIdColumn": "ItemID",
        "primaryNodeLabelColumn": "ItemName",
        "categoryNodeColumns": ["ItemType", "LocationFound", "Keywords", "ResearcherAssigned"], // Connect items to multiple category types
        "nodeColorColumn": "DangerLevel", // Color primary nodes by danger level
        "categoryNodeStyle": { // Make category nodes visually distinct
          "shape": "dot",
          "color": { "background": "#EEEEEE", "border": "#CCCCCC" },
          "font": { "size": 10, "color": "#555555"},
          "size": 5 // Make category dots smaller
        },
        "nodeTooltipColumns": ["ItemType", "ResearchStatus", "DangerLevel", "DiscoveryDate", "RequiresContainment", "IsCursed"], // Info on hover
        "edgeDirection": "undirected",
        "layoutEngine": "forceDirected", // Use physics-based layout
        "physicsEnabled": true,
        "nodeShape": "ellipse" // Default shape for items
      }
    }
  ]
};
// --- END OF FILE config.js ---