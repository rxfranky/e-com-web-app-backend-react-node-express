import express from 'express'
import type { Router } from 'express'

import { fetchProducts, addToCart, fetchCart, quantityControl, checkout, saveOrder, fetchOrders, downloadInvoice } from '../controllers/consumer.js'
import { isAuth } from '../util/isAuthenticated.js'

const router: Router = express.Router()

router.get('/products', fetchProducts, isAuth, fetchProducts)

router.get('/addToCart/:id', isAuth, addToCart)

router.get('/fetchCart', isAuth, fetchCart)

router.get('/quantityControl/:id', quantityControl)

router.post('/checkout', isAuth, checkout)

router.get('/saveOrder', saveOrder)

router.get('/fetchOrders', isAuth, fetchOrders)

router.get('/downloadInvoice/:orderId', downloadInvoice)

export default router;