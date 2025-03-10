import { MongoClient, ObjectId } from 'mongodb'
import { promises as fs } from 'fs'
import path from 'path'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { fileURLToPath } from 'url'
import { config } from '../src/config/index.js'

// Use __filename for potential future path resolution needs
fileURLToPath(import.meta.url)

class MongoHandler {
  constructor() {
    this.client = null
    this.db = null
  }

  async connect() {
    try {
      const uri = config.get('mongoUri')
      if (!uri) {
        throw new Error('MongoDB URI not configured')
      }

      this.client = await MongoClient.connect(uri)
      this.db = this.client.db(config.get('mongoDatabase'))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      throw new Error('Failed to connect to MongoDB: ' + errorMessage)
    }
  }

  async close() {
    if (this.client) {
      await this.client.close()
    }
  }

  async deleteAll() {
    const collections = await this.db.listCollections().toArray()
    for (const collection of collections) {
      await this.db.collection(collection.name).deleteMany({})
    }
  }

  async dumpDatabase(testDataDir = 'test_data') {
    const dumpsDir = path.join(testDataDir, 'mongodb_dumps')
    await fs.mkdir(dumpsDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '')
    const outputFile = path.join(
      dumpsDir,
      'mongodb_dump_' + timestamp + '.json'
    )

    const dumpData = {}
    const collections = await this.db.listCollections().toArray()

    for (const collection of collections) {
      const documents = await this.db
        .collection(collection.name)
        .find({})
        .toArray()
      // Convert ObjectIds and Dates to a serializable format
      const processedDocs = documents.map((doc) =>
        JSON.parse(
          JSON.stringify(doc, (key, value) => {
            if (value instanceof ObjectId) {
              return value.toString()
            }
            if (value instanceof Date) {
              return value.toISOString()
            }
            return value
          })
        )
      )
      dumpData[collection.name] = processedDocs
    }

    await fs.writeFile(outputFile, JSON.stringify(dumpData, null, 2))
    return outputFile
  }

  async restoreDatabase(dumpFile = null) {
    let finalDumpFile = dumpFile
    if (!finalDumpFile) {
      const dumpsDir = path.join('test_data', 'mongodb_dumps')
      try {
        const files = await fs.readdir(dumpsDir)
        const jsonFiles = files.filter((f) => f.endsWith('.json'))
        if (jsonFiles.length === 0) {
          return null
        }

        // Get the most recent dump file
        const mostRecent = jsonFiles.sort().reverse()[0]
        finalDumpFile = path.join(dumpsDir, mostRecent)
      } catch (error) {
        return null
      }
    }

    const dumpData = JSON.parse(await fs.readFile(finalDumpFile, 'utf-8'))

    for (const [collectionName, documents] of Object.entries(dumpData)) {
      // Clear existing data
      await this.db.collection(collectionName).deleteMany({})

      if (documents.length === 0) continue

      // Convert string IDs back to ObjectIds and handle special fields
      const processedDocs = documents.map((doc) => {
        const processedDoc = { ...doc }

        // Process _id
        if (processedDoc._id) {
          processedDoc._id = new ObjectId(processedDoc._id)
        }

        // Process other fields
        Object.keys(processedDoc).forEach((key) => {
          // Handle ObjectId fields
          if (key.endsWith('_id') && typeof processedDoc[key] === 'string') {
            try {
              processedDoc[key] = new ObjectId(processedDoc[key])
            } catch {
              // Keep as string if not a valid ObjectId
            }
          } else if (key.endsWith('_ids') && Array.isArray(processedDoc[key])) {
            processedDoc[key] = processedDoc[key]
              .filter((id) => typeof id === 'string')
              .map((id) => {
                try {
                  return new ObjectId(id)
                } catch {
                  return id
                }
              })
          }
        })

        // Convert date strings to Date objects
        if (processedDoc.createdAt) {
          processedDoc.createdAt = new Date(processedDoc.createdAt)
        }
        if (processedDoc.updatedAt) {
          processedDoc.updatedAt = new Date(processedDoc.updatedAt)
        }

        // Handle dependencies_requires array
        if (processedDoc.dependencies_requires) {
          if (
            Array.isArray(processedDoc.dependencies_requires) &&
            processedDoc.dependencies_requires.length > 0
          ) {
            processedDoc.dependencies_requires =
              processedDoc.dependencies_requires.map((id) => new ObjectId(id))
          } else {
            delete processedDoc.dependencies_requires
          }
        }

        // Handle optional fields
        if (
          processedDoc.metadata &&
          Object.keys(processedDoc.metadata).length === 0
        ) {
          delete processedDoc.metadata
        }

        if (processedDoc.description === '') {
          delete processedDoc.description
        }

        // Handle status fields with correct enums
        if (collectionName === 'workflowInstances' && !processedDoc.status) {
          processedDoc.status = 'active'
        }
        if (
          collectionName === 'checklistItemInstances' &&
          !processedDoc.status
        ) {
          processedDoc.status = 'incomplete'
        }

        // Ensure specific fields are ObjectIds
        if (
          processedDoc.workflowTemplateId &&
          typeof processedDoc.workflowTemplateId === 'string'
        ) {
          processedDoc.workflowTemplateId = new ObjectId(
            processedDoc.workflowTemplateId
          )
        }
        if (
          processedDoc.governanceTemplateId &&
          typeof processedDoc.governanceTemplateId === 'string'
        ) {
          processedDoc.governanceTemplateId = new ObjectId(
            processedDoc.governanceTemplateId
          )
        }

        // Log the processed document for debugging
        // eslint-disable-next-line no-console
        console.log(`Processed document for ${collectionName}:`, {
          ...processedDoc,
          createdAt:
            processedDoc.createdAt instanceof Date
              ? processedDoc.createdAt.toISOString()
              : processedDoc.createdAt,
          updatedAt:
            processedDoc.updatedAt instanceof Date
              ? processedDoc.updatedAt.toISOString()
              : processedDoc.updatedAt
        })

        return processedDoc
      })

      if (processedDocs.length > 0) {
        try {
          await this.db.collection(collectionName).insertMany(processedDocs)
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            `Error inserting into ${collectionName}:`,
            error.message
          )
          // eslint-disable-next-line no-console
          console.error('First document:', {
            ...processedDocs[0],
            createdAt:
              processedDocs[0].createdAt instanceof Date
                ? processedDocs[0].createdAt.toISOString()
                : processedDocs[0].createdAt,
            updatedAt:
              processedDocs[0].updatedAt instanceof Date
                ? processedDocs[0].updatedAt.toISOString()
                : processedDocs[0].updatedAt
          })
          throw error
        }
      }
    }

    return finalDumpFile
  }
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .command('dump', 'Dump the current state of MongoDB')
    .command('restore', 'Restore database from a dump file')
    .command('deleteAll', 'Delete all data from all collections')
    .command('reset-schema', 'Reset schema validations')
    .option('file', {
      alias: 'f',
      describe: 'Specific dump file to restore from',
      type: 'string'
    })
    .demandCommand(
      1,
      'You must specify an action: dump, restore, deleteAll, or reset-schema'
    )
    .help().argv

  const mongo = new MongoHandler()

  try {
    await mongo.connect()

    if (argv._[0] === 'dump') {
      const outputFile = await mongo.dumpDatabase()
      // eslint-disable-next-line no-console
      console.log('Database dumped to:', outputFile)
    } else if (argv._[0] === 'restore') {
      const restoredFile = await mongo.restoreDatabase(argv.file)
      if (restoredFile) {
        // eslint-disable-next-line no-console
        console.log('Database restored from:', restoredFile)
      } else {
        // eslint-disable-next-line no-console
        console.log('No dump files found to restore')
      }
    } else if (argv._[0] === 'deleteAll') {
      await mongo.deleteAll()
      // eslint-disable-next-line no-console
      console.log('All collections have been emptied')
    } else if (argv._[0] === 'reset-schema') {
      await resetSchemaValidations()
      // eslint-disable-next-line no-console
      console.log('Schema validations have been reset')
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      'Fatal error occurred:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    process.exitCode = 1
  } finally {
    await mongo.close()
  }
}

async function resetSchemaValidations() {
  const uri = config.get('mongoUri')
  const dbName = config.get('mongoDatabase')
  const client = await MongoClient.connect(uri)
  const db = client.db(dbName)

  // Drop existing schema validations for all collections
  const collections = [
    'projects',
    'governanceTemplates',
    'workflowTemplates',
    'checklistItemTemplates',
    'workflowInstances',
    'checklistItemInstances',
    'auditLogs'
  ]

  // Create collections if they don't exist
  for (const collection of collections) {
    try {
      await db.createCollection(collection)
    } catch (error) {
      // Collection might already exist, which is fine
      if (!error.message.includes('already exists')) {
        throw error
      }
    }
  }

  // Drop existing schema validations
  for (const collection of collections) {
    await db.command({ collMod: collection, validator: {} })
  }

  // Re-create schema validations
  const validations = [
    {
      collection: 'governanceTemplates',
      schema: {
        bsonType: 'object',
        required: ['name', 'version', 'createdAt', 'updatedAt'],
        additionalProperties: false,
        properties: {
          _id: { bsonType: 'objectId' },
          name: { bsonType: 'string' },
          version: { bsonType: 'string' },
          description: { bsonType: 'string', pattern: '^.*$' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    },
    {
      collection: 'projects',
      schema: {
        bsonType: 'object',
        required: [
          'name',
          'governanceTemplateId',
          'selectedWorkflowTemplateIds',
          'createdAt',
          'updatedAt'
        ],
        additionalProperties: false,
        properties: {
          _id: { bsonType: 'objectId' },
          name: { bsonType: 'string' },
          description: { bsonType: 'string' },
          governanceTemplateId: { bsonType: 'objectId' },
          selectedWorkflowTemplateIds: {
            bsonType: 'array',
            items: { bsonType: 'objectId' }
          },
          metadata: { bsonType: 'object' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    },
    {
      collection: 'workflowTemplates',
      schema: {
        bsonType: 'object',
        required: ['governanceTemplateId', 'name', 'createdAt', 'updatedAt'],
        additionalProperties: false,
        properties: {
          _id: { bsonType: 'objectId' },
          governanceTemplateId: { bsonType: 'objectId' },
          name: { bsonType: 'string' },
          description: { bsonType: 'string', pattern: '^.*$' },
          metadata: { bsonType: 'object' },
          order: { bsonType: 'int' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    },
    {
      collection: 'workflowInstances',
      schema: {
        bsonType: 'object',
        required: [
          'projectId',
          'workflowTemplateId',
          'name',
          'status',
          'createdAt',
          'updatedAt'
        ],
        additionalProperties: false,
        properties: {
          _id: { bsonType: 'objectId' },
          projectId: { bsonType: 'objectId' },
          workflowTemplateId: { bsonType: 'objectId' },
          name: { bsonType: 'string' },
          description: { bsonType: 'string', pattern: '^.*$' },
          metadata: { bsonType: 'object' },
          order: { bsonType: 'int' },
          status: { bsonType: 'string', enum: ['active', 'completed'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    },
    {
      collection: 'checklistItemTemplates',
      schema: {
        bsonType: 'object',
        required: [
          'workflowTemplateId',
          'name',
          'type',
          'createdAt',
          'updatedAt'
        ],
        additionalProperties: false,
        properties: {
          _id: { bsonType: 'objectId' },
          workflowTemplateId: { bsonType: 'objectId' },
          name: { bsonType: 'string' },
          description: { bsonType: 'string', pattern: '^.*$' },
          type: { bsonType: 'string' },
          dependencies_requires: {
            bsonType: 'array',
            items: { bsonType: 'objectId' }
          },
          metadata: { bsonType: 'object' },
          order: { bsonType: 'int' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    },
    {
      collection: 'checklistItemInstances',
      schema: {
        bsonType: 'object',
        required: [
          'workflowInstanceId',
          'checklistItemTemplateId',
          'name',
          'type',
          'status',
          'createdAt',
          'updatedAt'
        ],
        additionalProperties: false,
        properties: {
          _id: { bsonType: 'objectId' },
          workflowInstanceId: { bsonType: 'objectId' },
          checklistItemTemplateId: { bsonType: 'objectId' },
          name: { bsonType: 'string' },
          description: { bsonType: 'string', pattern: '^.*$' },
          type: { bsonType: 'string' },
          status: {
            bsonType: 'string',
            enum: ['incomplete', 'complete', 'not_required']
          },
          dependencies_requires: {
            bsonType: 'array',
            items: { bsonType: 'objectId' }
          },
          metadata: { bsonType: 'object' },
          order: { bsonType: 'int' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    }
  ]

  for (const { collection, schema } of validations) {
    await db.command({
      collMod: collection,
      validator: { $jsonSchema: schema },
      validationLevel: 'strict',
      validationAction: 'error'
    })
  }

  // eslint-disable-next-line no-console
  console.log('Schema validations reset successfully')
  await client.close()
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(
    { error: error instanceof Error ? error.message : 'Unknown error' },
    'Fatal error occurred'
  )
  process.exitCode = 1
})
