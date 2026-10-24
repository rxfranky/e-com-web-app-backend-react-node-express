import * as express from 'express'
import type { Router } from 'express'
import { toNodeHandler } from 'better-auth/node'
import oAuthState from '../utils/oAuthState.js'
import { auth } from '../utils/auth.js'

const router: Router = express.Router()

router.all('/api/auth/{*socialProvider}', oAuthState, toNodeHandler(auth))

export default router;