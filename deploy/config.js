// --- START OF FILE config.js ---

let defaultConfig = {
  "configVersion": 4.3, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load

  "generalSettings": {
    "dashboardTitle": "Fantasy World Atlas & Gazetteer Project",
    "csvUrl": null, // Set to a URL or leave null for upload
    "trueValues": [ "true", "TRUE", "yes", "y", "1", "✓", "x", "on" ],
    "csvDelimiter": ",",
    "multiValueColumns": ["Tags/Keywords", "Related Entries"], // Columns with comma-separated values
    "linkColumns": [ "Wiki Link", "Inspiration Link" ] // Columns containing URLs
  },

  // Global styles for indicators (tags/icons) used across tabs
  "indicatorStyles": {
      // --- Boolean Icon Indicators ---
      "Art Needed": {
          "type": "icon",
          "trueCondition": { "value": "🎨", "cssClass": "cdg-indicator-art-needed", "title": "Artwork Needed"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false
      },
      "Plot Hook Included": {
          "type": "icon",
          "trueCondition": { "value": "🎣", "cssClass": "cdg-indicator-plot-hook", "title": "Plot Hook Included"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false
      },

      // --- Tag Indicators ---
      "Region": {
        "type": "tag", "titlePrefix": "Region: ",
        "valueMap": {
          "Verdant Kingdoms":     { "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Dragon Spine Mtns":    { "bgColor": "#adb5bd", "textColor": "#ffffff" }, // Grey
          "Azure Coast":          { "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Shadowlands":          { "bgColor": "#495057", "textColor": "#ffffff" }, // Dark Grey
          "Sunken Isles":         { "bgColor": "#0dcaf0", "textColor": "#000000" }, // Cyan
          "Whispering Desert":    { "bgColor": "#fef4e5", "textColor": "#885f25" }, // Sandy
          "default":              { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
       "Entry Type": {
        "type": "tag", "titlePrefix": "Type: ",
        "valueMap": {
          "City":             { "bgColor": "#f8d7da", "textColor": "#58151c" }, // Reddish
          "Ruin":             { "bgColor": "#6c757d", "textColor": "#ffffff" }, // Grey
          "Faction":          { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" }, // Purple
          "Culture":          { "bgColor": "#fef4e5", "textColor": "#885f25" }, // Sandy
          "Historical Event": { "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Landmark":         { "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Character Group":  { "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Flora/Fauna":      { "bgColor": "#90ee90", "textColor": "#006400" }, // LightGreen
          "Item/Artifact":    { "bgColor": "#ffb6c1", "textColor": "#8b0000" }, // LightPink
          "default":          { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Status": {
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": {
          "Outline":          { "text":"📝 Outline",       "bgColor": "#f8f9fa", "textColor": "#6c757d" }, // Light Grey
          "Draft In Progress":{ "text":"✏️ Drafting",      "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Needs Detail":     { "text":"❓ Needs Detail",  "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Needs Map Ref":    { "text":"🗺️ Needs Map",    "bgColor": "#fef4e5", "textColor": "#885f25" }, // Sandy
          "Linking Needed":   { "text":"🔗 Linking Needed","bgColor": "#e9d8fd", "textColor": "#5e3a8c" }, // Purple
          "Review":           { "text":"🧐 Review",       "bgColor": "#fd7e14", "textColor": "#ffffff" }, // Orange
          "Finalized":        { "text":"✅ Finalized",     "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
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
        "valueMap": { "default": { "bgColor": "#dee2e6", "textColor": "#495057" } } // Simple default
      },
      "Related Entries": {
        "type": "tag", "titlePrefix": "Related: ",
        "layout": "stacked",
        "valueMap": { "default": { "bgColor": "#cfe2ff", "textColor": "#0a367a", "borderColor": "#a3c6ff"} } // Different default
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

      // --- Columns to display as plain text or handled by linkColumns ---
      "Entry Name": { "type": "none" },
      "Wiki Link": { "type": "none" },       // Handled by linkColumns
      "Inspiration Link": { "type": "none" } // Handled by linkColumns
  },

  // --- Tab Definitions ---
  "tabs": [
    // --- Tab 1: Master Gazetteer Table ---
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
      }
    },

    // --- Tab 2: Kanban by Writing Status ---
    {
      "id": "kanban-status",
      "title": "📝 Writing Status",
      "type": "kanban",
      "enabled": true,
      "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueIsNot", "filterValue": "Finalized"}] }, // Hide finalized?
      "config": {
        "groupByColumn": "Status",
        "cardTitleColumn": "Entry Name",
        "cardIndicatorColumns": [
            "Entry Type",
            "Region",
            "Primary Author",
            "Complexity/Size",
            "Art Needed" // Icon
        ],
        "cardLinkColumn": "Wiki Link",
        "layout": {
            "minColumnWidth": "500px", // Base column width
            "columnGap": "15px",       // Space between columns
            "itemGap": "15px",         // Space between group blocks *within* a stacked column
            // --- Stacking Controls ---
            "maxItemsPerGroupInColumn": 3, // Allow up to 3 status groups vertically per column area
            "preventStackingAboveItemCount": 8 // If any status has > 8 entries, give it its own column area
        }
      }
    },

    // --- Tab 3: Kanban by Region ---
    {
      "id": "kanban-region",
      "title": "🗺️ Regional Progress",
      "type": "kanban",
      "enabled": true,
      "filter": null,
      "config": {
        "groupByColumn": "Region",
        "cardTitleColumn": "Entry Name",
        "cardIndicatorColumns": [
            "Entry Type",
            "Status",
            "Primary Author",
            "Plot Hook Included" // Icon
        ],
        "cardLinkColumn": "Wiki Link",
        "layout": { "minColumnWidth": "440px", "columnGap": "12px", "itemGap": "8px" }
      }
    },

    // --- Tab 4: Summary - Action Needed ---
    {
        "id": "summary-action",
        "title": "❗ Action Needed",
        "type": "summary",
        "enabled": true,
        "filter": {
            "logic": "OR", // Show if *any* action is needed
            "conditions": [
                { "column": "Status", "filterType": "valueInList", "filterValue": ["Needs Detail", "Needs Map Ref", "Linking Needed"] },
                { "column": "Art Needed", "filterType": "booleanTrue" },
                { "column": "Plot Hook Included", "filterType": "booleanFalse" } // Find those MISSING plot hooks
            ]
        },
        "config": {
            "groupByColumn": "Region", // Group action items by region
            "cardIndicatorColumns": [
                "Entry Type",
                "Status", // Show the status tag indicating why it needs action
                "Primary Author",
                "Art Needed",           // Include icons
                "Plot Hook Included",
                "Wiki Link"             // Link to edit
            ],
            "internalLayout": { "minColumnWidth": "350px", "columnGap": "15px", "itemGap": "10px" },
            "cardLinkColumn": "Wiki Link",
            "sections": [
                 // Order sections by likely priority or workflow step
                 { "id": "summary-needs-detail", "title": "❓ Needs Content Detail", "filterColumn": "Status", "filterType": "valueEquals", "filterValue": "Needs Detail", "bgColor": "#fff3cd", "textColor": "#664d03" },
                 { "id": "summary-needs-links", "title": "🔗 Needs Connections/Linking", "filterColumn": "Status", "filterType": "valueEquals", "filterValue": "Linking Needed", "bgColor": "#e9d8fd", "textColor": "#5e3a8c" },
                 { "id": "summary-needs-map", "title": "🗺️ Needs Map Reference", "filterColumn": "Status", "filterType": "valueEquals", "filterValue": "Needs Map Ref", "bgColor": "#fef4e5", "textColor": "#885f25" },
                 { "id": "summary-needs-art", "title": "🎨 Needs Artwork", "filterColumn": "Art Needed", "filterType": "booleanTrue", "bgColor": "#cfe2ff", "textColor": "#0a367a" },
                 { "id": "summary-needs-hooks", "title": "🎣 Needs Plot Hooks", "filterColumn": "Plot Hook Included", "filterType": "booleanFalse", "bgColor": "#f8d7da", "textColor": "#58151c" }, // Filter for FALSE
                 // Catch-all probably not needed if OR filter covers all sections
                 // { "id": "summary-other-action", "title": "Other Action (Passed Tab Filter)", "filterColumn": null, "filterType": "catchAll", "bgColor": "#f8f9fa", "textColor": "#6c757d" }
            ]
        }
    },

     // --- Tab 5: Counts - Entry Type by Region ---
    {
        "id": "counts-types-by-region",
        "title": "📊 Content Types by Region",
        "type": "counts",
        "enabled": true,
        "filter": null, // Count all entries
        "config": {
            // groupByColumn: What each small box represents (the Region)
            "groupByColumn": "Region",

            // counters: Define each Entry Type we want to count
            "counters": [
                { "title": "Cities", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "City" },
                { "title": "Ruins", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Ruin" },
                { "title": "Factions", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Faction" },
                { "title": "Cultures", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Culture" },
                { "title": "Historical Events", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Historical Event" },
                { "title": "Landmarks", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Landmark" },
                { "title": "Character Groups", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Character Group" },
                { "title": "Flora/Fauna", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Flora/Fauna" },
                { "title": "Items/Artifacts", "column": "Entry Type", "filterType": "valueEquals", "filterValue": "Item/Artifact" }
                 // Add display icons if desired
            ]
        }
    },
    
   // --- Tab Hub Spoke Graph ---
   {
    "id": "aqa-concept-graph",
    "title": "🕸️ Concept Graph",
    "type": "graph", // New type
    "enabled": true,  // <<< FEATURE TOGGLE: Set to false to hide this tab
    "filter": null,  // Optional: Filter data before graphing (e.g., only Core Content)
    "config": {
      // --- Node Configuration ---
      "primaryNodeIdColumn": "Region",               // Column with unique ID for the main 'things'
      "primaryNodeLabelColumn": "Region",// Column for the label of the main 'things'
      "categoryNodeColumns": ["Entry Name", "Entry Type"], // Columns whose values become category nodes
      // Optional: Color primary nodes based on their Unit
      "nodeColorColumn": "Complexity/Size", // Column for color coding primary nodes
      // Optional: Distinct style for category nodes

      /*
      ellipse: (Usually the default) An oval shape.
      circle: A perfect circle.
      database: Represents a cylinder, often used for databases.
      box: A rectangle.
      text: A rectangle that sizes itself to fit the label text (no explicit shape outline unless borders are styled).
      diamond: A diamond shape (rotated square).
      dot: A small circle, typically with a fixed size (can be scaled with the size option).
      star: A five-pointed star.
      triangle: An upward-pointing triangle.
      triangleDown: A downward-pointing triangle.
      hexagon: A six-sided polygon.
      square: A square shape.
      */

      "categoryNodeStyle": {
          "shape": "dot", // Make categories visually distinct
          "color": { "background": "#f0f0f0", "border": "#cccccc" },
          "font": { "color": "#555555", "size": 8 }
      },
      // Optional: Columns to show in the tooltip of primary nodes
      "nodeTooltipColumns": ["Primary Author", "Complexity/Size", "Tags/Keywords", "Related Entries"],

      // --- Edge Configuration ---
      // Edges go FROM primary node TO category node
      "edgeDirection": "undirected", // 'directed' or 'undirected'
      "edgeColor": "#cccccc",        // Optional: Static color for edges

      // --- Layout & Appearance (Vis.js options mapped here) ---
      "layoutEngine": "forceDirected", // 'forceDirected' (default), 'hierarchical', etc.
      "physicsEnabled": true,          // Let the graph settle
      "nodeShape": "dot"          // Default shape for primary nodes
    }
  }
  ]
};
// --- END OF FILE config.js ---