import { genSaltSync, hashSync, compareSync } from 'bcrypt'
import { client } from '../index.js'
import jwt from 'jsonwebtoken'
import type { Request, Response } from 'express';
import * as Brevo from '@getbrevo/brevo'
import crypto from 'node:crypto'


const apiInstance = new Brevo.TransactionalEmailsApi()
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!)
const sendSmtpEmail = new Brevo.SendSmtpEmail()

sendSmtpEmail.sender = {
    email: process.env.BREVO_EMAIL!,
    name: process.env.BREVO_NAME!
}

export const signup = async (req: any, res: any) => {
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    const hassedPassword = hashSync(password, 15)
    try {
        await client.query(`INSERT INTO users(name, email, password) VALUES($1, $2, $3);`, [name, email, hassedPassword])

        sendSmtpEmail.to = [{ email }]
        sendSmtpEmail.subject = 'Signup Success!'
        sendSmtpEmail.htmlContent = '<p>Signup success! Lets login to explore more.</p> <span>Login link-</span><a href="https://e-com-practice-backend.onrender.com/login">login</a>'
        await apiInstance.sendTransacEmail(sendSmtpEmail)

        res.status(201).json({ signedUp: true, msg: 'signup success!' })
    } catch (err: any) {
        console.log('err-', err.message)
        if (err.message.trim().toLowerCase().includes('unique constraint')) {
            return res.json({ isAlreadySignedUp: true, msg: 'Already signed up with this email' })
        }
        return res.status(500).json({ msg: 'err related to database or email' })
    }
}

export async function login(req: any, res: any) {
    const authToken = req.headers.authtoken.split(' ')[1]
    const loginData = req.body;

    if (authToken.trim().toLowerCase() !== 'null') {
        return res.status(500).json({ msg: 'Already logged in!' })
    }

    const queryRes = await client.query(`SELECT * FROM users WHERE email=$1;`, [loginData.email])
    if (queryRes.rowCount === 0) {
        return res.json({ msg: 'Signup first!' })
    } else {
        const isPasswordMatch = compareSync(loginData.password, queryRes.rows[0].password)
        if (isPasswordMatch) {
            const jwtKey = process.env.JWT_KEY!
            const token = jwt.sign({ email: loginData.email }, jwtKey, { expiresIn: '2h' })
            return res.status(200).json({ msg: 'Login Success!', authToken: token, email: loginData.email })
        } else {
            res.json({ msg: 'Incorrect password entered!' })
        }
    }
}


export const changePassword = async (req: any, res: any) => {
    const decodedToken = req.decodedToken

    const email = decodedToken.email
    const oldPassword = req.body.oldPassword
    const newPassword = req.body.newPassword

    const salt = genSaltSync(15)
    const hassedNewPassword = hashSync(newPassword, salt)
    try {
        const queryRes = await client.query(`SELECT password, email FROM users WHERE email=$1;`, [email])
        if (queryRes.rowCount === 0) {
            return res.json({ notSignedUp: true, msg: 'Signup first!' })
        } else {
            const isPasswordMatch = compareSync(oldPassword, queryRes.rows[0].password)
            if (isPasswordMatch) {
                await client.query(`UPDATE users SET password=$1 WHERE email=$2;`, [hassedNewPassword, email])
                return res.json({ passwordChanged: true, msg: 'Password changed success!' })
            } else {
                return res.json({ wrongOldPassword: true, msg: 'Incorrect old password!' })
            }
        }
    } catch (err) {
        console.log('err in quering-', err)
    }
}


export async function postResetPassword(req: Request, res: Response) {
    const email = req.body.email;
    const queryRes = await client.query(`SELECT email FROM users WHERE email=$1;`, [email])
    if (queryRes.rowCount === 0) {
        return res.json({ notSignedUp: true, msg: 'Signup first!' })
    } else {
        const token = crypto.randomBytes(20).toString('hex')
        const tokenExp = new Date()
        tokenExp.setHours(tokenExp.getHours() + 2)
        try {
            await client.query(`UPDATE users SET password_reset_token=$1, reset_token_exp=$2 WHERE email=$3;`, [token, tokenExp, email])
            sendSmtpEmail.to = [{ email }]
            sendSmtpEmail.subject = 'Reset Password'
            sendSmtpEmail.htmlContent = `<span>Reset your password-</span><a href='https://e-com-web-app-frontend-node-react-e.vercel.app/login/newPassword/?token=${token}'>reset here</a>`
            await apiInstance.sendTransacEmail(sendSmtpEmail)
            return res.json({ sentEmail: true, msg: 'Email sent for reset password' })
        } catch (err: any) {
            console.log('err-', err.message)
            return res.status(500).json({ msg: 'some problem related to database or email' })
        }
    }
}


export async function newPassword(req: Request, res: Response) {
    const newPassword = req.body.newPassword
    const resetToken = req.body.resetToken

    const hassedNewPassword = hashSync(newPassword, 15)

    try {
        const queryRes = await client.query(`SELECT password, reset_token_exp FROM users WHERE password_reset_token=$1;`, [resetToken])

        if (queryRes.rowCount === 0) {
            return res.status(500).json({ msg: 'Invalid password reset token' })
        }
        const tokenExp = queryRes.rows[0].reset_token_exp
        const now = new Date()
        if (tokenExp < now) {
            return res.json({ tokenExpired: true, msg: 'Token has expired! Reset Again!' })
        } else {
            await client.query(`UPDATE users SET password=$1, password_reset_token=$3, reset_token_exp=$4 WHERE password_reset_token=$2;`, [hassedNewPassword, resetToken, null, null])
            return res.json({ newPassword: true, msg: 'Password reset success!' })
        }
    } catch (err: any) {
        console.log('err msg-', err.message, 'err-', err)
        res.status(500).json({ msg: 'err related to database!' })
    }
}