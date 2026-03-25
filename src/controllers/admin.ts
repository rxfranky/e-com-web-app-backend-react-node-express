import type { Response } from "express";
import cloudnary from 'cloudinary'
import prisma from "../lib/prisma.js";

cloudnary.v2.config(
    {
        api_key: process.env.CLOUD_API_KEY!,
        api_secret: process.env.CLOUD_API_SECRET!,
        cloud_name: process.env.CLOUD_NAME!
    }
)

export async function addProduct(req: any, res: Response) {
    const title = req.body.title;
    const price = +req.body.price;
    const email = req.decodedToken.email;
    const product_id = +req.query.product_id

    try {
        const uploadResult: any = await new Promise((resolve, reject) => {
            cloudnary.v2.uploader.upload_stream((error, uploadResult) => {
                if (error) {
                    return reject(error)
                }
                if (uploadResult) {
                    return resolve(uploadResult)
                }
            }).end(req.file?.buffer)
        })

        if (product_id) {
            const queryRes = await prisma.products.findUniqueOrThrow({
                select: {
                    image_id: true
                },
                where: {
                    id: product_id
                }
            })

            await prisma.products.update({
                data: {
                    title,
                    price,
                    image_src: uploadResult.url,
                    image_id: uploadResult.public_id
                },
                where: {
                    id: product_id
                }
            })
            await cloudnary.v2.uploader.destroy(queryRes.image_id)
            return res.status(200).json({ productEdited: true, msg: 'Product edited success!' })
        }

        const queryRes2 = await prisma.users.findUniqueOrThrow({
            select: { id: true },
            where: { email }
        })

        await prisma.products.create({
            data: {
                title,
                price,
                image_src: uploadResult.url,
                creator: queryRes2.id,
                image_id: uploadResult.public_id
            }
        })
        return res.status(200).json({ productAdded: true, msg: 'Product added success!' })
    } catch (err) {
        console.log('err in quering or uploading-', err)
        return res.status(500).json({ msg: 'err related to databese or upload' })
    }
}

export async function deleteProduct(req: any, res: Response) {
    const product_id = +req.params.id

    try {
        const queryRes = await prisma.products.findUniqueOrThrow({
            select: {
                image_id: true
            },
            where: {
                id: product_id
            }
        })

        await cloudnary.v2.uploader.destroy(queryRes.image_id)
        await prisma.products.delete({
            where: {
                id: product_id
            }
        })
        return res.status(200).json({ productDeleted: true, msg: 'Product deleted success!' })
    } catch (err) {
        console.log('err in quering or deleting from cloudn-', err)
        res.status(500).json({ msg: 'some trouble with database or cloundn!' })
    }
}