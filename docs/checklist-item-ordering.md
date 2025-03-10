# Checklist Item Ordering Feature

## Overview

The checklist item ordering feature allows for manual ordering of checklist item templates and instances. This ordering is used to determine the display order of checklist items in the UI, providing a more intuitive and customizable user experience.

## Implementation Details

### Checklist Item Templates

Checklist item templates now include an `order` field, which is an integer that determines the display order. Lower values are displayed first. The default value is `0`.

```json
{
  "_id": "60d21bbfe3d5d533d9fc1e4c",
  "workflowTemplateId": "60d21bbfe3d5d533d9fc1e4d",
  "name": "Upload Model Documentation",
  "description": "Upload documentation for the AI model",
  "type": "document",
  "dependencies_requires": [],
  "metadata": {
    "requiredEvidence": true,
    "approver": "manager"
  },
  "order": 1,
  "createdAt": "2024-03-20T10:00:00.000Z",
  "updatedAt": "2024-03-20T10:00:00.000Z"
}
```

### Checklist Item Instances

When a project is created, the `order` field from each checklist item template is copied to the corresponding checklist item instance. This ensures that the ordering is preserved when checklist items are instantiated for a project.

```json
{
  "_id": "60d21bbfe3d5d533d9fc1e4c",
  "workflowInstanceId": "60d21bbfe3d5d533d9fc1e4d",
  "checklistItemTemplateId": "60d21bbfe3d5d533d9fc1e4e",
  "name": "Upload Model Documentation",
  "description": "Upload documentation for the AI model",
  "type": "document",
  "status": "incomplete",
  "dependencies_requires": [],
  "metadata": {
    "requiredEvidence": true,
    "approver": "manager"
  },
  "order": 1,
  "createdAt": "2024-03-20T10:00:00.000Z",
  "updatedAt": "2024-03-20T10:00:00.000Z"
}
```

## API Usage

### Creating a Checklist Item Template with Order

When creating a checklist item template, the `order` field is automatically calculated and set to the maximum order value for all checklist item templates in the same workflow template plus 1. This ensures that new checklist item templates are always added to the end of the list.

```json
{
  "workflowTemplateId": "60d21bbfe3d5d533d9fc1e4d",
  "name": "Upload Model Documentation",
  "description": "Upload documentation for the AI model",
  "type": "document",
  "dependencies_requires": [],
  "metadata": {
    "requiredEvidence": true,
    "approver": "manager"
  }
}
```

The response will include the automatically calculated `order` value:

```json
{
  "_id": "60d21bbfe3d5d533d9fc1e4c",
  "workflowTemplateId": "60d21bbfe3d5d533d9fc1e4d",
  "name": "Upload Model Documentation",
  "description": "Upload documentation for the AI model",
  "type": "document",
  "dependencies_requires": [],
  "metadata": {
    "requiredEvidence": true,
    "approver": "manager"
  },
  "order": 3,
  "createdAt": "2024-03-20T10:00:00.000Z",
  "updatedAt": "2024-03-20T10:00:00.000Z"
}
```

### Updating a Checklist Item Template's Order

You can update the `order` field of an existing checklist item template:

```json
{
  "order": 2
}
```

### Deleting a Checklist Item Template

When a checklist item template is deleted, all remaining checklist item templates in the same workflow template with a higher order value will have their order decremented by 1. This ensures that the order remains sequential without gaps.

For example, if you have checklist item templates with orders 0, 1, 2, 3 and delete the template with order 1, the remaining templates will be reordered to 0, 1, 2.

### Retrieving Checklist Item Templates

When retrieving checklist item templates for a workflow template, they are automatically sorted by their `order` field:

```
GET /api/v1/checklist-item-templates?workflowTemplateId=60d21bbfe3d5d533d9fc1e4d
```

## Migration

A migration script has been created to add the `order` field to existing checklist item templates and instances. The migration runs automatically when the application is deployed.

For existing checklist item templates, the `order` is initially set based on the template's name (alphabetical order). For existing checklist item instances, the `order` is copied from their corresponding templates.

## UI Considerations

The UI should display checklist items in the order specified by the `order` field. This provides a consistent and predictable experience for users, regardless of when the checklist items were created or their alphabetical order.
