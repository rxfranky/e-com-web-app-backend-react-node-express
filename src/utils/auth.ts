import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../lib/prisma.js";


export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    baseURL: process.env.BETTER_AUTH_URL!,
    trustedOrigins: [
        "https://e-com-web-app-frontend-node-react-e.vercel.app"
    ],
    advanced: {
        defaultCookieAttributes: {
            sameSite: "none",
            secure: true
        }
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
        google: {
            prompt: "select_account",
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!
        }
    },
    account: {
        additionalFields: {
            passResetToken: {
                type: 'string',
                required: false
            },
            passResetTokenExp: {
                type: 'date',
                required: false
            }
        }
    }
});
