// --- START OF FILE config.js ---

let defaultConfig = {
  "configVersion": 4.1, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load

  "generalSettings": {
    "dashboardTitle": "Magical Creature Sanctuary Management",
    "csvUrl": null, // Set to a URL or leave null for upload
    "trueValues": [ "true", "TRUE", "yes", "y", "1", "✓", "x", "on" ],
    "csvDelimiter": ",",
    "multiValueColumns": ["Care Specialist", "Dietary Needs"], // Columns with comma-separated values
    "linkColumns": [ "Enclosure Link", "Care Log Link" ] // Columns containing URLs
  },

  // Global styles for indicators (tags/icons) used across tabs
  "indicatorStyles": {
      // --- Boolean Icon Indicators ---
      "Endangered Status":   {
          "type": "icon",
          "trueCondition": { "value": "🛡️", "cssClass": "cdg-indicator-endangered", "title": "Endangered Species Status"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false
      },
      "Special Handling Req.":   {
          "type": "icon",
          "trueCondition": { "value": "⚠️", "cssClass": "cdg-indicator-handling", "title": "Special Handling Required!"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false
      },

      // --- Tag Indicators ---
      "Species": {
        "type": "tag", "titlePrefix": "Species: ",
        "valueMap": {
          "Phoenix":      { "bgColor": "#f8d7da", "textColor": "#58151c" }, // Reddish
          "Griffin":      { "bgColor": "#fef4e5", "textColor": "#885f25" }, // Brownish
          "Mooncalf":     { "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Niffler":      { "bgColor": "#adb5bd", "textColor": "#ffffff" }, // Grey
          "Dragon":       { "bgColor": "#6f1d1b", "textColor": "#ffffff" }, // Dark Red
          "Hippogriff":   { "bgColor": "#e9ecef", "textColor": "#495057" }, // Light Grey
          "Thestral":     { "bgColor": "#495057", "textColor": "#ffffff" }, // Dark Grey
          "default":      { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Habitat Zone": {
        "type": "tag", "titlePrefix": "Zone: ",
        "valueMap": {
          "Volcanic Peaks":   { "bgColor": "#fd7e14", "textColor": "#ffffff" }, // Orange
          "Whispering Woods": { "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Celestial Meadow": { "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Light Blue
          "Crystal Caves":    { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" }, // Purple
          "Shadow Fen":       { "bgColor": "#6c757d", "textColor": "#ffffff" }, // Dark Grey
          "default":          { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
       "Temperament": {
        "type": "tag", "titlePrefix": "Temperament: ",
        "valueMap": {
          "Docile":       { "text":"😊 Docile",     "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Skittish":     { "text":"😨 Skittish",   "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Playful":      { "text":"<0xF0><0x9F><0xA7><0xBD> Playful",    "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue // Note: Emoji might need UTF-8 saving
          "Territorial":  { "text":"😠 Territorial","bgColor": "#fef4e5", "textColor": "#885f25" }, // Orange
          "Aggressive":   { "text":"<0xF0><0x9F><0xAB><0x82> Aggressive", "bgColor": "#f8d7da", "textColor": "#58151c" }, // Red // Note: Emoji might need UTF-8 saving
          "default":      { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Status": {
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": {
          "Healthy":        { "text":"✅ Healthy",       "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Injured":        { "text":"🩹 Injured",       "bgColor": "#f8d7da", "textColor": "#58151c" }, // Red
          "Quarantine":     { "text":"🔬 Quarantine",    "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Acclimatizing":  { "text":"🏠 Acclimatizing", "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Breeding Program":{ "text":"💞 Breeding",      "bgColor": "#fce8f3", "textColor": "#8f2c5f" }, // Pink
          "Released":       { "text":"🌲 Released",      "bgColor": "#6c757d", "textColor": "#ffffff" }, // Grey
          "default":        { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Care Specialist": {
        "type": "tag", "titlePrefix": "Care: ",
        "layout": "stacked", // Enable stacking
        "valueMap": {
          "Elara Meadowlight": { "bgColor": "#e2f0d9", "textColor": "#537d3b" },
          "Gorok Stonehand":   { "bgColor": "#fef4e5", "textColor": "#885f25" },
          "default":           { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
       "Dietary Needs": {
        "type": "tag", "titlePrefix": "Diet: ",
        "layout": "stacked", // Enable stacking
        "valueMap": {
            "Sun Grains":   { "bgColor": "#fff3cd", "textColor": "#664d03" },
            "Moon Dew":     { "bgColor": "#cfe2ff", "textColor": "#0a367a" },
            "Gemstones":    { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" },
            "Fire Salts":   { "bgColor": "#f8d7da", "textColor": "#58151c" },
            "Insects":      { "bgColor": "#d1e7dd", "textColor": "#0f5132" },
            "default":      { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Last Health Check": {
          "type": "tag", "titlePrefix": "Checked: ",
          "valueMap": { "default": { "bgColor": "#f8f9fa", "textColor": "#6c757d" } }
      },
      "Magical Property": {
          "type": "tag", "titlePrefix": "Magic: ",
          "valueMap": {
              "Healing Tears":    { "bgColor": "#fce8f3", "textColor": "#8f2c5f" },
              "Illumination":     { "bgColor": "#fff3cd", "textColor": "#664d03" },
              "Metal Detection":  { "bgColor": "#adb5bd", "textColor": "#ffffff" },
              "Fire Breath":      { "bgColor": "#fd7e14", "textColor": "#ffffff" },
              "Invisibility":     { "bgColor": "#dee2e6", "textColor": "#495057" },
              "default":          { "bgColor": "#e9ecef", "textColor": "#495057" }
          }
      },

      // --- Columns to display as plain text or handled by linkColumns ---
      "Creature Name": { "type": "none" },
      "Enclosure Link": { "type": "none" }, // Handled by linkColumns
      "Care Log Link": { "type": "none" }   // Handled by linkColumns
  },

  // --- Tab Definitions ---
  "tabs": [
    // --- Tab 1: Master Table View ---
    {
      "id": "all-creatures",
      "title": "All Creatures",
      "type": "table",
      "enabled": true,
      "filter": null,
      "config": {
        "displayColumns": [
          "Creature Name", "Species", "Habitat Zone", "Temperament", "Status",
          "Care Specialist", "Dietary Needs", "Last Health Check", "Magical Property",
          "Endangered Status", "Special Handling Req.",
          "Enclosure Link", "Care Log Link"
        ],
        "columnWidths": {
            "default": "100px",
            "Creature Name": "180px", "Species": "100px", "Habitat Zone": "130px",
            "Temperament": "110px", "Status": "110px", "Care Specialist": "160px",
            "Dietary Needs": "160px", "Magical Property": "140px",
            "Endangered Status": "60px", "Special Handling Req.": "60px",
            "Enclosure Link": "50px", "Care Log Link": "50px"
        },
        "headerOrientations": {
            "default": "vertical",
            "Creature Name": "horizontal", "Care Specialist": "horizontal",
            "Dietary Needs": "horizontal", "Magical Property": "horizontal",
            "Habitat Zone": "horizontal", "Temperament": "horizontal", "Status": "horizontal"
        }
      }
    },

    // --- Tab 2: Kanban by Status ---
    {
      "id": "kanban-status",
      "title": "🩺 Creature Status",
      "type": "kanban",
      "enabled": true,
      "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueIsNot", "filterValue": "Released"}] }, // Exclude released creatures
      "config": {
        "groupByColumn": "Status",
        "cardTitleColumn": "Creature Name",
        "cardIndicatorColumns": [
            "Species",
            "Habitat Zone",
            "Temperament",
            "Care Specialist",
            "Endangered Status" // Icon
        ],
        "cardLinkColumn": "Care Log Link",
        "layout": { "minColumnWidth": "300px", "columnGap": "15px", "itemGap": "10px" }
      }
    },

    // --- Tab 3: Kanban by Habitat Zone ---
    {
      "id": "kanban-habitat",
      "title": "🏞️ Habitats",
      "type": "kanban",
      "enabled": true,
      "filter": null,
      "config": {
        "groupByColumn": "Habitat Zone",
        "cardTitleColumn": "Creature Name",
        "cardIndicatorColumns": [
            "Species",
            "Status",
            "Temperament",
            "Special Handling Req." // Icon
        ],
        "cardLinkColumn": "Enclosure Link",
        "layout": { "minColumnWidth": "320px", "columnGap": "12px", "itemGap": "8px" }
      }
    },

    // --- Tab 4: Summary - High Concern Creatures ---
    {
        "id": "summary-concern",
        "title": "❗ High Concern",
        "type": "summary",
        "enabled": true,
        "filter": {
            "logic": "OR", // Show if *any* condition is met
            "conditions": [
                { "column": "Endangered Status", "filterType": "booleanTrue" },
                { "column": "Special Handling Req.", "filterType": "booleanTrue" },
                { "column": "Status", "filterType": "valueInList", "filterValue": ["Injured", "Quarantine"] }
            ]
        },
        "config": {
            "groupByColumn": "Species", // Group concerned creatures by species
            "cardIndicatorColumns": [
                "Habitat Zone",
                "Status",
                "Temperament",
                "Care Specialist",
                "Endangered Status",    // Include the icons themselves
                "Special Handling Req.",
                "Care Log Link"         // Link for quick access
            ],
            "internalLayout": { "minColumnWidth": "350px", "columnGap": "15px", "itemGap": "10px" },
            "cardLinkColumn": "Care Log Link",
            "sections": [
                 // Section for Endangered
                 { "id": "summary-endangered", "title": "🛡️ Endangered", "filterColumn": "Endangered Status", "filterType": "booleanTrue", "bgColor": "#fef4e5", "textColor": "#885f25" },
                 // Section for Special Handling
                 { "id": "summary-handling", "title": "⚠️ Special Handling", "filterColumn": "Special Handling Req.", "filterType": "booleanTrue", "bgColor": "#fff3cd", "textColor": "#664d03" },
                 // Section for Injured/Quarantine
                 { "id": "summary-attention", "title": "🩹🔬 Needs Attention (Injured/Quarantine)", "filterColumn": "Status", "filterType": "valueInList", "filterValue": ["Injured", "Quarantine"], "bgColor": "#f8d7da", "textColor": "#58151c" },
                 // Catch-all (should be empty if OR filter covers all section types)
                 { "id": "summary-other-concern", "title": "Other (Passed Tab Filter)", "filterColumn": null, "filterType": "catchAll", "bgColor": "#f8f9fa", "textColor": "#6c757d" }
            ]
        }
    },

     // --- Tab 5: Counts - Temperament by Species ---
    {
        "id": "counts-temperament",
        "title": "😊 Temperament Counts",
        "type": "counts",
        "enabled": true,
        "filter": null, // Count all non-released creatures? Maybe filter out "Released"?
        "config": {
            // groupByColumn: What each small box represents (the Species)
            "groupByColumn": "Species",

            // counters: Define each Temperament we want to count
            "counters": [
                { "title": "Docile Creatures", "column": "Temperament", "filterType": "valueEquals", "filterValue": "Docile", "display": { "type": "text", "value": "😊" } },
                { "title": "Skittish Creatures", "column": "Temperament", "filterType": "valueEquals", "filterValue": "Skittish", "display": { "type": "text", "value": "😨" } },
                { "title": "Playful Creatures", "column": "Temperament", "filterType": "valueEquals", "filterValue": "Playful", "display": { "type": "text", "value": "<0xF0><0x9F><0xA7><0xBD>" } },
                { "title": "Territorial Creatures", "column": "Temperament", "filterType": "valueEquals", "filterValue": "Territorial", "display": { "type": "text", "value": "😠" } },
                { "title": "Aggressive Creatures", "column": "Temperament", "filterType": "valueEquals", "filterValue": "Aggressive", "display": { "type": "text", "value": "<0xF0><0x9F><0xAB><0x82>" } }
            ]
        }
    }
  ]
};
// --- END OF FILE config.js ---