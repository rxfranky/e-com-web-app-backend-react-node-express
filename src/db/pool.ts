import { Pool } from 'pg'

const pool = new Pool(
    {
        connectionString: process.env.DATABASE_CONN_URL,
    }
)

export default pool;
