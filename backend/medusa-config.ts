import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Stripe is the only way to pay (no PayPal: see the storefront README). The
// provider refuses to start without a key, so it is registered only once the
// secret key is on THIS service (medusa-backend, not the storefront); until
// then the backend boots as before. STRIPE_SECRET_KEY is the name every other
// service on the account uses; STRIPE_API_KEY is Medusa's own, also accepted.
const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY

// capture: true takes the money when the order is placed. Left manual, every
// order would need capturing in Admin within Stripe's seven-day authorization
// window or be lost.
const stripeProvider = stripeKey
  ? [{
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: stripeKey,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              capture: true,
            },
          },
        ],
      },
    }]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "./src/modules/waitlist",
    },
    ...stripeProvider,
  ],
})
