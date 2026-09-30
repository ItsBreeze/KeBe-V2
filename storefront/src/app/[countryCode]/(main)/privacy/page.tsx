import { Metadata } from "next"
import { CONTACT_EMAIL } from "@lib/constants"

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What KeBe collects, why, where it is stored, and how to have it deleted.",
}



// Last substantive change to this notice. Update it whenever the content changes.
const LAST_UPDATED = "29 September 2026"

export default function PrivacyPage() {
  return (
    <div className="bg-ui-bg-base">
      <div className="mx-auto max-w-[760px] px-[6vw] py-20 small:px-[4vw]">
        <h1 className="font-display text-[clamp(2rem,5vw,2.8rem)] text-ui-fg-base">
          Privacy
        </h1>
        <p className="mt-3 text-sm text-kebe-muted">
          Last updated {LAST_UPDATED}
        </p>

        <div className="mt-10 flex flex-col gap-8 text-base leading-relaxed text-kebe-text/80">
          <p>
            KeBe is a one-person keyboard workshop in Canada. This page describes
            everything the site collects, which is only what it takes to join a
            waitlist or buy a keyboard, and what happens to it.
          </p>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">
              What we collect
            </h2>
            <p className="mt-3">
              <strong className="font-normal text-ui-fg-base">The waitlist.</strong>{" "}
              If you enter your email address into the waitlist form, we store
              that address, a note of which list you joined, and the date you
              joined. That is the whole record.
            </p>
            <p className="mt-3">
              <strong className="font-normal text-ui-fg-base">Orders.</strong>{" "}
              To buy a keyboard you give us your email address, your name, a
              shipping address and, if you choose, a company name and a phone
              number, and a billing address if it differs. We keep those with
              the order: what you bought, what you paid, and its status.
            </p>
            <p className="mt-3">
              <strong className="font-normal text-ui-fg-base">Payment.</strong>{" "}
              Your card is taken by Stripe, in a field Stripe runs on this
              page. The card number goes to Stripe, not to us, and we never see
              or store it. Stripe tells us whether the payment went through.
              Stripe handles what it receives under its own privacy policy.
            </p>
            <p className="mt-3">
              <strong className="font-normal text-ui-fg-base">Accounts.</strong>{" "}
              You do not need one to buy. If you create one, we store your name,
              email address, a scrambled (hashed) copy of your password, any
              addresses you save and your orders.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">
              What we use it for
            </h2>
            <p className="mt-3">
              Waitlist addresses for one thing: to email you when the product
              you asked about is actually available. Order details to make,
              ship and support your keyboard, to tell you about your order (a
              delay, for instance), and to keep the business and tax records
              the law requires. We do not send a newsletter, we do not sell,
              rent or share any of it for advertising, and we do not use it for
              advertising ourselves.
            </p>
            <p className="mt-3">
              The only others who see any of it: Stripe, for the payment, and
              the carrier that delivers your keyboard, which gets your name,
              shipping address and, if you gave one, your phone number.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">
              Where it is stored
            </h2>
            <p className="mt-3">
              In our own database, hosted by Railway on servers in the eastern
              United States. If you are in Canada or the EU, that means your
              details are stored outside your country and are subject to the
              laws where they are held, including lawful access requests by
              authorities there.
            </p>
            <p className="mt-3">
              We keep a waitlist address until the product ships and the
              announcement has gone out, or until you ask us to remove it,
              whichever comes first. We keep orders for as long as Canadian tax
              law requires business records to be kept: six years after the end
              of the year of the sale. An account stays until you ask us to
              delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">Cookies</h2>
            <p className="mt-3">
              <code>_medusa_cache_id</code> lasts 24 hours and exists only so
              the site can work out which region to show you.{" "}
              <code>_medusa_cart_id</code> remembers what is in your cart, and{" "}
              <code>_medusa_jwt</code> keeps you signed in, only if you sign
              in. Each holds a random identifier and nothing about you. At
              checkout, Stripe sets its own cookies, which it uses to detect
              card fraud.
            </p>
            <p className="mt-3">
              There is no analytics, no tracking pixel, and no advertising
              network on this site. Nobody else is watching you here.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">
              Getting your data removed
            </h2>
            <p className="mt-3">
              Email us and ask, and we will delete your details and confirm
              that they are gone, except the order records the law makes us
              keep. You do not need to give a reason. You can also ask what we
              hold about you, and we will tell you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">Contact</h2>
            {CONTACT_EMAIL ? (
              <p className="mt-3">
                <a
                  className="underline underline-offset-4"
                  href={`mailto:${CONTACT_EMAIL}`}
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            ) : (
              <p className="mt-3 text-kebe-muted">
                A contact address has not been set for this site yet.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
