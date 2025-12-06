import { genSaltSync, hashSync, compareSync } from 'bcrypt'
import { client } from '../index.js'
import jwt from 'jsonwebtoken'
import type { Request, Response } from 'express';
import * as Brevo from '@getbrevo/brevo'


const apiInstance = new Brevo.TransactionalEmailsApi()
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!)
const sendSmtpEmail = new Brevo.SendSmtpEmail()

sendSmtpEmail.sender = {
    email: process.env.BREVO_EMAIL!,
    name:process.env.BREVO_NAME!
}


export const signup = async (req: any, res: any) => {
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    const hassedPassword = hashSync(password, 15)

    try {
        await client.query(`INSERT INTO users(name, email, password) VALUES($1, $2, $3);`, [name, email, hassedPassword])
        
        sendSmtpEmail.to=[{email}]
        sendSmtpEmail.subject='Signup Success!'
        sendSmtpEmail.htmlContent='<p>Signup success! Lets login to explore more.</p> <span>Login link-</span><a href="http://localhost:3000/login">login</a>'
        await apiInstance.sendTransacEmail(sendSmtpEmail)

        res.status(201).json({ signedUp: true, msg: 'signup success!' })
    } catch (err: any) {
        console.log('err-', err.message)
        return res.json({ isAlreadySignedUp: true, msg: 'Already signed up with this email' })
    }
}

export async function login(req: any, res: any) {
    const loginData = req.body;

    const queryRes = await client.query(`SELECT * FROM users WHERE email=$1;`, [loginData.email])
    if (queryRes.rowCount === 0) {
        return res.json({ msg: 'Signup first!' })
    } else {
        const isPasswordMatch = compareSync(loginData.password, queryRes.rows[0].password)
        if (isPasswordMatch) {
            const token = jwt.sign({ email: loginData.email }, 'supersecret', { expiresIn: '2h' })
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
        //send email here

    }
}