import jwt from 'jsonwebtoken'

export function isAuth(req: any, res: any, next: any) {
    const authToken = req.headers.authtoken.split(' ')[1]

    if (authToken.trim().toLowerCase() === 'null') {
        return res.status(400).json({ msg: 'Login first!' })
    }
    try {
        const decodedToken = jwt.verify(authToken, process.env.JWT_KEY!)
        req.decodedToken = decodedToken
        next()
    } catch (err) {
        return res.status(400).json({ msg: 'invalid auth token' })
    }
}