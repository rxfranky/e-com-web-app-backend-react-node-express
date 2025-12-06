import { Pool } from 'pg'

const pool = new Pool(
    {
        connectionString: process.env.DATABASE_CONN_URL,
    }
)

export default pool;





// host: 'localhost',
//     port: 5432,
//     user: 'postgres',
//     password: 'mypass',
//     database: 'e-com-practice'