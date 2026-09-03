import type { Response, NextFunction } from 'express'
import prisma from '../lib/prisma.js'
import jwt from 'jsonwebtoken'


export default async function isAlreadyLoggedIn(req: any, res: Response, next: NextFunction) {
    const authToken = req.headers.authtoken?.toString().split(' ')[1]
    const oAuthToken = req.headers.oauthtoken?.toString().split(' ')[1]

    if (req.url === '/api/auth/get-session') {
        return next()
    }

    if (!authToken || !oAuthToken) {
        return next()
    }

    const queryRes = await prisma.authState.findUnique({
        where: {
            token: authToken
        }
    })

    if (req.url === '/api/auth/sign-out') {
        return next()
    }

    try {
        if (authToken.trim().toLowerCase() !== 'null') {
            jwt.verify(authToken, process.env.JWT_KEY!)
        }
        if (queryRes || (oAuthToken !== 'undefined' && req.url === '/api/auth/sign-in/social')) {
            return res.status(400).json({ msg: 'Already logged in!' })
        }
    } catch (err) {
        if (queryRes) {
            await prisma.authState.delete({
                where: {
                    token: authToken
                }
            })
        }
        return next()
    }
    next()
}