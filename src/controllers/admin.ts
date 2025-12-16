import type { Request, Response } from "express";
import cloudnary from 'cloudinary'
import { client } from '../index.js'

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
            const queryRes = await client.query(`SELECT image_id FROM products WHERE id=$1;`, [product_id])
            await client.query(`
                UPDATE products
                SET title=$1, price=$2, image_src=$3, image_id=$4
                WHERE id=$5;
                `, [title, price, uploadResult.url, uploadResult.public_id, product_id]
            )
            await cloudnary.v2.uploader.destroy(queryRes.rows[0].image_id)
            return res.status(200).json({ productEdited: true, msg: 'Product edited success!' })
        }

        const { rows } = await client.query(`SELECT id from users WHERE email=$1;`, [email])
        await client.query(`INSERT INTO products(title, price, image_src, creator, image_id) VALUES($1, $2, $3, $4, $5);`, [title, price, uploadResult.url, rows[0].id, uploadResult.public_id])
        return res.status(200).json({ productAdded: true, msg: 'Product added success!' })
    } catch (err) {
        console.log('err in quering or uploading-', err)
        return res.status(500).json({ msg: 'err related to databese or upload' })
    }
}

export async function deleteProduct(req: any, res: Response) {
    const product_id = +req.params.id

    try {
        const { rows } = await client.query(`SELECT image_id FROM products WHERE id=$1;`, [product_id])
        await cloudnary.v2.uploader.destroy(rows[0].image_id)
        await client.query(`DELETE FROM products WHERE id=$1;`, [product_id])
        return res.status(200).json({ productDeleted: true, msg: 'Product deleted success!' })
    } catch (err) {
        console.log('err in quering or deleting from cloudn-', err)
        res.status(500).json({ msg: 'some trouble with database or cloundn!' })
    }
}