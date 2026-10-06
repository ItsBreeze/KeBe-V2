import { META_PIXEL_ID } from "@lib/util/meta-pixel"

// Production builds only, so local work never reaches the owner's ad data.
export const PIXEL_ON = process.env.NODE_ENV === "production"

// And only on the live store. `next start` on a laptop is a production build
// too: on 6 Oct 2026 a local one sent its PageViews to the owner's pixel and
// Meta's gateway, and its test checkouts would have sent Purchases. Anywhere
// else fbq is never defined, so every event the store tracks is a no-op.
export const PIXEL_HOST = "kebe.grounders.app"

// The base code from Events Manager, run inline in <head> so fbq exists before
// anything on the page tracks an event. It counts the landing page view;
// PixelPageViews counts the pages after it, which the store changes without a
// reload. disablePushState stops fbevents counting every history change as a
// page view itself: the product page's ?v_id= replace was a second PageView.
export function MetaPixelScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `if(location.hostname==='${PIXEL_HOST}'){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq.disablePushState=true;fbq('init','${META_PIXEL_ID}');fbq('track','PageView')}`,
      }}
    />
  )
}

// The base code's fallback for browsers without JavaScript. It belongs in
// <body>: <noscript> in <head> may only hold link, style and meta. It cannot
// check the host, and no one tries the store locally without JavaScript.
export function MetaPixelNoscript() {
  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  )
}
