import { MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

import { config } from '~/src/config/index.js'

/**
 * @satisfies { import('@hapi/hapi').ServerRegisterPluginObject<*> }
 */
export const mongoDb = {
  plugin: {
    name: 'mongodb',
    version: '1.0.0',
    /**
     *
     * @param { import('@hapi/hapi').Server } server
     * @param {{mongoUrl: string, databaseName: string, retryWrites: boolean, readPreference: string}} options
     * @returns {Promise<void>}
     */
    register: async function (server, options) {
      server.logger.info('Setting up MongoDb')

      const client = await MongoClient.connect(options.mongoUrl, {
        retryWrites: options.retryWrites,
        readPreference: options.readPreference,
        ...(server.secureContext && { secureContext: server.secureContext })
      })

      const databaseName = options.databaseName
      const db = client.db(databaseName)
      const locker = new LockManager(db.collection('mongo-locks'))

      await createIndexes(db)
      await createSchemaValidations(db)

      server.logger.info(`MongoDb connected to ${databaseName}`)

      server.decorate('server', 'mongoClient', client)
      server.decorate('server', 'db', db)
      server.decorate('server', 'locker', locker)
      server.decorate('request', 'db', () => db, { apply: true })
      server.decorate('request', 'locker', () => locker, { apply: true })

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      server.events.on('stop', async () => {
        server.logger.info('Closing Mongo client')
        await client.close(true)
      })
    }
  },
  options: {
    mongoUrl: config.get('mongoUri'),
    databaseName: config.get('mongoDatabase'),
    retryWrites: false,
    readPreference: 'secondary'
  }
}

/**
 * @param {import('mongodb').Db} db
 * @returns {Promise<void>}
 */
async function createIndexes(db) {
  await db.collection('mongo-locks').createIndex({ id: 1 })

  // Create indexes for governance templates
  await db.collection('governanceTemplates').createIndex({ name: 1 })
  await db.collection('governanceTemplates').createIndex({ version: 1 })
  await db
    .collection('governanceTemplates')
    .createIndex({ name: 1, version: 1 }, { unique: true })

  // Create indexes for workflow templates
  await db
    .collection('workflowTemplates')
    .createIndex({ governanceTemplateId: 1 })
  await db.collection('workflowTemplates').createIndex({ name: 1 })
  await db
    .collection('workflowTemplates')
    .createIndex({ governanceTemplateId: 1, name: 1 }, { unique: true })

  // Create indexes for checklist item templates
  await db
    .collection('checklistItemTemplates')
    .createIndex({ workflowTemplateId: 1 })
}

async function createSchemaValidations(db) {
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
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    }
  ]

  for (const { collection, schema } of validations) {
    try {
      await db.command({
        collMod: collection,
        validator: { $jsonSchema: schema },
        validationLevel: 'strict',
        validationAction: 'error'
      })
    } catch (error) {
      if (error.codeName === 'NamespaceNotFound') {
        await db.createCollection(collection, {
          validator: { $jsonSchema: schema },
          validationLevel: 'strict',
          validationAction: 'error'
        })
      } else {
        throw error
      }
    }
  }
}

/**
 * To be mixed in with Request|Server to provide the db decorator
 * @typedef {{db: import('mongodb').Db, locker: import('mongo-locks').LockManager }} MongoDBPlugin
 */
