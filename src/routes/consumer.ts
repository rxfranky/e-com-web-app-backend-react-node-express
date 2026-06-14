import express from 'express'
import type { Router, Request, Response, NextFunction } from 'express'

import {
    fetchProducts,
    addToCart,
    fetchCart,
    quantityControl,
    checkout,
    saveOrder,
    fetchOrders,
    downloadInvoice,
    subscribe,
    getSearchedProduct
} from '../controllers/consumer.js'
import { isAuth } from '../utils/isAuthenticated.js'
import { body, validationResult, query } from 'express-validator'

const router: Router = express.Router()

router.get('/products', fetchProducts, isAuth, fetchProducts)

router.get('/addToCart/:productId', isAuth, addToCart)

router.get('/fetchCart', isAuth, fetchCart)

router.get('/quantityControl/:id', quantityControl)

router.post('/checkout', isAuth, checkout)

router.get('/saveOrder', saveOrder)

router.get('/fetchOrders', isAuth, fetchOrders)

router.get('/downloadInvoice/:orderId', downloadInvoice)

router.post('/subscribe',
    body('email').notEmpty().withMessage('Enter an email address.').bail().isEmail().withMessage('Please enter valid email!'),
    (req: Request, res: Response, next: NextFunction) => {
        const valiRes = validationResult(req)
        if (!valiRes.isEmpty()) {
            return res.json({ invalidInputs: true, valiErrors: valiRes.array() })
        }
        next()
    },
    subscribe
)

router.get('/getSearchedProduct', query('searchText').notEmpty().bail().withMessage('Search field is empty!'), (req: Request, res: Response, next: NextFunction) => {
    const valiRes = validationResult(req)
    if (!valiRes.isEmpty()) {
        return res.json({ invalidInputs: true, valiErrors: valiRes.array() })
    }
    next();
}, getSearchedProduct)

export default router;