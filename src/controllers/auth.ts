import { genSaltSync, hashSync, compareSync } from 'bcrypt'
import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken'
import type { Request, Response } from 'express';
import * as Brevo from '@getbrevo/brevo'
import crypto from 'node:crypto'


export const apiInstance = new Brevo.TransactionalEmailsApi()
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!)
export const sendSmtpEmail = new Brevo.SendSmtpEmail()

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
        const idForUser = crypto.randomBytes(20).toString('hex')

        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })
        let userId = user?.id;
        if (!user) {
            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    id: idForUser
                }
            })
            userId = user.id
        }

        const idForAcc = crypto.randomBytes(20).toString('hex')
        const accId = crypto.randomBytes(20).toString('hex')

        const queryRes = await prisma.account.findFirst({
            where: {
                user: {
                    email
                },
                providerId: 'email&Pass'
            }
        })

        if (queryRes) {
            return res.json({ isAlreadySignedUp: true, msg: 'Already signed up with this email!' })
        }

        await prisma.account.create({
            data: {
                id: idForAcc,
                accountId: accId,
                providerId: 'email&Pass',
                userId: userId!,
                password: hassedPassword
            }
        })

        sendSmtpEmail.to = [{ email }]
        sendSmtpEmail.subject = 'Signup Success!'
        sendSmtpEmail.htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; text-align: center;">
    
    <h1 style="color: rgb(14, 52, 90); margin-bottom: 16px;">
        🎉 Signup Successful!
    </h1>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Your account has been created successfully.
        Login now and start exploring our store.
    </p>

    <a
        href="https://e-com-web-app-frontend-node-react-e.vercel.app/auth"
        style="
            display: inline-block;
            background: rgb(14, 52, 90);
            color: #ffffff;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 999px;
            font-weight: 600;
        "
    >
        Login to Your Account
    </a>

    <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
        If the button doesn't work, copy and paste this link into your browser:
    </p>

    <p style="word-break: break-all; color: #2563eb; font-size: 14px;">
        https://e-com-web-app-frontend-node-react-e.vercel.app/login
    </p>

</div>
`;
        await apiInstance.sendTransacEmail(sendSmtpEmail)

        return res.status(201).json({ signedUp: true, msg: 'Signup success!' })
    } catch (err: any) {
        console.log('err in signup-', err.message)
        return res.status(500).json({ msg: 'err related to database or email!' })
    }
}

export async function login(req: any, res: any) {
    const authToken = req.headers.authtoken?.split(' ')[1]
    const oAuthToken = req.headers.oauthtoken?.split(' ')[1]
    const loginData = req.body;

    try {
        const queryRes = await prisma.authState.findUnique({
            where: {
                token: authToken
            }
        })

        if (queryRes || oAuthToken?.trim().toLowerCase() !== 'undefined'
        ) {
            return res.status(200).json({ isAlreadyLoggedIn: true, msg: 'Already logged in!' })
        }

        const queryRes2 = await prisma.account.findFirst({
            where: {
                user: {
                    email: loginData.email
                },
                providerId: 'email&Pass'
            },
            select: {
                password: true,
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })
        if (!queryRes2) {
            return res.status(400).json({ msg: 'Signup first!' })
        }

        const isPasswordMatch = compareSync(loginData.password, queryRes2?.password!)
        if (isPasswordMatch) {
            const jwtKey = process.env.JWT_KEY!
            const token = jwt.sign({ email: loginData.email }, jwtKey, { expiresIn: '2h' })

            const queryRes3 = await prisma.authState.updateMany({
                where: {
                    user: {
                        email: loginData.email
                    }
                },
                data: {
                    token
                }
            })
            await prisma.session.deleteMany({
                where: {
                    user: {
                        email: loginData.email
                    }
                }
            })
            if (queryRes3.count === 0) {
                await prisma.authState.create({
                    data: {
                        token,
                        userId: queryRes2.user.id
                    }
                })
            }
            return res.status(200).json({ msg: 'Login Success! redirecting...', authToken: token, email: loginData.email, name: queryRes2.user.name })
        }
        return res.status(401).json({ msg: 'Incorrect password entered!' })
    } catch (err: any) {
        console.log('err rel to db- ', err)
        return res.status(500).json({ msg: 'Some problem related to database' })
    }
}


export const changePassword = async (req: any, res: any) => {
    const decodedToken = req.decodedToken

    if (!decodedToken) {
        return res.status(200).json({ oAuthLoggedIn: true, msg: "Request could'nt complete because logged in with oauth or Login again!" })
    }

    const email = decodedToken.email
    const oldPassword = req.body.oldPassword
    const newPassword = req.body.newPassword

    const salt = genSaltSync(15)
    const hassedNewPassword = hashSync(newPassword, salt)
    try {
        const queryRes = await prisma.account.findFirst({
            select: {
                password: true
            },
            where: {
                user: {
                    email
                },
                providerId: 'email&Pass'
            }
        })
        if (!queryRes) {
            return res.json({ notSignedUp: true, msg: 'Signup first!' })
        } else {
            const isPasswordMatch = compareSync(oldPassword, queryRes?.password!)
            if (isPasswordMatch) {
                await prisma.account.updateMany({
                    data: {
                        password: hassedNewPassword
                    },
                    where: {
                        user: {
                            email,
                        },
                        providerId: 'email&Pass'
                    }
                })
                return res.json({ passwordChanged: true, msg: 'Password changed success!' })
            } else {
                return res.json({ wrongOldPassword: true, msg: 'Incorrect old password!' })
            }
        }
    } catch (err) {
        console.log('err in quering-', err)
        return res.status(500).json({ msg: 'Some problem related to database!' })
    }
}


export async function postResetPassword(req: Request, res: Response) {
    const email = req.body.email;

    const queryRes = await prisma.account.findFirst({
        select: {
            user: {
                select: {
                    email: true
                }
            }
        },
        where: {
            user: {
                email
            },
            providerId: 'email&Pass'
        }
    })
    if (!queryRes) {
        return res.json({ notSignedUp: true, msg: 'Signup first!' })
    } else {
        const token = crypto.randomBytes(20).toString('hex')
        const tokenExp = new Date()
        tokenExp.setHours(tokenExp.getHours() + 2)
        try {
            await prisma.account.updateMany({
                data: {
                    passResetToken: token,
                    passResetTokenExp: tokenExp
                },
                where: {
                    user: {
                        email
                    },
                    providerId: 'email&Pass'
                }
            })
            sendSmtpEmail.to = [{ email }]
            sendSmtpEmail.subject = 'Reset Password'
            sendSmtpEmail.htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; text-align: center;">

    <h1 style="color: rgb(14, 52, 90); margin-bottom: 16px;">
        🔒 Password Reset Request
    </h1>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        We received a request to reset your password.
        Click the button below to create a new password.
    </p>

    <a
        href="https://e-com-web-app-frontend-node-react-e.vercel.app/auth/newPassword/?token=${token}"
        style="
            display: inline-block;
            background: rgb(14, 52, 90);
            color: #ffffff;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 999px;
            font-weight: 600;
        "
    >
        Reset Password
    </a>

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        This link may expire after some time for security reasons.
    </p>

    <p style="color: #6b7280; font-size: 14px;">
        If you didn't request a password reset, you can safely ignore this email.
    </p>

    <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
        Or copy and paste this link into your browser:
    </p>

    <p style="word-break: break-all; color: #2563eb; font-size: 14px;">
        https://e-com-web-app-frontend-node-react-e.vercel.app/auth/newPassword/?token=${token}
    </p>

</div>
`;
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

    if (!resetToken) {
        return res.status(400).json({ msg: 'Invalid password reset token!' })
    }

    const hassedNewPassword = hashSync(newPassword, 15)
    try {
        const queryRes = await prisma.account.findFirst({
            select: {
                passResetTokenExp: true
            },
            where: {
                passResetToken: resetToken
            }
        })

        if (queryRes === null) {
            return res.status(401).json({ msg: 'Invalid password reset token!' })
        }
        const now = new Date()
        if (queryRes.passResetTokenExp! < now) {
            return res.status(401).json({ msg: 'Token has expired, Reset again!' })
        }
        await prisma.account.updateMany({
            data: {
                password: hassedNewPassword,
                passResetToken: null,
                passResetTokenExp: null
            },
            where: {
                passResetToken: resetToken
            }
        })
        return res.json({ newPassword: true, msg: 'Password reset success!' })
    } catch (err: any) {
        console.log('err msg-', err.message, 'err-', err)
        res.status(500).json({ msg: 'err related to database!' })
    }
}


export async function getAuthState(req: any, res: Response) {
    const authToken = req.headers.authorization?.toString().split(' ')[1];

    if (!authToken || authToken.trim().toLowerCase() === 'null') {
        return res.status(200).json({ isLoggedIn: false })
    }

    try {
        if (authToken.trim().toLowerCase() !== 'null') {
            jwt.verify(authToken, process.env.JWT_KEY!)
        }
    } catch (err: any) {
        return res.status(200).json({ msg: 'Please login again!', isLoggedIn: true })
    }

    const queryRes = await prisma.authState.findFirst({
        where: {
            token: authToken
        },
        select: {
            user: {
                select: {
                    name: true,
                    email: true
                }
            }
        }
    })

    if (!queryRes) {
        return res.status(200).json({ isLoggedIn: false })
    }
    return res.status(200).json({ isLoggedIn: true, userData: queryRes?.user })
}


export async function logout(req: any, res: Response) {
    const authToken = req.headers.authorization?.split(' ')[1];

    if (!authToken || authToken.trim().toLowerCase() === 'null') {
        return res.status(400).json({ isLoggedIn: false })
    }

    try {
        await prisma.authState.delete({
            where: {
                token: authToken
            }
        })
        return res.status(200).json({ logoutSuccess: true })
    } catch (err: any) {
        console.log('err in quering for logout- ', err.message)
        if (err.message.trim().toLowerCase().includes('no record was found')) {
            return res.status(200).json({ logoutSuccess: true })
        }
        return res.status(500).json({ msg: 'err related to db!' })
    }
}