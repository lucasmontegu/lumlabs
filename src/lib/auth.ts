import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance
import { organization, admin, createAccessControl, } from "better-auth/plugins";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        usePlural: true,
    }),
    experimental: { joins: true },
    emailAndPassword: { 
      enabled: true, 
    }, 
    socialProviders: { 
      github: { 
        clientId: process.env.GITHUB_CLIENT_ID as string, 
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
      },
      vercel: { 
        clientId: process.env.VERCEL_CLIENT_ID as string, 
        clientSecret: process.env.VERCEL_CLIENT_SECRET as string, 
      },
      google: { 
        clientId: process.env.GOOGLE_CLIENT_ID as string, 
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
      },
    }, 
    plugins: [
        admin(),
        organization({
          teams: {
            enabled: true,
            maximumTeams: 10, // Optional: limit teams per organization
            allowRemovingAllTeams: false, // Optional: prevent removing the last team
          },
        }),
    ],
});