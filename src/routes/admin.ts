import * as express from 'express'
import type { Router } from 'express'
import { isAuth } from '../util/isAuthenticated.js'
import { body, validationResult } from 'express-validator'
import multer from 'multer'

import { addProduct, deleteProduct } from '../controllers/admin.js'

const router: Router = express.Router()


function fileFilter(req: any, file: any, cb: any) {
    if (file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true)
    } else {
        cb(null, false)
    }
}
const upload = multer(
    {
        fileFilter: fileFilter
    }
)

router.post('/addProduct', upload.single('image'), body('title').notEmpty().bail().withMessage('Please enter title!'), body('description').notEmpty().bail().withMessage('Please enter description'), body('price').notEmpty().bail().withMessage('Please enter price').custom((val) => {
    return +val > 0
}).withMessage('Price must be greater than 0!'), (req, res, next) => {
    const result = validationResult(req)
    if (!result.isEmpty()) {
        return res.json({ invalidInputs: true, valiErrors: result.array() })
    }
    next()
}, (req, res, next) => {
    if (!req.file) {
        return res.json({ invalidInputs: true, valiErrors: [{ msg: 'Please select image' }] })
    }
    next()
}, isAuth, addProduct)

router.delete('/deleteProduct/:id', isAuth, deleteProduct)


export default router;