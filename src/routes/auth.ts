import express from 'express'

import { body, validationResult } from 'express-validator'

import { signup } from "../controllers/auth.js";
import { login } from '../controllers/auth.js';
import { isAuth } from '../util/isAuthenticated.js';
import { changePassword } from '../controllers/auth.js';

const router = express.Router()

router.post('/signup', body('email').notEmpty().bail().withMessage('Please Enter email!').isEmail().withMessage('Please Enter valid email!'), body('name').notEmpty().bail().withMessage('Please enter name!').isLength({ max: 55 }).bail().withMessage('Name can be max 55 chars!'), body('password').notEmpty().bail().withMessage('Please enter password!').isLength({ max: 18, min: 4 }).withMessage('password must between 4 to 18 chars!'), body('confirmPassword').notEmpty().bail().withMessage('Please enter confirm-password!').custom((val, { req }) => {
    return val === req.body.password
}).withMessage('Password and confirm-password must match!'), (req, res, next) => {
    const result = validationResult(req)
    if (!result.isEmpty()) {
        return res.json({ invalidInputs: true, valiErrors: result.array() })
    }
    next()
}, signup)

router.post('/login', body('password').notEmpty().bail().withMessage('Please enter password!'), body('email').notEmpty().bail().withMessage('Please enter email!').isEmail().bail().withMessage('Please enter valid email!'), (req, res, next) => {
    const result = validationResult(req)
    if (!result.isEmpty()) {
        return res.json({ invalidInputs: true, valiErrors: result.array() })
    }
    next()
}, login)


router.patch('/changePassword', body('oldPassword').notEmpty().bail().withMessage('Please enter old password!'), body('newPassword').notEmpty().bail().withMessage('Please enter new password!'), body('newConfirmPassword').notEmpty().bail().withMessage('Please enter new confirm password!').custom((val, { req }) => {
    return val === req.body.newPassword
}).withMessage('new password and new confirm-password must match!'), (req, res, next) => {
    const result = validationResult(req)
    if (!result.isEmpty()) {
        return res.json({ invalidInputs: true, valiErrors: result.array() })
    }
    next()
}, isAuth, changePassword)


router.post('/resetPassword', body('email').notEmpty().bail().withMessage('Please enter email!').isEmail().bail().withMessage('Please enter valid email!'), (req, res, next) => {
    const result = validationResult(req)
    if (!result.isEmpty()) {
        return res.json({ invalidInputs: true, valiErrors: result.array() })
    }
    next()
})

export default router;
