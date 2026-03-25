import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import stripe from 'stripe'
import PDFDocument from 'pdfkit'


const stripeIns = new stripe(process.env.STRIPE_API!)

export async function fetchProducts(req: any, res: Response, next: any) {
    const page = +req.query.page!;
    const isAdmin: any = req.query.isAdmin!
    const email = req.decodedToken ? req.decodedToken.email : null

    let skip = 0
    if (page > 1) {
        skip = (page - 1) * 8
    }

    let query: any = {
        skip,
        take: 8
    }
    let query_2: any = ''

    if (isAdmin.toLowerCase().trim() === 'true' && !req.decodedToken) {
        return next()
    }

    if (isAdmin.toLowerCase().trim() === 'true') {
        query = {
            select: {
                id: true,
                title: true,
                image_src: true,
                price: true
            },
            skip,
            take: 8,
            where: {
                users: {
                    email
                }
            }
        }

        query_2 = {
            where: {
                users: {
                    email
                }
            }
        }
    }

    if (isAdmin.toLowerCase().trim() === 'false' && !page) {
        query = ''
    }

    try {
        const productCount = await prisma.products.count(query_2)
        let isLastPage = false;
        if (productCount <= (page * 8)) {
            isLastPage = true
        }
        const products = await prisma.products.findMany(query)
        return res.status(200).json({ products, isLastPage })
    } catch (err) {
        console.log('err came in quering-', err)
        res.status(500).json({ msg: 'err related to database' })
    }
}

export async function addToCart(req: any, res: Response) {
    const id = +req.params.id;
    const email = req.decodedToken.email!

    try {
        const queryRes = await prisma.users.findUniqueOrThrow({
            select: {
                id: true
            },
            where: {
                email
            }
        })

        const queryRes2 = await prisma.cart.findFirst({
            select: {
                quantity: true
            },
            where: {
                product: id,
                consumer: queryRes.id
            }
        })

        if (queryRes2 === null) {
            await prisma.cart.create({
                data: {
                    product: id,
                    consumer: queryRes.id
                }
            })
            return res.status(200).json({ addedToCart: true, msg: 'Added in cart success!' })
        } else {
            const updatedQuantity = queryRes2.quantity + 1;
            await prisma.cart.updateMany({
                data: {
                    quantity: updatedQuantity
                },
                where: {
                    AND: [
                        { consumer: queryRes.id },
                        { product: id }
                    ]
                }
            })
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
        const queryRes = await prisma.cart.findMany({
            select: {
                id: true,
                quantity: true,
                consumer: true,
                products: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        image_src: true
                    }
                }
            },
            where: {
                users: {
                    email
                }
            }
        })

        if (queryRes.length === 0) {
            return res.status(200).json({ cartIsEmpty: true, msg: 'Cart is Empty!' })
        } ``
        return res.status(200).json({ cart: queryRes })
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
            // await client.query(`UPDATE cart SET quantity=GREATEST(quantity-$1, $3) WHERE id=$2;`, [1, id, 1])
            await prisma.cart.update({
                data: {
                    quantity: {
                        decrement: 1
                    }
                },
                where: {
                    id
                }
            })
            return res.status(200).json({ quanDec: true, msg: 'Quantity decreased success!' })
        }
        if (action === 'inc') {
            await prisma.cart.update({
                data: {
                    quantity: {
                        increment: 1
                    }
                },
                where: {
                    id
                }
            })
            return res.json({ quanInc: true, msg: 'Quantity increased success!' })
        }
        if (action === 'delete') {
            await prisma.cart.delete({
                where: {
                    id
                }
            })
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
            price = price + ((+element.products.price) * element.quantity)
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
                success_url: `https://e-com-practice-backend.onrender.com/consumer/saveOrder${queryParam}&orderId={CHECKOUT_SESSION_ID}`
            }
        )
        return res.status(200).json({ checkoutPage: session.url, msg: 'Checkout session created' })
    } catch (err) {
        console.log('err is creating checkout session-', err)
        return res.status(500).json({ msg: 'err related to stripe checkout' })
    }
}

export async function saveOrder(
    req: Request<{}, {}, {}, {
        orderId: string;
        cart?: any;
        product?: any;
        email?: string
    }>,
    res: Response
) {
    const cart: any = req.query.cart;
    const parsedCart = cart ? JSON.parse(cart) : null

    const orderId = req.query.orderId;

    const product: any = req.query.product
    const parsedProduct = product ? JSON.parse(product) : null

    const email = req.query.email

    try {
        if (parsedCart) {
            parsedCart.forEach(async (val: any) => {
                await prisma.orders.create({
                    data: {
                        product: val.products.id,
                        quantity: val.quantity,
                        consumer: val.consumer,
                        order_id: orderId
                    }
                })
            })
            await prisma.cart.deleteMany({
                where: {
                    consumer: parsedCart[0].consumer
                }
            })
        }
        if (parsedProduct && email) {
            const queryRes = await prisma.users.findUnique({
                where: {
                    email
                },
                select: {
                    id: true
                }
            })
            await prisma.orders.create({
                data: {
                    product: parsedProduct.id,
                    quantity: 1,
                    order_id: orderId,
                    consumer: queryRes?.id!
                }
            })
        }
        return res.status(302).redirect('https://e-com-web-app-frontend-node-react-e.vercel.app/orders')
    } catch (err) {
        console.log('err in quering-', err)
        res.status(500).json({ msg: 'err related to database' })
    }
}

export async function fetchOrders(req: any, res: Response) {
    const email = req.decodedToken.email;

    try {
        const queryRes = await prisma.orders.groupBy({
            by: ['order_id'],
            where: {
                users: {
                    email
                }
            },

        })
        if (queryRes.length === 0) {
            return res.status(200).json({ noOrders: true, msg: 'No any Orders' })
        }
        return res.status(200).json({ orders: queryRes })
    } catch (err) {
        console.log('err in quering-', err)
        res.status(500).json({ msg: 'err related to database' })
    }
}

export async function downloadInvoice(req: Request, res: Response) {
    const orderId = req.params.orderId

    try {
        const queryRes = await prisma.orders.findMany({
            select: {
                quantity: true,
                users: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                products: {
                    select: {
                        title: true,
                        price: true
                    }
                }
            },
            where: {
                order_id: orderId!
            }
        })
        // ✅ CREATE NEW DOC EVERY TIME
        const doc = new PDFDocument();
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`)
        // Pipe directly to response (no file)
        doc.pipe(res)

        doc.fontSize(20).text('INVOICE', 250, 40, { align: 'center' })
        doc.fontSize(10).moveDown()
        // Table header
        const tableTop = 150
        doc.fontSize(12).fillColor('#444')
            .text('Product', 50, tableTop)
            .text('Qty', 250, tableTop)
            .text('Price', 320, tableTop)
            .text('Total', 420, tableTop)

        doc.fontSize(10).text(`Customer: ${queryRes[0]?.users.name}`, 50, 100)
            .text(`Email: ${queryRes[0]?.users.email}`, 50, 115)
        // Line under header
        doc.moveTo(50, tableTop + 20)
            .lineTo(500, tableTop + 20)
            .stroke()
        // Table rows
        let y = tableTop + 40
        doc.fontSize(10).fillColor('#000')

        queryRes.forEach((val: any) => {
            doc.text(val.products.title, 50, y, { width: 180 })
                .text(val.quantity.toString(), 250, y)
                .text(`$${val.products.price}`, 320, y)
                .text(`$${(val.quantity * (+val.products.price)).toFixed(2)}`, 420, y)
            y += 30
        })
        // Total section
        y += 20
        doc.moveTo(320, y).lineTo(500, y).stroke()
        y += 20

        let netAmount = queryRes.reduce((sum: number, val: any) =>
            sum + (+val.products.price * val.quantity), 0
        )

        doc.fontSize(12).fillColor('#444')
            .text('Net Amount:', 320, y)
            .fontSize(14).fillColor('#000')
            .text(`$${netAmount.toFixed(2)}`, 420, y)

        doc.end();
        return;
    } catch (err) {
        console.log('err in quering-', err)
        res.status(500).json({ msg: 'err related to database' })
    }
}