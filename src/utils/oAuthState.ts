import type { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";


export default async function oAuthState(req: any, res: Response, next: NextFunction) {
    const authToken = req.headers.authtoken?.toString().split(" ")[1];
    const oAuthToken = req.headers.oauthtoken?.toString().split(" ")[1];

    if (req.url === "/api/auth/get-session") {
        return next();
    }

    if (req.url === "/api/auth/sign-out") {
        return next();
    }

    function notAuthenticated() {
        return ((!authToken && !oAuthToken) ||
            (authToken.trim().toLowerCase() === "null" && !oAuthToken) ||
            (oAuthToken.trim().toLowerCase() === "undefined" && !authToken) ||
            (authToken.trim().toLowerCase() === "null" && oAuthToken.trim().toLowerCase() === "undefined")
        )
    }

    if (notAuthenticated()) {
        return next();
    }

    if (oAuthToken && oAuthToken !== "undefined" && req.url === "/api/auth/sign-in/social") {
        return res.status(400).json({ msg: "You are already Loggedin!" })
    }

    try {
        if (authToken && authToken.trim().toLowerCase() !== "null") {
            jwt.verify(authToken, process.env.JWT_KEY!);
        }
        try {
            const queryRes = await prisma.authState.findUnique({
                where: {
                    token: authToken,
                },
            })
            if (queryRes) {
                return res.status(400).json({ msg: "You are already Loggedin!" })
            } else {
                return next();
            }
        } catch (err: any) {
            console.log("err in quering authState for oAuth-", err.message);
            return res.status(500).json({ msg: "err related to db query!" });
        }
    } catch (err: any) {
        try {
            await prisma.authState.delete({
                where: {
                    token: authToken,
                },
            });
            return next();
        } catch (err: any) {
            if (err.message.trim().toLowerCase().includes('no record was found for a delete')) {
                return res.status(400).json({ msg: 'Invalid token!' })
            }
            console.log("err in quering db-", err);
            return res.status(500).json({ msg: "err related to db!" });
        }
    }
}
