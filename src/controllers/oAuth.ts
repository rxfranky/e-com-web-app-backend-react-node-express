import type { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export default async function isAlreadyLoggedIn(req: any, res: Response, next: NextFunction) {
    const authToken = req.headers.authtoken?.toString().split(' ')[1]
    const oAuthToken = req.headers.oauthtoken?.toString().split(' ')[1]

    if (!authToken) {
        return next()
    }

    let isValidAuthToken = true;
    try {
        jwt.verify(authToken, process.env.JWT_KEY!)
    } catch (err) {
        isValidAuthToken = false
    }
    if (isValidAuthToken || (oAuthToken !== 'undefined' && req.url === '/api/auth/sign-in/social')) {
        return res.status(400).json({ msg: 'Already logged in!' })
    }

    next()
}
