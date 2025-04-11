// --- START OF FILE config.js ---

let defaultConfig = {
  "configVersion": 4.0, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load

  "generalSettings": {
    "dashboardTitle": "Interstellar Exploration Mission Planner",
    "csvUrl": null, // Set to a URL or leave null for upload
    "trueValues": [ "true", "TRUE", "yes", "y", "1", "✓", "x", "on" ],
    "csvDelimiter": ",",
    "multiValueColumns": ["Lead Scientist/Org", "Key Objectives", "Resource Needs"], // Columns with comma-separated values
    "linkColumns": [ "Mission Log URL", "Telemetry URL" ] // Columns containing URLs
  },

  // Global styles for indicators (tags/icons) used across tabs
  "indicatorStyles": {
      // --- Boolean Icon Indicators ---
      "Significant Finding":   {
          "type": "icon",
          "trueCondition": { "value": "✨", "cssClass": "cdg-indicator-finding", "title": "Significant Finding Recorded"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false
      },
      "Anomaly Detected":   {
          "type": "icon",
          "trueCondition": { "value": "❗", "cssClass": "cdg-indicator-anomaly", "title": "Anomaly Detected!"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false
      },

      // --- Tag Indicators ---
      "Mission Type": {
        "type": "tag", "titlePrefix": "Type: ",
        "valueMap": {
          "Flyby":          { "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Orbiter":        { "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Lander":         { "bgColor": "#f8d7da", "textColor": "#58151c" }, // Red
          "Rover":          { "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Sample Return":  { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" }, // Purple
          "Probe":          { "bgColor": "#fef4e5", "textColor": "#885f25" }, // Orange
          "default":        { "bgColor": "#e9ecef", "textColor": "#495057" }  // Grey
        }
      },
      "Status": {
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": {
          "Planning":       { "text":"📝 Planning",     "bgColor": "#f8f9fa", "textColor": "#6c757d" }, // Light Grey
          "En Route":       { "text":"🚀 En Route",     "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Orbiting":       { "text":"🛰️ Orbiting",     "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Landing":        { "text":"🌠 Landing",      "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Surface Ops":    { "text":"🚜 Surface Ops",  "bgColor": "#fef4e5", "textColor": "#885f25" }, // Orange
          "Data Analysis":  { "text":"🔬 Data Analysis","bgColor": "#e2f0d9", "textColor": "#537d3b" }, // Light Green
          "Complete":       { "text":"✅ Complete",     "bgColor": "#d4edda", "textColor": "#155724" }, // Success Green
          "Anomaly":        { "text":"❓ Anomaly",      "bgColor": "#f8d7da", "textColor": "#58151c" }, // Red
          "default":        { "bgColor": "#e9ecef", "textColor": "#495057" }  // Grey
        }
      },
      "Priority": {
        "type": "tag", "titlePrefix": "Prio: ",
        "valueMap": {
          "Critical":   { "text":"🔥 Critical", "bgColor": "#dc3545", "textColor": "#ffffff" }, // Red
          "High":       { "text":"🟠 High",     "bgColor": "#fd7e14", "textColor": "#ffffff" }, // Orange
          "Medium":     { "text":"🟡 Medium",   "bgColor": "#ffc107", "textColor": "#343a40" }, // Yellow
          "Low":        { "text":"🔵 Low",      "bgColor": "#0d6efd", "textColor": "#ffffff" }, // Blue
          "default":    { "bgColor": "#adb5bd", "textColor": "#ffffff" }  // Grey
        }
      },
      "Lead Scientist/Org": {
        "type": "tag", "titlePrefix": "Lead: ",
        "layout": "stacked", // Enable stacking
        "valueMap": {
          // Add a few specific examples if desired, otherwise rely on default
          "Stellar Cartography Dept": { "bgColor": "#ddebf7", "textColor": "#2a5d8a" },
          "Xenobiology Lab":          { "bgColor": "#e2f0d9", "textColor": "#537d3b" },
          "Dr. Aris Thorne":          { "bgColor": "#fff0e6", "textColor": "#8a4c2a" },
          "default":                  { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
       "Launch Date": {
          "type": "tag", "titlePrefix": "Launched: ",
          "valueMap": { "default": { "bgColor": "#f8f9fa", "textColor": "#6c757d" } } // Neutral grey
      },
      "ETA": {
          "type": "tag", "titlePrefix": "ETA: ",
          "valueMap": {
              "TBD":     { "text": "📅 TBD", "bgColor": "#adb5bd", "textColor": "#ffffff"}, // Special style for TBD
              "default": { "bgColor": "#f8f9fa", "textColor": "#6c757d" } // Neutral grey for dates
          }
      },
      "Key Objectives": {
        "type": "tag", "titlePrefix": "Obj: ",
        "layout": "stacked", // Enable stacking
        "valueMap": { "default": { "bgColor": "#d1e7dd", "textColor": "#0f5132" } } // Default objective color
      },
      "Resource Needs": {
        "type": "tag", "titlePrefix": "Needs: ",
        "layout": "stacked", // Enable stacking
        "valueMap": {
            "High Power":   { "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellowish
            "Data Relay":   { "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blueish
            "AI Analysis":  { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" }, // Purplish
            "default":      { "bgColor": "#e9ecef", "textColor": "#495057" }
         }
      },

      // --- Columns to display as plain text or handled by linkColumns ---
      "Target System": { "type": "none" },
      "Mission Name": { "type": "none" },
      "Estimated Cost (Millions)": { "type": "none" },
      "Mission Log URL": { "type": "none" }, // Handled by linkColumns
      "Telemetry URL": { "type": "none" }   // Handled by linkColumns
  },

  // --- Tab Definitions ---
  "tabs": [
    // --- Tab 1: Master Table View ---
    {
      "id": "all-missions",
      "title": "All Missions",
      "type": "table",
      "enabled": true,
      "filter": null,
      "config": {
        "displayColumns": [
          "Mission Name", "Target System", "Mission Type", "Status", "Priority",
          "Lead Scientist/Org", "Launch Date", "ETA", "Key Objectives",
          "Significant Finding", "Anomaly Detected", "Resource Needs",
          "Estimated Cost (Millions)", "Mission Log URL", "Telemetry URL"
        ],
        "columnWidths": {
            "default": "100px",
            "Mission Name": "220px", "Target System": "150px", "Mission Type": "120px",
            "Status": "120px", "Priority": "90px", "Lead Scientist/Org": "160px",
            "Key Objectives": "250px", "Resource Needs": "150px",
            "Significant Finding": "50px", "Anomaly Detected": "50px",
            "Estimated Cost (Millions)": "70px",
            "Mission Log URL": "50px", "Telemetry URL": "50px"
        },
        "headerOrientations": {
            "default": "vertical",
            "Mission Name": "horizontal", "Target System": "horizontal",
            "Lead Scientist/Org": "horizontal", "Key Objectives": "horizontal",
            "Resource Needs": "horizontal", "Status": "horizontal" // Keep status horizontal for readability
        }
      }
    },

    // --- Tab 2: Kanban by Status ---
    {
      "id": "kanban-status",
      "title": "🚀 Mission Status",
      "type": "kanban",
      "enabled": true,
      // Optional filter: exclude completed missions
      "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueIsNot", "filterValue": "Complete"}] },
      "config": {
        "groupByColumn": "Status",
        "cardTitleColumn": "Mission Name",
        "cardIndicatorColumns": [
            "Target System", // Show where it's going
            "Priority",      // How important?
            "Lead Scientist/Org", // Who is responsible?
            "ETA",           // When expected?
            "Anomaly Detected" // Show if issues flagged
        ],
        "cardLinkColumn": "Mission Log URL", // Link card title to mission log
        "layout": { "minColumnWidth": "320px", "columnGap": "15px", "itemGap": "10px" }
      }
    },

    // --- Tab 3: Kanban by Mission Type ---
    {
      "id": "kanban-type",
      "title": "🛰️ Mission Types",
      "type": "kanban",
      "enabled": true,
      "filter": null,
      "config": {
        "groupByColumn": "Mission Type",
        "cardTitleColumn": "Mission Name",
        "cardIndicatorColumns": [
            "Target System",
            "Status",
            "Priority",
            "Launch Date",
            "Significant Finding" // Show if findings recorded
        ],
        "cardLinkColumn": "Mission Log URL",
        "layout": { "minColumnWidth": "340px", "columnGap": "12px", "itemGap": "8px" }
      }
    },

    // --- Tab 4: Summary - High Interest Missions ---
    {
        "id": "summary-interest",
        "title": "❗ High Interest",
        "type": "summary",
        "enabled": true,
        "filter": {
            "logic": "OR", // Show if *either* condition is met
            "conditions": [
                { "column": "Significant Finding", "filterType": "booleanTrue" },
                { "column": "Anomaly Detected", "filterType": "booleanTrue" }
            ]
        },
        "config": {
            "groupByColumn": "Target System", // Group findings/anomalies by location
            "cardIndicatorColumns": [
                "Status",
                "Priority",
                "Lead Scientist/Org",
                "Significant Finding", // Include the icons themselves
                "Anomaly Detected",
                "Mission Log URL"     // Link for quick access
            ],
            "internalLayout": { "minColumnWidth": "380px", "columnGap": "15px", "itemGap": "10px" },
            "cardLinkColumn": "Mission Log URL",
            "sections": [
                 // Section for Significant Findings
                 { "id": "summary-findings", "title": "✨ Major Discoveries", "filterColumn": "Significant Finding", "filterType": "booleanTrue", "bgColor": "#e2f0d9", "textColor": "#537d3b" },
                 // Section for Anomalies
                 { "id": "summary-anomalies", "title": "❗ Anomalies Detected", "filterColumn": "Anomaly Detected", "filterType": "booleanTrue", "bgColor": "#f8d7da", "textColor": "#58151c" },
                 // Catch-all (might be empty if filter is strict OR)
                 { "id": "summary-other-interest", "title": "Other (Passed Tab Filter)", "filterColumn": null, "filterType": "catchAll", "bgColor": "#f8f9fa", "textColor": "#6c757d" }
            ]
        }
    },

     // --- Tab 5: Counts - Resource Needs by Status ---
    {
        "id": "counts-resources",
        "title": "📊 Resource Needs by Status",
        "type": "counts",
        "enabled": true,
        // Optional: Filter to only count non-complete missions
        "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueIsNot", "filterValue": "Complete"}] },
        "config": {
            // groupByColumn: What each small box represents (the status of the mission needing the resource)
            "groupByColumn": "Status",

            // counters: Define each resource need we want to count
            "counters": [
                {
                    "title": "High Power Required",
                    "column": "Resource Needs",      // Check this column
                    "filterType": "contains",       // Check if multi-value contains...
                    "filterValue": "High Power",    // ...this value
                    "display": { "type": "icon", "value": "🔋" } // Optional display icon
                },
                {
                    "title": "Data Relay Required",
                    "column": "Resource Needs",
                    "filterType": "contains",
                    "filterValue": "Data Relay",
                    "display": { "type": "icon", "value": "📡" }
                },
                {
                    "title": "AI Analysis Required",
                    "column": "Resource Needs",
                    "filterType": "contains",
                    "filterValue": "AI Analysis",
                    "display": { "type": "icon", "value": "🧠" }
                }
                // Add more counters for other resource needs if necessary
            ]
        }
    }
  ]
};
// --- END OF FILE config.js ---