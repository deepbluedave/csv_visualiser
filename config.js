// alt_config/director_tracker_viewer_config.js
let defaultConfig = {
  "configVersion": 1.0,
  "csvHeaders": [],

  "generalSettings": {
    "dashboardTitle": "Director's Work Tracker",
    "csvUrl": "./sample_data/director_work_tracker.csv",
    "trueValues": ["TRUE", "true"],
    "csvDelimiter": ",",
    "multiValueColumns": ["AssignedTo", "Stakeholders", "ParentItemID", "Owner"],
    "linkColumns": ["InfoLink"],
    "defaultCardIndicatorColumns": ["Pillar", "WorkItemType", "Status", "Owner", "DueDate"],
    "defaultItemSortBy": [
      { "column": "WorkItemID", "direction": "asc" },
      { "column": "Pillar", "direction": "asc" },
      { "column": "Priority", "direction": "custom", "order": ["Critical", "High", "Medium", "Low"] },
      { "column": "DueDate", "direction": "asc" },
            { "column": "ParentItemID", "direction": "asc" },


    ]
  },

  "indicatorStyles": {
    "WorkItem": { "type": "none" },
    "Goal": { "type": "none" },
    "LatestUpdate": { "type": "none" },
    "InfoLink": { "type": "none" },

    "Pillar": {
      "type": "tag", "titlePrefix": "Pillar: ",
      "styleRules": [
        { "matchType": "exact", "value": "Security Architecture", "style": { "bgColor": "#cfe2ff", "textColor": "#0a367a" } },
        { "matchType": "exact", "value": "Threat Modelling", "style": { "bgColor": "#f8d7da", "textColor": "#58151c" } },
        { "matchType": "exact", "value": "Security Champions", "style": { "bgColor": "#d1e7dd", "textColor": "#0f5132" } }
      ]
    },
    "WorkItemType": {
      "type": "tag", "titlePrefix": "Type: ",
      "valueMap": {
        "Strategic Initiative": { "bgColor": "#6f42c1", "textColor": "#fff", "text": "🎯 Strategic Initiative" },
        "Project": { "bgColor": "#0d6efd", "textColor": "#fff", "text": "🅿️ Project" },
        "Deliverable": { "bgColor": "#198754", "textColor": "#fff", "text": "📄 Deliverable" },
        "Task": { "bgColor": "#ffc107", "textColor": "#000", "text": "🛠️ Task" },
        "Sub-Task": { "bgColor": "#fd7e14", "textColor": "#fff", "text": "🔩 Sub-Task" },
        "Meeting": { "bgColor": "#adb5bd", "textColor": "#fff", "text": "📅 Meeting" },
        "Review": { "bgColor": "#6c757d", "textColor": "#fff", "text": "👀 Review" },
        "Training": { "bgColor": "#17a2b8", "textColor": "#fff", "text": "🎓 Training" },
        "default": { "bgColor": "#e9ecef", "textColor": "#495057" }
      }
    },
    // Style configuration for the ParentItemID column
    "ParentItemID": {
      "type": "lookup",
      "source": {
        "dataColumn": "ItemID",     // Find rows where 'ItemID' matches our ParentItemID
        "displayColumn": "WorkItem" // Then display the 'WorkItem' name from that found row
      },
      "styleAs": "text", // Display the looked-up name as a tag
      "defaultStyle": { "bgColor": "#f0f0f0", "textColor": "#555", "borderColor": "#ccc" }
    },

    "Status": {
      "type": "tag", "titlePrefix": "Status: ",
      "valueMap": {
        "Backlog": { "text": "📋 Backlog", "bgColor": "#f8f9fa", "textColor": "#6c757d" },
        "Planning": { "text": "🤔 Planning", "bgColor": "#e9d8fd", "textColor": "#5e3a8c" },
        "In Progress": { "text": "⏳ In Progress", "bgColor": "#cfe2ff", "textColor": "#0a367a" },
        "Blocked": { "text": "🚫 Blocked", "bgColor": "#f8d7da", "textColor": "#58151c" },
        "Pending Review": { "text": "👀 Pending Review", "bgColor": "#fff3cd", "textColor": "#664d03" },
        "Completed": { "text": "✅ Completed", "bgColor": "#d1e7dd", "textColor": "#0f5132" },
        "On Hold": { "text": "⏸️ On Hold", "bgColor": "#adb5bd", "textColor": "#fff" },
        "Archived": { "text": "🗄️ Archived", "bgColor": "#dee2e6", "textColor": "#6c757d" }
      }
    },
    "Owner": { "type": "tag", "titlePrefix": "Owner: ", "defaultStyle": { "bgColor": "#fef4e5", "textColor": "#885f25" } },
    "AssignedTo": { "type": "tag", "titlePrefix": "Assigned: ", "layout": "stacked", "defaultStyle": { "bgColor": "#e2f0d9", "textColor": "#537d3b" } },
    "Stakeholders": { "type": "tag", "titlePrefix": "Stakeholder: ", "layout": "stacked", "defaultStyle": { "bgColor": "#fce8f3", "textColor": "#8f2c5f" } },
    "Priority": {
      "type": "icon", "titlePrefix": "Prio: ",
      "valueMap": {
        "Critical": { "value": "🔥", "title": "Critical" },
        "High": { "value": "⬆️", "title": "High" },
        "Medium": { "value": "➡️", "title": "Medium" },
        "Low": { "value": "⬇️", "title": "Low" }
      }
    },
    "DueDate": { "type": "tag", "titlePrefix": "Due: ", "defaultStyle": { "bgColor": "#f8d7da", "textColor": "#58151c", "borderColor": "#f5c2c7" } },
    "CompletionDate": { "type": "tag", "titlePrefix": "Done: ", "defaultStyle": { "bgColor": "#d1e7dd", "textColor": "#0f5132", "borderColor": "#badbcc" } },
    "IsBlocked": { "type": "icon", "trueCondition": { "value": "🚫", "title": "Is Blocked" }, "valueMap": { "FALSE": { "value": "" } } }
  },

  "tabs": [
    {
      "id": "my-dashboard", "title": "⭐ My Dashboard", "type": "summary", "enabled": true, "filter": null,
      "config": {
        "groupByColumn": "Pillar", "cardTitleColumn": "WorkItem", "cardLinkColumn": "InfoLink",
        "sections": [
          { "id": "s-my-owned", "title": "Items I Own", "filterColumn": "Owner", "filterType": "valueEquals", "filterValue": "Director Dave", "bgColor": "#fff3cd" },
          { "id": "s-my-assigned", "title": "Items Assigned to Me", "filterColumn": "AssignedTo", "filterType": "valueEquals", "filterValue": "Director Dave", "bgColor": "#cfe2ff" },
          { "id": "s-blocked", "title": "Blocked Items (All)", "filterColumn": "IsBlocked", "filterType": "booleanTrue", "bgColor": "#f8d7da" }
        ]
      }
    },
    {
      "id": "kanban-status", "title": "🚦 Status Board", "type": "kanban", "enabled": true,
      "filter": { "logic": "AND", "conditions": [{ "column": "Status", "filterType": "valueNotInList", "filterValue": ["Completed", "Archived", "Cancelled"] }] },
      "config": {
        "groupByColumn": "Status", "groupSortBy": ["Blocked", "In Progress", "Pending Review", "Planning", "To Do", "On Hold"],
        "cardTitleColumn": "WorkItem", "cardLinkColumn": "InfoLink"
      }
    },
    {
      "id": "kanban-pillar", "title": "🏛️ By Pillar", "type": "kanban", "enabled": true,
      "filter": { "logic": "AND", "conditions": [{ "column": "Status", "filterType": "valueNotInList", "filterValue": ["Completed", "Archived", "Cancelled"] }] },
      "config": {
        "groupByColumn": "Pillar", "groupSortBy": ["Security Architecture", "Threat Modelling", "Security Champions"],
        "cardTitleColumn": "WorkItem", "cardLinkColumn": "InfoLink"
      }
    },
    {
      "id": "all-items", "title": "📋 All Items", "type": "table", "enabled": true, "filter": null,
      "config": {
        "displayColumns": ["WorkItem", "Pillar", "WorkItemType", "ParentItemID", "Status", "Owner", "AssignedTo", "Priority", "DueDate", "InfoLink"],
        "columnLabels": {
          "ItemID": "ID",
          "WorkItem": "Work Item Title",
          "ParentItemID": "Parent Item", // Override default label
          "WorkItemType": "Type"
        },
        "columnWidths": { "WorkItem": "300px", "Pillar": "180px", "ParentItemID": "150px", "Status": "130px", "Assignee": "150px" }
      }
    },
    // Add this new tab object to the "tabs" array in your
    // alt_config/director_tracker_viewer_config.js file.

    {
      "id": "work-breakdown-structure",
      "title": "🗂️ WBS View", // WBS = Work Breakdown Structure
      "type": "table-hierarchy", // Use the new view type
      "enabled": true,
      "bgColor": "#e9d8fd", // A distinct color for this special view tab
      "textColor": "#5e3a8c",
      "filter": {
        // Exclude items that are fully done, so the hierarchy focuses on active work
        "logic": "AND",
        "conditions": [
          { "column": "Status", "filterType": "valueNotInList", "filterValue": ["Completed", "Archived", "Cancelled"] }
        ]
      },
      "config": {
        // --- Required config for this view type ---
        "idColumn": "ItemID",
        "parentColumn": "ParentItemID",

        // --- Standard table-like configurations ---
        "displayColumns": [
          "WorkItem",
          "Pillar",
          "ItemType",
          "Status",
          "Owner",
          "DueDate",
          "IsBlocked"
        ],
        "columnLabels": {
          "ItemID": "ID",
          "WorkItem": "Title",
          "ParentItemID": "Parent Item", // Override default label
          "WorkItemType": "Type"
        },
        "columnWidths": {
          "Pillar": "80px", // Default width for unspecified columns
          "WorkItem": "200px",  // Give the main hierarchical column plenty of space
          "ItemType": "180px",
          "Status": "80px",
          "Owner": "80px",
          "DueDate": "80px",
          "IsBlocked": "80px"
        },
        "headerOrientations": {
          "default": "horizontal" // Use horizontal headers for better readability in this view
        },
        // --- Sorting config for recursive sorting ---
        // You can define a specific sort order here, or let it fall back
        // to the defaultItemSortBy from generalSettings.
        // Let's define a specific one to ensure parents are grouped by pillar first.
        "sortBy": [
          // Note: This sort is applied at each level.
          // So all top-level items are sorted by Pillar, then DueDate.
          // Then, for each top-level item, its children are sorted by Pillar, then DueDate, and so on.
          { "column": "Pillar", "direction": "asc" },
          { "column": "DueDate", "direction": "asc" }
        ]
      }
    },
    {
      "id": "work-hierarchy", "title": "🕸️ Hierarchy View", "type": "graph", "enabled": true, "filter": null,
      "config": {
        "primaryNodeIdColumn": "WorkItem",
        "primaryNodeLabelColumn": "WorkItem",
        "categoryNodeColumns": ["ParentItemID"],
        "nodeColorColumn": "Pillar",
        "nodeShape": "box",
        "nodeTooltipColumns": ["WorkItemType", "Owner", "Status", "DueDate"],
        "edgeDirection": "directed",
        "layoutEngine": "hierarchical",
        "physicsEnabled": false,
        "edges": [{ "from": "ParentItemID", "to": "WorkItem" }]
      }
    },
    {
      "id": "team-workload", "title": "🧑‍💻 Team Workload", "type": "counts", "enabled": true,
      "filter": { "logic": "AND", "conditions": [{ "column": "Status", "filterType": "valueNotInList", "filterValue": ["Completed", "Archived", "Cancelled"] }] },
      "config": {
        "groupByColumn": "Owner",
        "counters": [
          { "title": "Total Owned Items", "column": "WorkItem", "filterType": "valueNotEmpty" },
          { "title": "Critical/High Prio", "column": "Priority", "filterType": "valueInList", "filterValue": ["Critical", "High"] },
          { "title": "Pillar Breakdown", "column": "Pillar", "filterType": "countAllValues" }
        ]
      }
    }
  ]
};