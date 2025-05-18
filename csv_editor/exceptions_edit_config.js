// Generated Editor Config for: InfoSec Exception Tracker
// Based on Viewer Config: exceptions_config.js
// Based on CSV Data: exception_sample.csv

window.editorConfig = {
  "editorSchemaVersion": 1.0,
  "preloadUrls": {
    "viewerConfigUrl": "./exceptions_config.js",
    "csvDataUrl": "./exception_sample.csv"
  },
  "csvOutputOptions": {
    "delimiter": ",",
    "booleanTrueValue": "TRUE",
    "booleanFalseValue": "FALSE"
  },
  "columns": [
    {
      "name": "ExceptionID",
      "label": "Exceptionid",
      "type": "text",
      "required": false,
      "readOnly": false,
      "columnWidth": "150px",
      "viewerStyleColumnName": "ExceptionID"
    },
    {
      "name": "Application Name",
      "label": "Application Name",
      "type": "text",
      "required": false,
      "readOnly": false,
      "columnWidth": "150px",
      "viewerStyleColumnName": "Application Name"
    },
    {
      "name": "Exception Title",
      "label": "Exception Title",
      "type": "text",
      "required": false,
      "readOnly": false,
      "columnWidth": "150px",
      "viewerStyleColumnName": "Exception Title"
    },
    {
      "name": "Standard Excepted",
      "label": "Standard Excepted",
      "type": "text",
      "required": false,
      "readOnly": false,
      "columnWidth": "150px",
      "viewerStyleColumnName": "Standard Excepted"
    },
    {
      "name": "Risk Level",
      "label": "Risk Level",
      "type": "select",
      "required": false,
      "readOnly": false,
      "columnWidth": "180px",
      "viewerStyleColumnName": "Risk Level",
      "optionsSource": "viewerConfigValueMap"
    },
    {
      "name": "Status",
      "label": "Status",
      "type": "select",
      "required": false,
      "readOnly": false,
      "columnWidth": "180px",
      "viewerStyleColumnName": "Status",
      "optionsSource": "viewerConfigValueMap"
    },
    {
      "name": "Justification Summary",
      "label": "Justification Summary",
      "type": "textarea",
      "required": false,
      "readOnly": false,
      "columnWidth": "250px",
      "viewerStyleColumnName": "Justification Summary"
    },
    {
      "name": "Mitigating Controls Summary",
      "label": "Mitigating Controls Summary",
      "type": "textarea",
      "required": false,
      "readOnly": false,
      "columnWidth": "250px",
      "viewerStyleColumnName": "Mitigating Controls Summary"
    },
    {
      "name": "Owner",
      "label": "Owner",
      "type": "text",
      "required": false,
      "readOnly": false,
      "columnWidth": "150px",
      "viewerStyleColumnName": "Owner"
    },
    {
      "name": "Approver",
      "label": "Approver",
      "type": "text",
      "required": false,
      "readOnly": false,
      "columnWidth": "150px",
      "viewerStyleColumnName": "Approver"
    },
    {
      "name": "Origination Date",
      "label": "Origination Date",
      "type": "date",
      "required": false,
      "readOnly": false,
      "columnWidth": "120px",
      "viewerStyleColumnName": "Origination Date"
    },
    {
      "name": "Renewal Date",
      "label": "Renewal Date",
      "type": "date",
      "required": false,
      "readOnly": false,
      "columnWidth": "120px",
      "viewerStyleColumnName": "Renewal Date"
    },
    {
      "name": "Link",
      "label": "Link",
      "type": "text",
      "required": false,
      "readOnly": false,
      "columnWidth": "150px",
      "viewerStyleColumnName": "Link"
    }
  ]
};
