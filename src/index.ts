import express from "express"
import cors from 'cors'
import { type Express } from "express"

import 'dotenv/config'

import authRoutes from "./routes/auth.js"
import pool from "./db/pool.js"

const app: Express = express()

app.use(cors())

app.use(express.json())

app.use('/auth', authRoutes)

const port = process.env.PORT || 3000

export let client: any;
async function connectToDB() {
    try {
        client = await pool.connect()
        console.log('connected to db success')
        app.listen(port, (err: Error | undefined): void => {
            if (err) {
                return console.log('err in creating server-', err)
            }
            console.log('app is listening on port ' + port)
        })
    } catch (err: any) {
        console.log('err in conn db-', err.message)
    }
}
connectToDB()
