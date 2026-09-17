import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What KeBe collects, why, where it is stored, and how to have it deleted.",
}

// Fill this in before linking the page publicly. support@keberds.ca is dead --
// the .ca domain lapsed -- so a privacy notice pointing at it would give people
// no working way to exercise the rights described below.
const CONTACT_EMAIL = ""

// Last substantive change to this notice. Update it whenever the content changes.
const LAST_UPDATED = "17 September 2026"

export default function PrivacyPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-[760px] px-[6vw] py-20 small:px-[4vw]">
        <h1 className="font-display text-[clamp(2rem,5vw,2.8rem)] text-black">
          Privacy
        </h1>
        <p className="mt-3 text-sm text-black/50">
          Last updated {LAST_UPDATED}
        </p>

        <div className="mt-10 flex flex-col gap-8 text-base leading-relaxed text-black/80">
          <p>
            KeBe is a one-person keyboard workshop in Canada. This page describes
            everything the site collects, which is not much, and what happens to
            it.
          </p>

          <section>
            <h2 className="font-display text-2xl text-black">
              What we collect
            </h2>
            <p className="mt-3">
              If you enter your email address into the waitlist form, we store
              that address, a note of which list you joined, and the date you
              joined. That is the whole record. We do not ask for your name, and
              there is no account to create.
            </p>
            <p className="mt-3">
              Nothing is currently for sale on this site, so no payment,
              shipping or billing information is collected.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-black">
              What we use it for
            </h2>
            <p className="mt-3">
              One thing: to email you when the product you asked about is
              actually available. We do not send a newsletter, we do not sell,
              rent or share the list with anyone, and we do not use it for
              advertising.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-black">
              Where it is stored
            </h2>
            <p className="mt-3">
              In our own database, hosted by Railway on servers in the eastern
              United States. If you are in Canada or the EU, that means your
              email address is stored outside your country and is subject to the
              laws where it is held, including lawful access requests by
              authorities there.
            </p>
            <p className="mt-3">
              We keep an address until the product ships and the announcement
              has gone out, or until you ask us to remove it, whichever comes
              first.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-black">Cookies</h2>
            <p className="mt-3">
              This site sets one cookie, <code>_medusa_cache_id</code>, which
              lasts 24 hours and exists only so the site can work out which
              region to show you. It contains a random identifier and nothing
              about you.
            </p>
            <p className="mt-3">
              There is no analytics, no tracking pixel, and no advertising
              network on this site. Nobody else is watching you here.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-black">
              Getting your data removed
            </h2>
            <p className="mt-3">
              Email us and ask, and we will delete your address and confirm that
              it is gone. You do not need to give a reason. You can also ask
              what we hold about you, and we will tell you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-black">Contact</h2>
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
              <p className="mt-3 text-black/60">
                A contact address has not been set for this site yet.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
