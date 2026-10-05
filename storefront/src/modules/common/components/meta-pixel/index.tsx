import { META_PIXEL_ID } from "@lib/util/meta-pixel"

// Production builds only, so local work never reaches the owner's ad data.
export const PIXEL_ON = process.env.NODE_ENV === "production"

// The base code from Events Manager, run inline in <head> so fbq exists before
// anything on the page tracks an event. It counts the landing page view;
// PixelPageViews counts the pages after it, which the store changes without a
// reload.
export function MetaPixelScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`,
      }}
    />
  )
}

// The base code's fallback for browsers without JavaScript. It belongs in
// <body>: <noscript> in <head> may only hold link, style and meta.
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
