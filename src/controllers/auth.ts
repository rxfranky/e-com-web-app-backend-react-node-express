import { genSaltSync, hashSync, compareSync } from 'bcrypt'
import prisma from '../lib/prisma.js';
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
        await prisma.users.create({
            data: {
                name,
                email,
                password: hassedPassword
            }
        })

        sendSmtpEmail.to = [{ email }]
        sendSmtpEmail.subject = 'Signup Success!'
        sendSmtpEmail.htmlContent = '<p>Signup success! Lets login to explore more.</p> <span>Login link-</span><a href="https://e-com-web-app-frontend-node-react-e.vercel.app/login">login</a>'
        await apiInstance.sendTransacEmail(sendSmtpEmail)

        return res.status(201).json({ signedUp: true, msg: 'Signup success!' })
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

    const queryRes = await prisma.users.findUnique({
        select: {
            name: true,
            password: true
        },
        where: {
            email: loginData.email
        }
    })
    if (queryRes === null) {
        return res.json({ msg: 'Signup first!' })
    } else {
        const isPasswordMatch = compareSync(loginData.password, queryRes.password)
        if (isPasswordMatch) {
            const jwtKey = process.env.JWT_KEY!
            const token = jwt.sign({ email: loginData.email }, jwtKey, { expiresIn: '2h' })
            return res.status(200).json({ msg: 'Login Success!', authToken: token, email: loginData.email, name: queryRes.name })
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
        const queryRes = await prisma.users.findUnique({
            select: {
                password: true
            },
            where: {
                email
            }
        })
        if (queryRes === null) {
            return res.json({ notSignedUp: true, msg: 'Signup first!' })
        } else {
            const isPasswordMatch = compareSync(oldPassword, queryRes.password)
            if (isPasswordMatch) {
                await prisma.users.update({
                    data: {
                        password: hassedNewPassword
                    },
                    where: {
                        email
                    }
                })
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

    const queryRes = await prisma.users.findUnique({
        select: {
            email: true
        },
        where: {
            email
        }
    })
    if (queryRes === null) {
        return res.json({ notSignedUp: true, msg: 'Signup first!' })
    } else {
        const token = crypto.randomBytes(20).toString('hex')
        const tokenExp = new Date()
        tokenExp.setHours(tokenExp.getHours() + 2)
        try {
            await prisma.users.update({
                data: {
                    password_reset_token: token,
                    reset_token_exp: tokenExp
                },
                where: {
                    email
                }
            })
            sendSmtpEmail.to = [{ email }]
            sendSmtpEmail.subject = 'Reset Password'
            sendSmtpEmail.htmlContent = `<span>Reset your password-</span><a href='https://e-com-web-app-frontend-node-react-e.vercel.app/login/newPassword/?token=${token}'>reset here</a>`
            await apiInstance.sendTransacEmail(sendSmtpEmail)
            return res.json({ sentEmail: true, msg: 'Email sent for reset password!' })
        } catch (err: any) {
            console.log('err-', err.message)
            return res.status(500).json({ msg: 'some problem related to database or email!' })
        }
    }
}


export async function newPassword(req: Request, res: Response) {
    const newPassword = req.body.newPassword
    const resetToken = req.body.resetToken

    const hassedNewPassword = hashSync(newPassword, 15)
    try {
        const queryRes = await prisma.users.findUnique({
            select: {
                reset_token_exp: true
            },
            where: {
                password_reset_token: resetToken
            }
        })

        if (queryRes === null) {
            return res.status(500).json({ msg: 'Invalid password reset token!' })
        }
        const now = new Date()
        if (queryRes.reset_token_exp! < now) {
            return res.json({ tokenExpired: true, msg: 'Token has expired, Reset again!' })
        } else {
            await prisma.users.update({
                data: {
                    password: hassedNewPassword,
                    password_reset_token: null,
                    reset_token_exp: null
                },
                where: {
                    password_reset_token: resetToken
                }
            })
            return res.json({ newPassword: true, msg: 'Password reset success!' })
        }
    } catch (err: any) {
        console.log('err msg-', err.message, 'err-', err)
        res.status(500).json({ msg: 'err related to database!' })
    }
}