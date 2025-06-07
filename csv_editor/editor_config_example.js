// csv_editor/editor_config_director_tracker.js
window.editorConfig = {
    "editorSchemaVersion": 1.2,

    "preloadUrls": {
        "viewerConfigUrl": "../config.js",
        "csvDataUrl": "../sample_data/director_work_tracker.csv",
        "cumulativeLogUrl": null // e.g., "./changelogs/director_tracker_log.md"
    },

    "csvDataFileName": "DirectorWorkTracker_Data",
    "cumulativeLogName": "DirectorWorkTracker_Changelog",

    "changeTrackingPrimaryKeyColumn": "WorkItem",

    "csvOutputOptions": {
        "delimiter": ",",
        "booleanTrueValue": "TRUE",
        "booleanFalseValue": "FALSE"
    },

    "editorDisplaySettings": {
        "partitionBy": {
            "enabled": true,
            "filter": {
                "logic": "OR",
                "conditions": [
                    { "column": "Status", "filterType": "valueEquals", "filterValue": "Completed" },
                    { "column": "Status", "filterType": "valueEquals", "filterValue": "Archived" },
                    { "column": "Status", "filterType": "valueEquals", "filterValue": "Cancelled" }
                ]
            },
            "separatorStyle": "heavyLine"
        },
        "displayFilters": [
            { "id": "all", "label": "Show All", "isDefault": true, "criteria": null },
            { "id": "top-level", "label": "Show Top-Level Items", "criteria": { "conditions": [{ "column": "ParentItemID", "filterType": "valueIsEmpty" }] } },
            { "id": "sub-items", "label": "Show Sub-Items Only", "criteria": { "conditions": [{ "column": "ParentItemID", "filterType": "valueNotEmpty" }] } },
            { "id": "my-owned", "label": "Show Items I Own", "criteria": { "conditions": [{ "column": "Owner", "filterType": "valueEquals", "filterValue": "Director Dave" }] } },
            { "id": "blocked", "label": "Show Blocked Items", "criteria": { "conditions": [{ "column": "IsBlocked", "filterType": "booleanTrue" }] } }
        ]
    },

    "columns": [
        {
            "name": "ItemID",
            "label": "ID",
            "type": "text",
            "readOnly": true, // User cannot edit this
            "columnWidth": "50px"
        },
        { "name": "WorkItem", "label": "Work Item Title", "type": "text", "required": true, "columnWidth": "350px" },
        { "name": "Pillar", "label": "Pillar", "type": "select", "required": true, "optionsSource": "viewerConfigValueMap", "viewerStyleColumnName": "Pillar", "columnWidth": "180px" },
        { "name": "WorkItemType", "label": "Type", "type": "select", "required": true, "optionsSource": "viewerConfigValueMap", "viewerStyleColumnName": "WorkItemType", "columnWidth": "180px" },
        {
            "name": "ParentItemID", "label": "Parent Item", "type": "select",
            // This is the core new configuration for relational lookups
            "deriveOptionsFrom": {
                "column": "ItemID",        // Use this column for the option VALUE (the stored ID)
                "labelColumn": "WorkItem"  // Use this column for the option LABEL (the displayed name)
            },
            "sourceColumnFilter": { // Only allow top-level items to be selected as parents
                "logic": "AND",
                "conditions": [{ "column": "ParentItemID", "filterType": "valueIsEmpty" }]
            },
            "allowNewTags": false, "viewerStyleColumnName": "ParentItemID", "columnWidth": "250px"
        },
        { "name": "Status", "label": "Status", "type": "select", "required": true, "optionsSource": "viewerConfigValueMap", "viewerStyleColumnName": "Status", "columnWidth": "160px" },
        {
            "name": "Owner", "label": "Owner", "type": "multi-select", "required": true, "allowNewTags": true,
            "options": ["Director Dave", "Alice", "Bob", "Charlie", "Diana"], "viewerStyleColumnName": "Owner", "columnWidth": "150px"
        },
        {
            "name": "AssignedTo", "label": "Assigned To", "type": "multi-select", "allowNewTags": true,
            "options": ["Director Dave", "Alice", "Bob", "Charlie", "Diana", "AppDev Leads", "Cloud Platform Team"], "viewerStyleColumnName": "AssignedTo", "columnWidth": "200px"
        },
        { "name": "Stakeholders", "label": "Stakeholders", "type": "multi-select", "allowNewTags": true, "viewerStyleColumnName": "Stakeholders", "columnWidth": "200px" },
        { "name": "Priority", "label": "Prio", "type": "select", "required": true, "optionsSource": "viewerConfigValueMap", "viewerStyleColumnName": "Priority", "columnWidth": "100px" },
        { "name": "DueDate", "label": "Due Date", "type": "date", "viewerStyleColumnName": "DueDate", "columnWidth": "120px" },
        { "name": "CompletionDate", "label": "Completion Date", "type": "date", "viewerStyleColumnName": "CompletionDate", "columnWidth": "120px" },
        { "name": "Goal", "label": "Goal/Description", "type": "textarea", "displayAsSingleLine": true, "columnWidth": "300px" },
        { "name": "LatestUpdate", "label": "Latest Update", "type": "textarea", "displayAsSingleLine": true, "columnWidth": "300px" },
        { "name": "InfoLink", "label": "Info Link (URL)", "type": "text", "columnWidth": "200px" },
        { "name": "IsBlocked", "label": "Blocked?", "type": "checkbox", "viewerStyleColumnName": "IsBlocked", "orientation": "vertical", "columnWidth": "80px" }
    ]
};