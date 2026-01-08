import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { organization, admin } from "better-auth/plugins";
import { createDefaultOrganization } from "@/features/auth/actions/create-default-org";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        usePlural: true,
    }),
    experimental: { joins: true },
    emailAndPassword: {
      enabled: true,
    },
    // Only Google for login - GitHub/GitLab/Bitbucket are for connecting repos
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            // Create a default organization for the new user
            await createDefaultOrganization({
              userId: user.id,
              userName: user.name,
            });
          },
        },
      },
    },
    plugins: [
        admin(),
        organization({
          teams: {
            enabled: true,
            maximumTeams: 10,
            allowRemovingAllTeams: false,
          },
        }),
    ],
});