import jwt from 'jsonwebtoken'

export function isAuth(req: any, res: any, next: any) {
    const authToken = req.headers.authtoken?.split(' ')[1]
    const oAuthToken = req.headers.oauthtoken?.split(' ')[1]

    function isInvalidAuthToken() {
        return !authToken || authToken.trim().toLowerCase() === 'null'
    }
    function isInvalidoAuthToken() {
        return !oAuthToken || oAuthToken.trim().toLowerCase() === 'undefined'
    }

    if (isInvalidAuthToken() && isInvalidoAuthToken()) {
        return res.status(400).json({ msg: 'Please login first!' })
    }

    if (oAuthToken && oAuthToken.trim().toLowerCase() !== 'undefined') {
        req.oAuthToken = oAuthToken;
        return next()
    }

    try {
        const decodedToken = jwt.verify(authToken, process.env.JWT_KEY!)
        req.decodedToken = decodedToken
        next()
    } catch (err) {
        return res.status(400).json({ msg: 'invalid auth token!' })
    }
}