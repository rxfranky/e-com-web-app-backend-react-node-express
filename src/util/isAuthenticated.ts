import jwt from 'jsonwebtoken'

export function isAuth(req: any, res: any, next: any) {
    const authToken = req.headers.authtoken.split(' ')[1]

    if (!authToken || authToken==='null') {
        return res.status(400).json({ msg: 'auth token is null' })
    }
    try {
        const decodedToken = jwt.verify(authToken, 'supersecret')
        req.decodedToken = decodedToken
        next()
    } catch (err) {
        return res.status(400).json({ msg: 'invalid auth token' })
    }
}