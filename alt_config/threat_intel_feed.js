// --- START OF FILE config.js ---

let defaultConfig = {
  "configVersion": 4.2, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load

  "generalSettings": {
    "dashboardTitle": "Global Cyber Threat Intelligence Feed",
    "csvUrl": null, // Set to a URL or leave null for upload
    "trueValues": [ "true", "TRUE", "yes", "y", "1", "✓", "x", "on" ],
    "csvDelimiter": ",",
    "multiValueColumns": ["Targeted Sector(s)", "Associated Malware/Tool"], // Columns with comma-separated values
    "linkColumns": [ "Report Link", "IOC Link" ] // Columns containing URLs
  },

  // Global styles for indicators (tags/icons) used across tabs
  "indicatorStyles": {
      // --- Boolean Icon Indicators ---
      "Actively Exploited": {
          "type": "icon",
          "trueCondition": { "value": "🔥", "cssClass": "cdg-indicator-exploited", "title": "Actively Exploited!"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false
      },
      // Optional: Mitigation Available as icon if preferred over tag
      // "Mitigation Available Icon": {
      //     "type": "icon",
      //     "valueMap": {
      //       "TRUE":     { "value": "✅", "cssClass": "cdg-indicator-mitigated", "title": "Mitigation Available"},
      //       "Partial":  { "value": "⚠️", "cssClass": "cdg-indicator-partial", "title": "Partial Mitigation/Workaround"},
      //       "FALSE":    { "value": "❌", "cssClass": "cdg-indicator-none", "title": "No Mitigation Currently Available"},
      //       "default":  { "value": "" } // Hide others/empty
      //     }
      // },


      // --- Tag Indicators ---
      "Threat Type": {
        "type": "tag", "titlePrefix": "Type: ",
        "valueMap": {
          "Ransomware":         { "bgColor": "#dc3545", "textColor": "#ffffff" }, // Red
          "Phishing":           { "bgColor": "#fd7e14", "textColor": "#ffffff" }, // Orange
          "DDoS":               { "bgColor": "#ffc107", "textColor": "#343a40" }, // Yellow
          "APT":                { "bgColor": "#6f1d1b", "textColor": "#ffffff" }, // Dark Red
          "Vulnerability Exploit":{ "bgColor": "#0d6efd", "textColor": "#ffffff" }, // Blue
          "Malware":            { "bgColor": "#6c757d", "textColor": "#ffffff" }, // Grey
          "Info Stealer":       { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" }, // Purple
          "default":            { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Status": {
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": {
          "Active Exploit": { "text":"🔥 Active Exploit", "bgColor": "#f8d7da", "textColor": "#58151c" }, // Red
          "Potential Threat":{ "text":"⚠️ Potential",     "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Patched":        { "text":"🩹 Patched",       "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Mitigated":      { "text":"🛡️ Mitigated",     "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Monitored":      { "text":"👀 Monitored",     "bgColor": "#e2f0d9", "textColor": "#537d3b" }, // Light Green
          "False Positive": { "text":"❌ False Positive","bgColor": "#f8f9fa", "textColor": "#6c757d" }, // Light Grey
          "default":        { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
       "Severity": {
        "type": "tag", "titlePrefix": "Severity: ",
        "valueMap": {
          // Using text instead of icons here for clarity in tables/cards
          "Critical":     { "text":"🔴 Critical",     "bgColor": "#dc3545", "textColor": "#ffffff" },
          "High":         { "text":"🟠 High",         "bgColor": "#fd7e14", "textColor": "#ffffff" },
          "Medium":       { "text":"🟡 Medium",       "bgColor": "#ffc107", "textColor": "#343a40" },
          "Low":          { "text":"🔵 Low",          "bgColor": "#0d6efd", "textColor": "#ffffff" },
          "Informational":{ "text":"⚪ Informational","bgColor": "#f8f9fa", "textColor": "#6c757d" },
          "default":      { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Targeted Sector(s)": {
        "type": "tag", "titlePrefix": "Sector: ",
        "layout": "stacked", // Enable stacking
        "valueMap": {
          "Finance":    { "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Healthcare": { "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Energy":     { "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Government": { "bgColor": "#adb5bd", "textColor": "#ffffff" }, // Grey
          "Retail":     { "bgColor": "#fce8f3", "textColor": "#8f2c5f" }, // Pink
          "Technology": { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" }, // Purple
          "Multiple":   { "bgColor": "#f8d7da", "textColor": "#58151c" }, // Reddish for broad impact
          "default":    { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
       "Associated Malware/Tool": {
        "type": "tag", "titlePrefix": "Tool: ",
        "layout": "stacked", // Enable stacking
        "valueMap": {
            "LockBit":       { "bgColor": "#6f1d1b", "textColor": "#ffffff" },
            "QakBot":        { "bgColor": "#fd7e14", "textColor": "#ffffff" },
            "Cobalt Strike": { "bgColor": "#0d6efd", "textColor": "#ffffff" },
            "Mimikatz":      { "bgColor": "#6c757d", "textColor": "#ffffff" },
            "default":       { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Detection Date": {
          "type": "tag", "titlePrefix": "Detected: ",
          "valueMap": { "default": { "bgColor": "#f8f9fa", "textColor": "#6c757d" } }
      },
      "Analyst Assigned": {
          "type": "tag", "titlePrefix": "Analyst: ",
           "valueMap": { "default": { "bgColor": "#e2f0d9", "textColor": "#537d3b" } }
      },
       "Mitigation Available": {
          "type": "tag", "titlePrefix": "Mitigation: ",
           "valueMap": {
                "TRUE":     { "text":"✅ Yes",     "bgColor": "#d1e7dd", "textColor": "#0f5132" },
                "Partial":  { "text":"⚠️ Partial", "bgColor": "#fff3cd", "textColor": "#664d03" },
                "FALSE":    { "text":"❌ No",      "bgColor": "#f8d7da", "textColor": "#58151c" },
                "default":  { "text":"➖ N/A",   "bgColor": "#e9ecef", "textColor": "#495057" }
           }
      },

      // --- Columns to display as plain text or handled by linkColumns ---
      "Threat ID / CVE": { "type": "none" },
      "Report Link": { "type": "none" }, // Handled by linkColumns
      "IOC Link": { "type": "none" }   // Handled by linkColumns
  },

  // --- Tab Definitions ---
  "tabs": [
    // --- Tab 1: Master Table View ---
    {
      "id": "all-threats",
      "title": "All Threats",
      "type": "table",
      "enabled": true,
      "filter": null,
      "config": {
        "displayColumns": [
          "Threat ID / CVE", "Threat Type", "Status", "Severity", "Targeted Sector(s)",
          "Associated Malware/Tool", "Detection Date", "Analyst Assigned",
          "Mitigation Available", "Actively Exploited",
          "Report Link", "IOC Link"
        ],
        "columnWidths": {
            "default": "100px",
            "Threat ID / CVE": "180px", "Threat Type": "140px", "Status": "120px",
            "Severity": "100px", "Targeted Sector(s)": "180px",
            "Associated Malware/Tool": "180px", "Detection Date": "100px",
            "Analyst Assigned": "120px", "Mitigation Available": "90px",
            "Actively Exploited": "60px", "Report Link": "50px", "IOC Link": "50px"
        },
        "headerOrientations": {
            "default": "vertical",
            "Threat ID / CVE": "horizontal", "Threat Type": "horizontal",
            "Targeted Sector(s)": "horizontal", "Associated Malware/Tool": "horizontal",
             "Status": "horizontal", "Severity": "horizontal", "Mitigation Available": "horizontal"
        }
      }
    },

    // --- Tab 2: Kanban by Status ---
    {
      "id": "kanban-status",
      "title": "🚦 Threat Status",
      "type": "kanban",
      "enabled": true,
       // Optional filter: Only show relevant statuses
       "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueNotInList", "filterValue": ["False Positive", "Mitigated", "Patched"] }] },
      "config": {
        "groupByColumn": "Status",
        "cardTitleColumn": "Threat ID / CVE",
        "cardIndicatorColumns": [
            "Threat Type",
            "Severity",
            "Targeted Sector(s)",
            "Analyst Assigned",
            "Actively Exploited" // Icon
        ],
        "cardLinkColumn": "Report Link",
        "layout": { "minColumnWidth": "320px", "columnGap": "15px", "itemGap": "10px" }
      }
    },

    // --- Tab 3: Kanban by Severity ---
    {
      "id": "kanban-severity",
      "title": "❗ Severity Levels",
      "type": "kanban",
      "enabled": true,
      "filter": null,
      "config": {
        "groupByColumn": "Severity",
        "cardTitleColumn": "Threat ID / CVE",
        "cardIndicatorColumns": [
            "Threat Type",
            "Status",
            "Targeted Sector(s)",
            "Mitigation Available" // Tag
        ],
        "cardLinkColumn": "Report Link",
        "layout": { "minColumnWidth": "300px", "columnGap": "12px", "itemGap": "8px" }
      }
    },

    // --- Tab 4: Summary - Highest Risk Threats ---
    {
        "id": "summary-risk",
        "title": "🔥 Highest Risk",
        "type": "summary",
        "enabled": true,
        "filter": {
            "logic": "OR", // Show if *either* condition is met
            "conditions": [
                { "column": "Actively Exploited", "filterType": "booleanTrue" },
                { "column": "Severity", "filterType": "valueEquals", "filterValue": "Critical" }
            ]
        },
        "config": {
            "groupByColumn": "Threat Type", // Group high risk items by type
            "cardIndicatorColumns": [
                "Status",
                "Severity", // Include the tag for clarity
                "Targeted Sector(s)",
                "Mitigation Available",
                "Actively Exploited", // Include the icon
                "Report Link"         // Link for quick access
            ],
            "internalLayout": { "minColumnWidth": "380px", "columnGap": "15px", "itemGap": "10px" },
            "cardLinkColumn": "Report Link",
            "sections": [
                 // Section for Actively Exploited
                 { "id": "summary-exploited", "title": "🔥 Actively Exploited", "filterColumn": "Actively Exploited", "filterType": "booleanTrue", "bgColor": "#f8d7da", "textColor": "#58151c" },
                 // Section for Critical Threats (that weren't already caught above)
                 { "id": "summary-critical", "title": "🔴 Critical Severity", "filterColumn": "Severity", "filterType": "valueEquals", "filterValue": "Critical", "bgColor": "#dc354533", "textColor": "#6f1d1b" }, // Transparent red bg
                 // Catch-all (should be empty if OR filter covers sections)
                 { "id": "summary-other-risk", "title": "Other (Passed Tab Filter)", "filterColumn": null, "filterType": "catchAll", "bgColor": "#f8f9fa", "textColor": "#6c757d" }
            ]
        }
    },

     // --- Tab 5: Counts - Threat Types by Targeted Sector ---
    {
        "id": "counts-types-by-sector",
        "title": "📊 Threat Types by Sector",
        "type": "counts",
        "enabled": true,
        "filter": null, // Count all threats initially
        "config": {
            // groupByColumn: What each small box represents (the Targeted Sector)
            "groupByColumn": "Targeted Sector(s)",

            // counters: Define each Threat Type we want to count
            "counters": [
                { "title": "Ransomware", "column": "Threat Type", "filterType": "valueEquals", "filterValue": "Ransomware" },
                { "title": "Phishing", "column": "Threat Type", "filterType": "valueEquals", "filterValue": "Phishing" },
                { "title": "DDoS", "column": "Threat Type", "filterType": "valueEquals", "filterValue": "DDoS" },
                { "title": "APT", "column": "Threat Type", "filterType": "valueEquals", "filterValue": "APT" },
                { "title": "Vulnerability Exploit", "column": "Threat Type", "filterType": "valueEquals", "filterValue": "Vulnerability Exploit" },
                { "title": "Malware", "column": "Threat Type", "filterType": "valueEquals", "filterValue": "Malware" },
                { "title": "Info Stealer", "column": "Threat Type", "filterType": "valueEquals", "filterValue": "Info Stealer" }
                // Add display icons if desired for counter titles
            ]
        }
    }
  ]
};
// --- END OF FILE config.js ---