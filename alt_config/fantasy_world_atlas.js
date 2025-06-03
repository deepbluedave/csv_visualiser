let defaultConfig = { 
  "configVersion": 4.4, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load

  "generalSettings": {
    "dashboardTitle": "Fantasy World Atlas & Gazetteer Project",
    "csvUrl": null, // Set to a URL or leave null for upload
    "trueValues": [ "true", "TRUE", "yes", "y", "1", "✓", "x", "on" ],
    "csvDelimiter": ",",
    "multiValueColumns": ["Tags/Keywords", "Related Entries"],
    "linkColumns": [ "Wiki Link", "Inspiration Link" ],
    // --- NEW: Default Sort Order ---
    "defaultItemSortBy": [
      { "column": "Region", "direction": "asc" },
      { "column": "Entry Type", "direction": "asc" },
      { "column": "Entry Name", "direction": "asc" }
    ],
    // --- Default card indicators (can be added if desired for Kanban/Summary views in viewer) ---
    "defaultCardIndicatorColumns": ["Entry Type", "Status", "Complexity/Size", "Art Needed"]
  },

  "indicatorStyles": {
      "Art Needed": {
          "type": "icon",
          "trueCondition": { "value": "🎨", "cssClass": "cdg-indicator-art-needed", "title": "Artwork Needed"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} }
      },
      "Plot Hook Included": {
          "type": "icon",
          "trueCondition": { "value": "🎣", "cssClass": "cdg-indicator-plot-hook", "title": "Plot Hook Included"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} }
      },
      "Region": {
        "type": "tag", "titlePrefix": "Region: ",
        "valueMap": {
          "Verdant Kingdoms":     { "bgColor": "#d1e7dd", "textColor": "#0f5132" },
          "Dragon Spine Mtns":    { "bgColor": "#adb5bd", "textColor": "#ffffff" },
          "Azure Coast":          { "bgColor": "#cfe2ff", "textColor": "#0a367a" },
          "Shadowlands":          { "bgColor": "#495057", "textColor": "#ffffff" },
          "Sunken Isles":         { "bgColor": "#0dcaf0", "textColor": "#000000" },
          "Whispering Desert":    { "bgColor": "#fef4e5", "textColor": "#885f25" },
          "default":              { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
       "Entry Type": {
        "type": "tag", "titlePrefix": "Type: ",
        "valueMap": {
          "City":             { "bgColor": "#f8d7da", "textColor": "#58151c" },
          "Ruin":             { "bgColor": "#6c757d", "textColor": "#ffffff" },
          "Faction":          { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" },
          "Culture":          { "bgColor": "#fef4e5", "textColor": "#885f25" },
          "Historical Event": { "bgColor": "#fff3cd", "textColor": "#664d03" },
          "Landmark":         { "bgColor": "#d1e7dd", "textColor": "#0f5132" },
          "Character Group":  { "bgColor": "#cfe2ff", "textColor": "#0a367a" },
          "Flora/Fauna":      { "bgColor": "#90ee90", "textColor": "#006400" },
          "Item/Artifact":    { "bgColor": "#ffb6c1", "textColor": "#8b0000" },
          "default":          { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Status": {
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": {
          "Outline":          { "text":"📝 Outline",       "bgColor": "#f8f9fa", "textColor": "#6c757d" },
          "Draft In Progress":{ "text":"✏️ Drafting",      "bgColor": "#cfe2ff", "textColor": "#0a367a" },
          "Needs Detail":     { "text":"❓ Needs Detail",  "bgColor": "#fff3cd", "textColor": "#664d03" },
          "Needs Map Ref":    { "text":"🗺️ Needs Map",    "bgColor": "#fef4e5", "textColor": "#885f25" },
          "Linking Needed":   { "text":"🔗 Linking Needed","bgColor": "#e9d8fd", "textColor": "#5e3a8c" },
          "Review":           { "text":"🧐 Review",       "bgColor": "#fd7e14", "textColor": "#ffffff" },
          "Finalized":        { "text":"✅ Finalized",     "bgColor": "#d1e7dd", "textColor": "#0f5132" },
          "default":          { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Primary Author": {
        "type": "tag", "titlePrefix": "Author: ",
        "valueMap": {
          "Bardrick Quill":   { "bgColor": "#ddebf7", "textColor": "#2a5d8a" },
          "Loremaster Elara": { "bgColor": "#e2f0d9", "textColor": "#537d3b" },
          "WorldForge AI":    { "bgColor": "#adb5bd", "textColor": "#ffffff" },
          "default":          { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Tags/Keywords": {
        "type": "tag", "titlePrefix": "Tags: ",
        "layout": "stacked",
        "valueMap": { "default": { "bgColor": "#dee2e6", "textColor": "#495057" } }
      },
      "Related Entries": {
        "type": "tag", "titlePrefix": "Related: ",
        "layout": "stacked",
        "valueMap": { "default": { "bgColor": "#cfe2ff", "textColor": "#0a367a", "borderColor": "#a3c6ff"} }
      },
      "Complexity/Size": {
          "type": "tag", "titlePrefix": "Size: ",
          "valueMap": {
              "XL": { "text": "📏 XL", "bgColor": "#dc3545", "textColor": "#ffffff", "title":"Complexity: Extra Large" },
              "L":  { "text": "📏 L",  "bgColor": "#ffc107", "textColor": "#343a40", "title":"Complexity: Large" },
              "M":  { "text": "📏 M",  "bgColor": "#17a2b8", "textColor": "#ffffff", "title":"Complexity: Medium" },
              "S":  { "text": "📏 S",  "bgColor": "#28a745", "textColor": "#ffffff", "title":"Complexity: Small" },
              "default": { "bgColor": "#eeeeee", "textColor": "#555" }
          }
      },
      "Draft Date": {
          "type": "tag", "titlePrefix": "Drafted: ",
          "valueMap": { "default": { "bgColor": "#f8f9fa", "textColor": "#6c757d" } }
      },
      "Entry Name": { "type": "text" },
      "Wiki Link": { "type": "none" },
      "Inspiration Link": { "type": "none" }
  },

  "tabs": [
    // --- Tabs content (unchanged from your provided file) ---
    {
      "id": "gazetteer-table",
      "title": "Gazetteer Master List",
      "type": "table",
      "enabled": true,
      "filter": null,
      "config": {
        "displayColumns": [
          "Entry Name", "Region", "Entry Type", "Status", "Primary Author",
          "Complexity/Size", "Tags/Keywords", "Related Entries",
          "Draft Date", "Art Needed", "Plot Hook Included",
          "Wiki Link", "Inspiration Link"
        ],
        "columnWidths": {
            "default": "100px",
            "Entry Name": "250px", "Region": "140px", "Entry Type": "130px",
            "Status": "120px", "Primary Author": "120px",
            "Complexity/Size": "70px", "Tags/Keywords": "200px", "Related Entries": "200px",
            "Draft Date": "100px", "Art Needed": "50px", "Plot Hook Included": "50px",
            "Wiki Link": "50px", "Inspiration Link": "50px"
        },
        "headerOrientations": {
            "default": "vertical",
            "Entry Name": "horizontal", "Region": "horizontal", "Entry Type": "horizontal",
             "Status": "horizontal", "Tags/Keywords": "horizontal", "Related Entries": "horizontal"
        }
        // No "sortBy" here, so it will use generalSettings.defaultItemSortBy
      }
    },
    {
      "id": "kanban-status",
      "title": "📝 Writing Status",
      "type": "kanban",
      "enabled": true,
      "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueIsNot", "filterValue": "Finalized"}] },
      "config": {
        "groupByColumn": "Status",
        "cardTitleColumn": "Entry Name",
        // cardIndicatorColumns will use generalSettings.defaultCardIndicatorColumns
        "cardLinkColumn": "Wiki Link",
        "groupSortBy": "countDesc",
        "itemSortBy": [ // Specific item sort for this Kanban view
          {
            "column": "Complexity/Size",
            "direction": "custom",
            "order": ["XL", "L", "M", "S", ""]
          },
          // No "DueDate" in fantasy_world_atlas.csv, so removing that part of the sort for this example
          // { "column": "DueDate", "direction": "asc" }
          { "column": "Entry Name", "direction": "asc"} // Fallback sort by name
        ],
        "layout": {
            "minColumnWidth": "350px", // Adjusted from original example to make more sense with fewer indicators
            "columnGap": "15px",
            "itemGap": "10px",
            "maxItemsPerGroupInColumn": 5, // Increased to allow more stacking
            "preventStackingAboveItemCount": 10
        }
      }
    },
    {
      "id": "kanban-size-complexity",
      "title": "📏 Size/Complexity", // Changed title
      "type": "kanban",
      "enabled": true,
      "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueIsNot", "filterValue": "Finalized"}] },
      "config": {
        "groupByColumn": "Complexity/Size",
        "cardTitleColumn": "Entry Name",
        // cardIndicatorColumns will use generalSettings.defaultCardIndicatorColumns
        "cardLinkColumn": "Wiki Link",
        "groupSortBy": ["XL", "L", "M", "S"],
        "itemSortBy": [ // Specific item sort
            { "column": "Region", "direction": "asc" },
            { "column": "Entry Name", "direction": "asc" }
        ],
        "layout": {
            "minColumnWidth": "300px",
            "columnGap": "15px",
            "itemGap": "10px",
            "maxItemsPerGroupInColumn": 4,
            "preventStackingAboveItemCount": 8
        }
      }
    },
    // ... (other tabs from your original fantasy_world_atlas.js can remain as they were) ...
    // For brevity, I'm not repeating all of them if they don't interact with defaultItemSortBy
     {
      "id": "kanban-region",
      "title": "🗺️ Regional Progress",
      "type": "kanban",
      "enabled": true,
      "filter": null,
      "config": {
        "groupByColumn": "Region",
        "cardTitleColumn": "Entry Name",
        // Uses default indicators
        "cardLinkColumn": "Wiki Link",
        "layout": { "minColumnWidth": "380px", "columnGap": "12px", "itemGap": "8px" }
        // itemSortBy will use generalSettings.defaultItemSortBy
      }
    },
    {
        "id": "summary-action",
        "title": "❗ Action Needed",
        "type": "summary",
        "enabled": true,
        "filter": {
            "logic": "OR",
            "conditions": [
                { "column": "Status", "filterType": "valueInList", "filterValue": ["Needs Detail", "Needs Map Ref", "Linking Needed"] },
                { "column": "Art Needed", "filterType": "booleanTrue" },
                { "column": "Plot Hook Included", "filterType": "booleanFalse" }
            ]
        },
        "config": {
            "groupByColumn": "Region",
            // Uses default indicators
            "cardLinkColumn": "Wiki Link",
            // itemSortBy will use generalSettings.defaultItemSortBy for pre-section sort
            "internalLayout": { "minColumnWidth": "350px", "columnGap": "15px", "itemGap": "10px" },
            "sections": [
                 { "id": "summary-needs-detail", "title": "❓ Needs Content Detail", "filterColumn": "Status", "filterType": "valueEquals", "filterValue": "Needs Detail", "bgColor": "#fff3cd", "textColor": "#664d03" },
                 { "id": "summary-needs-links", "title": "🔗 Needs Connections/Linking", "filterColumn": "Status", "filterType": "valueEquals", "filterValue": "Linking Needed", "bgColor": "#e9d8fd", "textColor": "#5e3a8c" },
                 { "id": "summary-needs-map", "title": "🗺️ Needs Map Reference", "filterColumn": "Status", "filterType": "valueEquals", "filterValue": "Needs Map Ref", "bgColor": "#fef4e5", "textColor": "#885f25" },
                 { "id": "summary-needs-art", "title": "🎨 Needs Artwork", "filterColumn": "Art Needed", "filterType": "booleanTrue", "bgColor": "#cfe2ff", "textColor": "#0a367a" },
                 { "id": "summary-needs-hooks", "title": "🎣 Needs Plot Hooks", "filterColumn": "Plot Hook Included", "filterType": "booleanFalse", "bgColor": "#f8d7da", "textColor": "#58151c" }
            ]
        }
    },
    {
        "id": "counts-types-by-region",
        "title": "📊 Content Types by Region",
        "type": "counts",
        "enabled": true,
        "filter": null,
        "config": {
            "groupByColumn": "Region",
            "counters": [
                { "title": "Cities", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "City" },
                { "title": "Ruins", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Ruin" },
                // ... other counters as in your original
                { "title": "Factions", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Faction" },
                { "title": "Cultures", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Culture" },
                { "title": "Historical Events", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Historical Event" },
                { "title": "Landmarks", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Landmark" },
                { "title": "Character Groups", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Character Group" },
                { "title": "Flora/Fauna", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Flora/Fauna" },
                { "title": "Items/Artifacts", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Item/Artifact" }
            ]
        }
    },
   {
    "id": "concept-graph", // Changed ID for consistency
    "title": "🕸️ Concept Graph",
    "type": "graph",
    "enabled": true,
    "filter": null,
    "config": {
      "primaryNodeIdColumn": "Entry Name", // Changed to Entry Name for more distinct primary nodes
      "primaryNodeLabelColumn": "Entry Name",
      "categoryNodeColumns": ["Region", "Entry Type", "Primary Author", "Tags/Keywords"], // Added Primary Author, removed Related Entries to simplify
      "nodeColorColumn": "Complexity/Size",
      "categoryNodeStyle": {
          "shape": "dot",
          "color": { "background": "#f0f0f0", "border": "#cccccc" },
          "font": { "color": "#555555", "size": 10 }, // Slightly larger font for categories
          "size": 6 // Slightly larger category dots
      },
      "nodeTooltipColumns": ["Region", "Entry Type", "Status", "Complexity/Size", "Primary Author"],
      "edgeDirection": "undirected",
      "edgeColor": "#d0d0d0", // Slightly darker edge
      "layoutEngine": "forceDirected",
      "physicsEnabled": true,
      "nodeShape": "ellipse" // Default for primary nodes
    }
  }
  ]
};

// Ensure it can be picked up by the editor's loadJsConfigurationFile if it's looking for window.defaultConfig
// However, the primary way the editor loads this is by looking for `let defaultConfig = ...`
// So the `window.defaultConfig = defaultConfig;` line is usually not needed if `loadJsConfigurationFile`
// is adapted as we discussed to handle 'let' declarations.
// For maximum compatibility with the current editor loader, you might ensure the file *ends* with this:
// if (typeof window !== 'undefined') { window.defaultConfig = defaultConfig; }
// But since the editor's loader was modified to handle `let defaultConfig`, this is less critical.

// --- END OF FILE fantasy_world_atlas.js (VIEWER CONFIG) ---