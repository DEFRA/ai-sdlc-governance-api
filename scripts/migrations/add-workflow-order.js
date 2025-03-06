/**
 * Migration script to add order field to existing workflow templates and instances
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @param {object} logger - Logger instance
 * @returns {Promise<void>}
 */
export default async function (db, logger) {
  // Step 1: Update workflow templates
  logger.info('Updating workflow templates...')

  // Get all governance templates
  const governanceTemplates = await db
    .collection('governanceTemplates')
    .find({})
    .toArray()

  for (const govTemplate of governanceTemplates) {
    // Get all workflow templates for this governance template
    const workflowTemplates = await db
      .collection('workflowTemplates')
      .find({ governanceTemplateId: govTemplate._id })
      .sort({ name: 1 }) // Sort by name initially
      .toArray()

    // Update each workflow template with an order field
    for (let i = 0; i < workflowTemplates.length; i++) {
      await db
        .collection('workflowTemplates')
        .updateOne({ _id: workflowTemplates[i]._id }, { $set: { order: i } })
      logger.info(
        `Updated workflow template ${workflowTemplates[i].name} with order ${i}`
      )
    }
  }

  // Step 2: Update workflow instances
  logger.info('Updating workflow instances...')

  // Get all projects
  const projects = await db.collection('projects').find({}).toArray()

  for (const project of projects) {
    // Get all workflow instances for this project
    const workflowInstances = await db
      .collection('workflowInstances')
      .find({ projectId: project._id })
      .toArray()

    // Create a map of workflow template IDs to their order
    const templateOrderMap = new Map()
    const workflowTemplates = await db
      .collection('workflowTemplates')
      .find({
        _id: {
          $in: workflowInstances.map((wi) => wi.workflowTemplateId)
        }
      })
      .toArray()

    workflowTemplates.forEach((template) => {
      templateOrderMap.set(template._id.toString(), template.order || 0)
    })

    // Update each workflow instance with the order from its template
    for (const instance of workflowInstances) {
      const templateOrder =
        templateOrderMap.get(instance.workflowTemplateId.toString()) || 0

      await db
        .collection('workflowInstances')
        .updateOne({ _id: instance._id }, { $set: { order: templateOrder } })
      logger.info(
        `Updated workflow instance ${instance.name} with order ${templateOrder}`
      )
    }
  }

  logger.info('Migration completed successfully')
}
