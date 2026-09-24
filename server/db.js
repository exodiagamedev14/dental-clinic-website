import pg from 'pg'
import { databaseClientOptions } from './db-options.js'
import { currentClinicId } from './clinic-context.js'

const { Pool } = pg

export function createDatabase(config) {
  const pool = new Pool({
    ...databaseClientOptions(config.databaseUrl),
    max: 10,
    idleTimeoutMillis: 30_000,
  })

  const transaction = async (work) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query("SELECT set_config('app.clinic_id', $1, true)", [currentClinicId()])
      const result = await work(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  return {
    query: (text, values) => transaction((client) => client.query(text, values)),
    transaction,
    close: () => pool.end(),
  }
}
