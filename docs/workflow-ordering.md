# Workflow Ordering Feature

## Overview

The workflow ordering feature allows for manual ordering of workflow templates and instances. This ordering is used to determine the display order of workflows in the UI, providing a more intuitive and customizable user experience.

## Implementation Details

### Workflow Templates

Workflow templates now include an `order` field, which is an integer that determines the display order. Lower values are displayed first. The default value is `0`.

```json
{
  "_id": "60d21bbfe3d5d533d9fc1e4c",
  "governanceTemplateId": "60d21bbfe3d5d533d9fc1e4d",
  "name": "Model Development Workflow",
  "description": "Workflow for developing and validating AI models",
  "metadata": {
    "priority": "high",
    "category": "development"
  },
  "order": 1,
  "createdAt": "2024-03-20T10:00:00.000Z",
  "updatedAt": "2024-03-20T10:00:00.000Z"
}
```

### Workflow Instances

When a project is created, the `order` field from each workflow template is copied to the corresponding workflow instance. This ensures that the ordering is preserved when workflows are instantiated for a project.

```json
{
  "_id": "60d21bbfe3d5d533d9fc1e4c",
  "projectId": "60d21bbfe3d5d533d9fc1e4d",
  "workflowTemplateId": "60d21bbfe3d5d533d9fc1e4e",
  "name": "Model Validation Workflow",
  "description": "Workflow for validating AI models",
  "metadata": {
    "priority": "high",
    "category": "validation"
  },
  "order": 1,
  "status": "active",
  "createdAt": "2024-03-20T10:00:00.000Z",
  "updatedAt": "2024-03-20T10:00:00.000Z"
}
```

## API Usage

### Creating a Workflow Template with Order

When creating a workflow template, the `order` field is automatically calculated and set to the maximum order value for all workflow templates in the same governance template plus 1. This ensures that new workflow templates are always added to the end of the list.

```json
{
  "governanceTemplateId": "60d21bbfe3d5d533d9fc1e4d",
  "name": "Model Development Workflow",
  "description": "Workflow for developing and validating AI models",
  "metadata": {
    "priority": "high",
    "category": "development"
  }
}
```

The response will include the automatically calculated `order` value:

```json
{
  "_id": "60d21bbfe3d5d533d9fc1e4c",
  "governanceTemplateId": "60d21bbfe3d5d533d9fc1e4d",
  "name": "Model Development Workflow",
  "description": "Workflow for developing and validating AI models",
  "metadata": {
    "priority": "high",
    "category": "development"
  },
  "order": 3,
  "createdAt": "2024-03-20T10:00:00.000Z",
  "updatedAt": "2024-03-20T10:00:00.000Z"
}
```

### Updating a Workflow Template's Order

You can update the `order` field of an existing workflow template:

```json
{
  "order": 2
}
```

### Deleting a Workflow Template

When a workflow template is deleted, all remaining workflow templates in the same governance template with a higher order value will have their order decremented by 1. This ensures that the order remains sequential without gaps.

For example, if you have workflow templates with orders 0, 1, 2, 3 and delete the template with order 1, the remaining templates will be reordered to 0, 1, 2.

### Retrieving Workflow Instances

When retrieving workflow instances for a project, they are automatically sorted by their `order` field:

```
GET /api/v1/workflow-instances?projectId=60d21bbfe3d5d533d9fc1e4d
```

## Migration

A migration script has been created to add the `order` field to existing workflow templates and instances. The migration runs automatically when the application is deployed.

For existing workflow templates, the `order` is initially set based on the template's name (alphabetical order). For existing workflow instances, the `order` is copied from their corresponding templates.

## UI Considerations

The UI should display workflows in the order specified by the `order` field. This provides a consistent and predictable experience for users, regardless of when the workflows were created or their alphabetical order.
