/**
 * Migration script to add order field to existing checklist item templates
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @param {object} logger - Logger instance
 * @returns {Promise<void>}
 */
export default async function (db, logger) {
  logger.info('Updating checklist item templates...')

  // Get all workflow templates
  const workflowTemplates = await db
    .collection('workflowTemplates')
    .find({})
    .toArray()

  for (const workflowTemplate of workflowTemplates) {
    // Get all checklist item templates for this workflow template
    const checklistItemTemplates = await db
      .collection('checklistItemTemplates')
      .find({ workflowTemplateId: workflowTemplate._id })
      .sort({ name: 1 }) // Sort by name initially
      .toArray()

    // Update each checklist item template with an order field
    for (let i = 0; i < checklistItemTemplates.length; i++) {
      await db
        .collection('checklistItemTemplates')
        .updateOne(
          { _id: checklistItemTemplates[i]._id },
          { $set: { order: i } }
        )
      logger.info(
        `Updated checklist item template ${checklistItemTemplates[i].name} with order ${i}`
      )
    }
  }

  // Update checklist item instances with order from their templates
  logger.info('Updating checklist item instances...')

  // Get all workflow instances
  const workflowInstances = await db
    .collection('workflowInstances')
    .find({})
    .toArray()

  for (const workflowInstance of workflowInstances) {
    // Get all checklist item instances for this workflow instance
    const checklistItemInstances = await db
      .collection('checklistItemInstances')
      .find({ workflowInstanceId: workflowInstance._id })
      .toArray()

    // Create a map of checklist item template IDs to their order
    const templateOrderMap = new Map()
    const checklistItemTemplateIds = checklistItemInstances.map(
      (ci) => ci.checklistItemTemplateId
    )

    if (checklistItemTemplateIds.length > 0) {
      const checklistItemTemplates = await db
        .collection('checklistItemTemplates')
        .find({
          _id: { $in: checklistItemTemplateIds }
        })
        .toArray()

      checklistItemTemplates.forEach((template) => {
        templateOrderMap.set(template._id.toString(), template.order || 0)
      })

      // Update each checklist item instance with the order from its template
      for (const instance of checklistItemInstances) {
        const templateOrder =
          templateOrderMap.get(instance.checklistItemTemplateId.toString()) || 0

        await db
          .collection('checklistItemInstances')
          .updateOne({ _id: instance._id }, { $set: { order: templateOrder } })
        logger.info(
          `Updated checklist item instance ${instance.name} with order ${templateOrder}`
        )
      }
    }
  }

  logger.info('Migration completed successfully')
}
