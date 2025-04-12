// --- START OF FILE config.js ---

let defaultConfig = {
  "configVersion": 6.0, // Version for A-Level Physics
  "csvHeaders": [], // Auto-populated

  "generalSettings": {
    "dashboardTitle": "AQA A-Level Physics (7408) Revision Tracker",
    "csvUrl": null, // Load Role_Responsibilities.csv via upload
    "trueValues": [ "true", "TRUE", "yes", "y", "1", "✓", "x", "on" ],
    "csvDelimiter": ",",
    "multiValueColumns": [ "Key Concepts/Formulae", "Maths Skill Link", "Exam Paper Ref" ],
    "linkColumns": [ "YouTube Link (Verify!)" ]
  },

  "indicatorStyles": {
      // --- Icons ---
       "Is Synoptic": {
          "type": "icon",
          "trueCondition": { "value": "🔗", "cssClass": "cdg-indicator-synoptic", "title": "Synoptic Topic (Links to others)"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false
      },

      // --- Tags ---
      "Type": {
        "type": "tag", "titlePrefix": "Type: ",
        "valueMap": {
          "Core Content":       { "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green
          "Option Topic":       { "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Required Practical": { "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Maths Skill":        { "bgColor": "#fef4e5", "textColor": "#885f25" }, // Orange/Brown
          "default":            { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Status": {
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": {
          "Not Started":    { "text":"⚪ Not Started",   "bgColor": "#f8f9fa", "textColor": "#6c757d" },
          "Learning":       { "text":"📝 Learning",      "bgColor": "#cfe2ff", "textColor": "#0a367a" },
          "Revising":       { "text":"🤔 Revising",      "bgColor": "#fff0e6", "textColor": "#8a4c2a" }, // Light orange
          "Needs Practice": { "text":"❓ Needs Practice","bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Confident":      { "text":"✅ Confident",     "bgColor": "#d4edda", "textColor": "#155724" }, // Green
          "default":        { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Priority": {
        "type": "tag", "titlePrefix": "Prio: ",
        "valueMap": {
          "High":     { "text":"🔥 High",   "bgColor": "#f8d7da", "textColor": "#58151c" },
          "Medium":   { "text":"🟠 Medium", "bgColor": "#fff3cd", "textColor": "#664d03" },
          "Low":      { "text":"🔵 Low",    "bgColor": "#d1ecf1", "textColor": "#0c5460" },
          "default":  { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
       "Confidence (1-5)": {
          "type": "tag", "titlePrefix": "Confidence: ",
          "valueMap": {
              "1": { "text": "⭐☆☆☆☆ (1)", "bgColor": "#dc3545", "textColor": "#ffffff" },
              "2": { "text": "⭐⭐☆☆☆ (2)", "bgColor": "#fd7e14", "textColor": "#ffffff" },
              "3": { "text": "⭐⭐⭐☆☆ (3)", "bgColor": "#ffc107", "textColor": "#343a40" },
              "4": { "text": "⭐⭐⭐⭐☆ (4)", "bgColor": "#90ee90", "textColor": "#006400" }, // Light Green
              "5": { "text": "⭐⭐⭐⭐⭐ (5)", "bgColor": "#28a745", "textColor": "#ffffff" },
              "default": { "text": "➖ (N/A)", "bgColor": "#f8f9fa", "textColor": "#6c757d" }
          }
      },
      "Unit": {
        "type": "tag", "titlePrefix": "Unit: ",
        "styleRules": [ // Use rules for partial matching
            { "matchType": "regex", "pattern": "^3\\.1", "style": { "bgColor": "#cfe2ff", "textColor": "#0a367a"} }, // Blue
            { "matchType": "regex", "pattern": "^3\\.2", "style": { "bgColor": "#f8d7da", "textColor": "#58151c"} }, // Red
            { "matchType": "regex", "pattern": "^3\\.3", "style": { "bgColor": "#e2f0d9", "textColor": "#537d3b"} }, // Green
            { "matchType": "regex", "pattern": "^3\\.4", "style": { "bgColor": "#fff3cd", "textColor": "#664d03"} }, // Yellow
            { "matchType": "regex", "pattern": "^3\\.5", "style": { "bgColor": "#fef4e5", "textColor": "#885f25"} }, // Orange
            { "matchType": "regex", "pattern": "^3\\.6", "style": { "bgColor": "#e9d8fd", "textColor": "#5e3a8c"} }, // Purple
            { "matchType": "regex", "pattern": "^3\\.7", "style": { "bgColor": "#d1ecf1", "textColor": "#0c5460"} }, // Cyan
            { "matchType": "regex", "pattern": "^3\\.8", "style": { "bgColor": "#fce8f3", "textColor": "#8f2c5f"} }, // Pink
            { "matchType": "regex", "pattern": "^3\\.9", "style": { "bgColor": "#adb5bd", "textColor": "#ffffff"} }, // Grey (Astrophysics)
            { "matchType": "regex", "pattern": "^3\\.10", "style": { "bgColor": "#adb5bd", "textColor": "#ffffff"} }, // Grey (Medical)
            { "matchType": "regex", "pattern": "^3\\.11", "style": { "bgColor": "#adb5bd", "textColor": "#ffffff"} }, // Grey (Engineering)
            { "matchType": "regex", "pattern": "^3\\.12", "style": { "bgColor": "#adb5bd", "textColor": "#ffffff"} }, // Grey (Turning Points)
            { "matchType": "regex", "pattern": "Appendix A", "style": { "bgColor": "#fff3cd", "textColor": "#664d03"} }, // Yellow (Practicals)
            { "matchType": "regex", "pattern": "Appendix B", "style": { "bgColor": "#fef4e5", "textColor": "#885f25"} }  // Orange (Maths)
         ],
        "defaultStyle": { "bgColor": "#e9ecef", "textColor": "#495057" }
      },
      "Exam Paper Ref": {
        "type": "tag", "titlePrefix": "Exam: ",
        "layout": "stacked",
        "valueMap": {
            "Paper 1":      { "bgColor": "#ddebf7", "textColor": "#2a5d8a" },
            "Paper 2":      { "bgColor": "#e2f0d9", "textColor": "#537d3b" },
            "Paper 3A":     { "bgColor": "#fef4e5", "textColor": "#885f25" },
            "Paper 3B":     { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" },
            "default":      { "bgColor": "#e9ecef", "textColor": "#495057" }
         }
      },
       "Key Concepts/Formulae": {
        "type": "tag", "titlePrefix": "Key: ",
        "layout": "stacked",
        "valueMap": { "default": { "bgColor": "#d1ecf1", "textColor": "#0c5460" } }
      },
       "Required Practical Link": {
          "type": "tag", "titlePrefix": "PAG: ",
          "valueMap": { "default": { "bgColor": "#fff3cd", "textColor": "#664d03" } }
      },
      "Maths Skill Link": {
          "type": "tag", "titlePrefix": "MS: ",
           "layout": "stacked",
          "valueMap": { "default": { "bgColor": "#fef4e5", "textColor": "#885f25" } }
      },

      // --- Columns to display as plain text or handled by linkColumns ---
      "ID": { "type": "none" },
      "Topic": { "type": "none" },
      "Section": { "type": "none" },
      "Notes": { "type": "none" },
      "YouTube Link (Verify!)": { "type": "none" } // Handled by linkColumns
  },

  // --- Tab Definitions ---
  "tabs": [
    // --- Tab 1: Full Syllabus Table ---
    {
      "id": "full-syllabus",
      "title": "📚 Full Syllabus",
      "type": "table",
      "enabled": true,
      "filter": null,
      "config": {
        "displayColumns": [
           "Unit", "Section", "Topic", "Type", "Status", "Confidence (1-5)", "Priority", "Exam Paper Ref", "Is Synoptic", "YouTube Link (Verify!)", "Notes"
        ],
        "columnWidths": {
            "default": "100px",
            "Unit": "200px", "Section": "250px", "Topic": "300px", "Type": "100px",
            "Status": "110px", "Confidence (1-5)": "100px", "Priority": "80px",
             "Exam Paper Ref": "120px", "Is Synoptic": "50px", "YouTube Link (Verify!)": "50px", "Notes": "250px"
        },
        "headerOrientations": {
            "default": "vertical",
            "Unit": "horizontal", "Section": "horizontal", "Topic": "horizontal", "Notes": "horizontal"
        }
      }
    },

    // --- Tab 2: Revision Status Kanban ---
    {
      "id": "kanban-status",
      "title": "📊 Revision Status",
      "type": "kanban",
      "enabled": true,
       "filter": { "logic": "AND", "conditions": [{"column": "Type", "filterType": "valueEquals", "filterValue": "Core Content"}] }, // Optional: Focus Kanban on core content initially
      "config": {
        "groupByColumn": "Status",
        "cardTitleColumn": "Topic",
        "cardIndicatorColumns": [ "Unit", "Priority", "Confidence (1-5)", "Is Synoptic", "YouTube Link (Verify!)" ],
        "cardLinkColumn": "YouTube Link (Verify!)",
        "layout": { "minColumnWidth": "300px", "columnGap": "15px", "itemGap": "10px" }
      }
    },

    // --- Tab 3: By Unit Kanban ---
    {
      "id": "kanban-unit",
      "title": "By Unit", // Hindi text for demonstration - ensure UTF-8 saving
      "type": "kanban",
      "enabled": true,
      "filter": { "logic": "AND", "conditions": [{"column": "Type", "filterType": "valueEquals", "filterValue": "Core Content"}] }, // Focus on core
      "config": {
        "groupByColumn": "Unit",
        "cardTitleColumn": "Topic",
        "cardIndicatorColumns": [ "Section", "Status", "Priority", "Confidence (1-5)", "Is Synoptic" ],
        "cardLinkColumn": "YouTube Link (Verify!)",
        "layout": { "minColumnWidth": "360px", "columnGap": "12px", "itemGap": "8px" }
      }
    },

    // --- Tab 4: Practicals & Maths Focus ---
    {
        "id": "practicals-maths",
        "title": "🧪🔬 Skills Focus",
        "type": "table",
        "enabled": true,
        "bgColor": "#fefbe5", // Light yellow background for tab
        "filter": {
            "logic": "OR",
            "conditions": [
                { "column": "Type", "filterType": "valueEquals", "filterValue": "Required Practical" },
                { "column": "Type", "filterType": "valueEquals", "filterValue": "Maths Skill" }
            ]
        },
        "config": {
          "displayColumns": [ "ID", "Topic", "Type", "Status", "Confidence (1-5)", "Exam Paper Ref", "YouTube Link (Verify!)", "Notes" ],
          "columnWidths": { "ID": "70px", "Topic": "350px", "Type": "120px", "Status":"110px", "Confidence (1-5)":"100px", "Notes":"300px" },
          "headerOrientations": { "default": "horizontal" }
        }
    },

     // --- Tab 5: Confidence Counts ---
    {
        "id": "confidence-counts",
        "title": "⭐ Confidence Counts",
        "type": "counts",
        "enabled": true,
        "filter": { "logic": "AND", "conditions": [{"column": "Type", "filterType": "valueEquals", "filterValue": "Core Content"}] }, // Counts for core content
        "config": {
            "groupByColumn": "Unit", // See confidence breakdown per unit
            "counters": [
                { "title": "⭐☆☆☆☆ (1)", "column": "Confidence (1-5)", "filterType": "valueEquals", "filterValue": "1" },
                { "title": "⭐⭐☆☆☆ (2)", "column": "Confidence (1-5)", "filterType": "valueEquals", "filterValue": "2" },
                { "title": "⭐⭐⭐☆☆ (3)", "column": "Confidence (1-5)", "filterType": "valueEquals", "filterValue": "3" },
                { "title": "⭐⭐⭐⭐☆ (4)", "column": "Confidence (1-5)", "filterType": "valueEquals", "filterValue": "4" },
                { "title": "⭐⭐⭐⭐⭐ (5)", "column": "Confidence (1-5)", "filterType": "valueEquals", "filterValue": "5" }
                // Add display styling if desired
            ]
        }
    },

    // --- Tab 6: Synoptic Links View ---
    {
      "id": "synoptic-links",
      "title": "🔗 Synoptic Links",
      "type": "table",
      "enabled": true,
      "filter": { "logic": "AND", "conditions": [{"column": "Is Synoptic", "filterType": "booleanTrue"}] },
      "config": {
        "displayColumns": [ "Topic", "Unit", "Section", "Key Concepts/Formulae", "Status" ],
        "columnWidths": { "Topic": "250px", "Unit": "180px", "Section": "200px", "Key Concepts/Formulae": "300px", "Status":"110px"},
        "headerOrientations": { "default": "horizontal" }
      }
    }


  ]
};
// --- END OF FILE config.js ---