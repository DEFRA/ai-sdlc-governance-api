import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.resolve(
  __dirname,
  '../../../../../scripts/migrations'
)

/**
 * Runs all migrations that haven't been run yet
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @param {object} logger - Logger instance
 * @returns {Promise<void>}
 */
export async function runMigrations(db, logger) {
  logger.info('Checking for migrations to run...')

  // Create migrations collection if it doesn't exist
  if (!(await collectionExists(db, 'migrations'))) {
    await db.createCollection('migrations')
    logger.info('Created migrations collection')
  }

  // Get list of completed migrations
  const completedMigrations = await db
    .collection('migrations')
    .find({})
    .project({ name: 1, _id: 0 })
    .map((doc) => doc.name)
    .toArray()

  // Get list of migration files
  const migrationFiles = await getMigrationFiles()

  // Filter out completed migrations
  const pendingMigrations = migrationFiles.filter(
    (file) => !completedMigrations.includes(path.basename(file, '.js'))
  )

  if (pendingMigrations.length === 0) {
    logger.info('No pending migrations found')
    return
  }

  logger.info(`Found ${pendingMigrations.length} pending migrations`)

  // Run each migration in sequence
  for (const migrationFile of pendingMigrations) {
    const migrationName = path.basename(migrationFile, '.js')
    logger.info(`Running migration: ${migrationName}`)

    try {
      // Import and run the migration
      const migration = await import(migrationFile)
      await migration.default(db, logger)

      // Record successful migration
      await db.collection('migrations').insertOne({
        name: migrationName,
        completedAt: new Date()
      })

      logger.info(`Migration completed: ${migrationName}`)
    } catch (error) {
      logger.error(`Migration failed: ${migrationName}`, error)
      throw error
    }
  }

  logger.info('All migrations completed successfully')
}

/**
 * Checks if a collection exists in the database
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @param {string} collectionName - Name of the collection to check
 * @returns {Promise<boolean>}
 */
async function collectionExists(db, collectionName) {
  const collections = await db
    .listCollections({ name: collectionName })
    .toArray()
  return collections.length > 0
}

/**
 * Gets a list of migration files
 * @returns {Promise<string[]>}
 */
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR)
    return files
      .filter((file) => file.endsWith('.js'))
      .map((file) => path.join(MIGRATIONS_DIR, file))
      .sort() // Sort to ensure migrations run in order
  } catch (error) {
    // If directory doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}
