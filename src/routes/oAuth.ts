import * as express from 'express'
import type { Router } from 'express'
import { toNodeHandler } from 'better-auth/node'
import isAlreadyLoggedIn from '../controllers/oAuth.js'
import { auth } from '../utils/auth.js'

const router: Router = express.Router()

router.all('/api/auth/{*socialProvider}', isAlreadyLoggedIn, toNodeHandler(auth))

export default router;