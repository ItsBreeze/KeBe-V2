import { Metadata } from "next"
import { CONTACT_EMAIL } from "@lib/constants"

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What KeBe collects, why, where it is stored, and how to have it deleted.",
}



// Last substantive change to this notice. Update it whenever the content changes.
const LAST_UPDATED = "5 October 2026"

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
            everything the site collects, which is what it takes to join a
            waitlist or buy a keyboard plus what Meta&apos;s pixel records to
            measure our ads, and what happens to it.
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
            <p className="mt-3">
              <strong className="font-normal text-ui-fg-base">
                Meta&apos;s pixel.
              </strong>{" "}
              We advertise on Instagram and Facebook, and this site runs Meta&apos;s
              pixel, a script from Meta. It tells Meta which pages you view and
              when you add a keyboard to your cart, start a checkout, place an
              order or join the waitlist, with the product and the amount, but
              not your name, shipping address or card. Meta links that to your
              Facebook or Instagram account if it can, so it can tell us how
              many orders our ads led to and show our ads to people like the
              ones who bought. The pixel can also send Meta a scrambled (hashed)
              copy of an email address you type here, to make that match. Meta
              handles what it receives under its own privacy policy.
            </p>
            <p className="mt-3">
              <strong className="font-normal text-ui-fg-base">
                The typing trainer.
              </strong>{" "}
              The levels you have opened and your best speeds are kept in your
              browser&apos;s local storage, which stays on your device. If you
              are signed in, they are also saved to your account so they follow
              you. What you type in it is not sent anywhere.
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
              the law requires. We do not send a newsletter and we do not sell
              or rent any of it. Beyond what Meta&apos;s pixel records, we do not
              share it for advertising.
            </p>
            <p className="mt-3">
              The others who see any of it: Meta, what its pixel records;
              Stripe, for the payment; and the carrier that delivers your
              keyboard, which gets your name, shipping address and, if you gave
              one, your phone number.
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
              in. Each holds a random identifier and nothing about you.{" "}
              <code>_kebe_utm</code> is set only when you arrive through a link
              we tagged, such as one of our ads: for 30 days it holds that
              link's campaign tags, and they are saved with your order so we
              know which ad led to it. At checkout, Stripe sets its own
              cookies, which it uses to detect card fraud.
            </p>
            <p className="mt-3">
              Meta&apos;s pixel sets <code>_fbp</code>, a random identifier for
              your browser that lasts 90 days, and, if you came by tapping one
              of our ads, <code>_fbc</code>, which holds that click&apos;s
              identifier for 90 days. If you are signed in to Facebook or
              Instagram in the same browser, Meta can also recognise you by its
              own cookies.
            </p>
            <p className="mt-3">
              Apart from Meta&apos;s pixel there is no analytics and no other
              advertising network on this site. A content blocker (uBlock
              Origin, Brave, or the tracking protection in Firefox and Safari)
              keeps the pixel out, and the site works the same without it.
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
