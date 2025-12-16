import type { Request, Response } from "express";
import { client } from '../index.js'
import stripe from 'stripe'
import PDFDocument from 'pdfkit'
import fs from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'url'

const _filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(_filename)

const doc = new PDFDocument()
const stripeIns = new stripe(process.env.STRIPE_API!)

export async function fetchProducts(req: any, res: Response, next: any) {
    const page = +req.query.page!;
    const isAdmin: any = req.query.isAdmin!
    const email = req.decodedToken ? req.decodedToken.email : null

    let skip = 0
    if (page > 1) {
        skip = (page - 1) * 3
    }

    let query = `SELECT * FROM products OFFSET $1 LIMIT $2;`
    let params = [skip, 3]
    let query_2 = `SELECT COUNT(*) FROM products;`
    let params_2: any = []

    if (isAdmin.toLowerCase().trim() === 'true' && !req.decodedToken) {
        return next()
    }

    if (isAdmin.toLowerCase().trim() === 'true') {
        query = `
        SELECT products.id, products.title, products.image_src, products.price FROM products
        JOIN users ON users.id=products.creator
        WHERE email=$3
        OFFSET $1 LIMIT $2;`
        params = [skip, 3, email]

        query_2 = `SELECT COUNT(*) FROM products
        JOIN users ON users.id=products.creator
        WHERE email=$1;`
        params_2 = [email]
    }

    try {
        const queryRes = await client.query(query_2, params_2)
        const totalProducts = +queryRes.rows[0].count
        let isLastPage = false;
        if (totalProducts <= (page * 3)) {
            isLastPage = true
        }
        const { rows } = await client.query(query, params)
        return res.status(200).json({ products: rows, isLastPage })
    } catch (err) {
        console.log('err came in quering-', err)
        res.status(500).json({ msg: 'err related to database' })
    }
}

export async function addToCart(req: any, res: Response) {
    const id = +req.params.id;
    const email = req.decodedToken.email!

    try {
        const queryRes_2 = await client.query(`SELECT id FROM users WHERE email=$1;`, [email])

        const queryRes = await client.query(`SELECT quantity from cart WHERE product=$1 AND consumer=$2;`, [id, queryRes_2.rows[0].id])

        if (queryRes.rowCount === 0) {
            await client.query(`INSERT INTO cart(product, consumer) VAlUES($1, $2)`, [id, queryRes_2.rows[0].id])
            return res.status(200).json({ addedToCart: true, msg: 'Added in cart success!' })
        } else {
            const updatedQuantity = queryRes.rows[0].quantity + 1;
            await client.query(`UPDATE cart SET quantity=$1 WHERE consumer=$2 AND product=$3;`, [updatedQuantity, queryRes_2.rows[0].id, id])
            return res.status(200).json({ quantityInc: true, msg: 'Quantity increased success!' })
        }
    } catch (err) {
        console.log('err in quering-', err)
        return res.status(500).json({ msg: 'err related to database' })
    }
}

export async function fetchCart(req: any, res: Response) {
    const email = req.decodedToken.email;

    try {
        // `SELECT title, price, quntity, image_src FROM cart JOIN users WHERE cart.consumer=users.id AND JOIN products WHERE cart.product=products.id WHERE users.email=$1;`
        // const queryRes = await client.query(`SELECT id FROM users WHERE email=$1;`, [email])
        const queryRes_2 = await client.query(`
            SELECT 
            products.title,
            products.price,
            cart.quantity,
            cart.id,
            cart.consumer AS users_id,
            products.id AS product_id,
            products.image_src
            FROM cart
            JOIN users ON cart.consumer = users.id
            JOIN products ON cart.product = products.id
            WHERE users.email = $1;`, [email])

        if (queryRes_2.rowCount === 0) {
            return res.json({ cartIsEmpty: true, msg: 'Cart is Empty!' })
        }
        return res.status(200).json({ cart: queryRes_2.rows })
    } catch (err) {
        console.log('err in quering-', err)
        return res.status(500).json({ msg: 'err related to detabase' })
    }
}

export async function quantityControl(req: Request, res: Response) {
    const id = +req.params.id!
    const action = req.query.action

    try {
        if (action === 'dec') {
            await client.query(`UPDATE cart SET quantity=GREATEST(quantity-$1, $3) WHERE id=$2;`, [1, id, 1])
            return res.status(200).json({ quanDec: true, msg: 'Quantity decreased success!' })
        }
        if (action === 'inc') {
            await client.query(`UPDATE cart SET quantity=quantity+$1 WHERE id=$2;`, [1, id])
            return res.json({ quanInc: true, msg: 'Quantity increased success!' })
        }
        if (action === 'delete') {
            await client.query(`DELETE FROM cart WHERE id=$1;`, [id])
            return res.json({ deleted: true, msg: 'Deleted from cart success!' })
        }
    } catch (err) {
        console.log('err in quering-', err)
    }
}

export async function checkout(req: any, res: Response) {
    const cart = req.body.cart;
    const product = req.body.product;
    const email = req.decodedToken.email

    let queryParam = `?cart=${JSON.stringify(cart)}`
    let price = 0

    if (cart) {
        cart.forEach((element: any) => {
            price = price + ((+element.price) * element.quantity)
        });
    }

    if (product) {
        price = +product.price
        queryParam = `?product=${JSON.stringify(product)}&email=${email}`
    }

    try {
        const session = await stripeIns.checkout.sessions.create(
            {
                line_items: [
                    {
                        price_data: {
                            currency: 'USD',
                            unit_amount: price * 100,
                            product_data: {
                                name: 'Order Total'
                            }
                        },
                        quantity: 1
                    }
                ],
                mode: "payment",
                allow_promotion_codes: true,
                success_url: `http://localhost:3000/consumer/saveOrder${queryParam}&orderId={CHECKOUT_SESSION_ID}`
            }
        )
        return res.status(200).json({ checkoutPage: session.url, msg: 'Checkout session created' })
    } catch (err) {
        console.log('err is creating checkout session-', err)
        return res.status(500).json({ msg: 'err related to stripe checkout' })
    }
}

export async function saveOrder(req: Request, res: Response) {
    const cart: any = req.query.cart;
    const parsedCart = cart ? JSON.parse(cart) : null

    const orderId = req.query.orderId;

    const product: any = req.query.product
    const parsedProduct = product ? JSON.parse(product) : null

    const email = req.query.email

    try {
        if (parsedCart) {
            parsedCart.forEach(async (val: any) => {
                await client.query(`
                    INSERT INTO orders(product, quantity, order_id, consumer)
                    VALUES($1, $2, $3, $4);    
                    `, [val.product_id, val.quantity, orderId, val.users_id]
                )
            })
            await client.query(`DELETE FROM cart WHERE consumer=$1`, [parsedCart[0].users_id])
        }
        if (parsedProduct) {
            const queryRes = await client.query(`SELECT id FROM users WHERE email=$1;`, [email])
            await client.query(`
                    INSERT INTO orders(product, quantity, order_id, consumer)
                    VALUES($1, $2, $3, $4);    
                    `, [parsedProduct.id, 1, orderId, queryRes.rows[0].id]
            )
        }
        try {
            const { rows } = await client.query(`
            SELECT orders.quantity, products.title, products.price, users.name, users.email FROM orders 
            JOIN users ON users.id=orders.consumer
            JOIN products ON products.id=orders.product
            WHERE order_id=$1;
            `, [orderId]
            )
            // let y = 40
            // rows.forEach((val: any) => {
            //     y += 70
            //     doc.text(val.title, 20, y)
            //     doc.text((val.quantity).toString(), 100, y)
            //     doc.text('*', 150, y)
            //     doc.text(val.price, 190, y)
            //     doc.text(`${(val.quantity * (+val.price))}`, 350, y)
            // })
            // let netAmount = 0;
            // rows.forEach((val: any) => {
            //     netAmount = netAmount + (+val.price * val.quantity)
            // });
            // doc.text(netAmount.toString(), 350, y + 200)

            // Header (pdf invoice design generated by claude!!!)
            const invoicePath = path.join(__dirname, '..', 'invoices', `${orderId}.pdf`)
            const stream = fs.createWriteStream(invoicePath)
            doc.pipe(stream)

            doc.fontSize(20).text('INVOICE', 250, 40, { align: 'center' })
            doc.fontSize(10).moveDown()
            // Table header
            const tableTop = 150
            doc.fontSize(12).fillColor('#444')
                .text('Product', 50, tableTop)
                .text('Qty', 250, tableTop)
                .text('Price', 320, tableTop)
                .text('Total', 420, tableTop)

            doc.fontSize(10).text(`Customer: ${rows[0].name}`, 50, 100)
                .text(`Email: ${rows[0].email}`, 50, 115)
            // Line under header
            doc.moveTo(50, tableTop + 20)
                .lineTo(500, tableTop + 20)
                .stroke()
            // Table rows
            let y = tableTop + 40
            doc.fontSize(10).fillColor('#000')

            rows.forEach((val: any) => {
                doc.text(val.title, 50, y, { width: 180 })
                    .text(val.quantity.toString(), 250, y)
                    .text(`$${val.price}`, 320, y)
                    .text(`$${(val.quantity * (+val.price)).toFixed(2)}`, 420, y)
                y += 30
            })
            // Total section
            y += 20
            doc.moveTo(320, y).lineTo(500, y).stroke()
            y += 20

            let netAmount = rows.reduce((sum: number, val: any) =>
                sum + (+val.price * val.quantity), 0
            )

            doc.fontSize(12).fillColor('#444')
                .text('Net Amount:', 320, y)
                .fontSize(14).fillColor('#000')
                .text(`$${netAmount.toFixed(2)}`, 420, y)

            doc.end()
            stream.on('finish', () => {
                return res.status(302).redirect('http://localhost:5173/orders')
            })
            stream.on('error', (err) => {
                console.log('stream error-', err)
                res.status(500).json({ msg: 'err related to generating invoice' })
            })
        } catch (err) {
            console.log('err in quering-', err)
            res.status(500).json({ msg: 'err related to database' })
        }
    } catch (err) {
        console.log('err in quering-', err)
        res.status(500).json({ msg: 'err related to database' })
    }
}

export async function fetchOrders(req: any, res: Response) {
    const email = req.decodedToken.email;

    try {
        const queryRes = await client.query(`
            SELECT order_id FROM orders 
            JOIN users ON users.id=orders.consumer
            WHERE users.email=$1
            GROUP BY order_id;
            `, [email]
        )
        if (queryRes.rowCount === 0) {
            return res.status(200).json({ noOrders: true, msg: 'No any Orders' })
        }
        return res.status(200).json({ orders: queryRes.rows })
    } catch (err) {
        console.log('err in quering-', err)
        res.status(500).json({ msg: 'err related to database' })
    }
}

export async function downloadInvoice(req: Request, res: Response) {
    const fileName = req.params.orderId + '.pdf'
    const invoicePath = path.join(__dirname, '..', 'invoices', fileName)
    res.download(invoicePath)
}