import {
  SITE_NAME,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO_HREF,
} from "@/lib/seo-metadata";

export default function ShippingPolicyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 pb-8 text-[15px] leading-relaxed text-kal-text sm:text-base">
      <h1 className="kal-feature-title">
        Shipping Policy
      </h1>
      <p>
        <strong>Last updated:</strong> April 08, 2026
      </p>
      <p>
        Neven Academy Assam operates {SITE_NAME} (www.kalnehi.com).
      </p>
      <p>
        <strong>This is a purely digital service.</strong> We do not sell or
        ship any physical goods.
      </p>
      <p>
        <strong>Digital Delivery</strong>
      </p>
      <ul className="list-disc space-y-2 pl-6 text-kal-text">
        <li>
          All products and subscriptions are delivered instantly and digitally
          upon successful payment.
        </li>
        <li>
          Access to premium features is granted immediately after payment
          confirmation.
        </li>
        <li>You will receive access via your account on the app.</li>
      </ul>
      <p>
        <strong>No Physical Shipping</strong>
      </p>
      <p>
        We do not ship any physical items. There is no shipping cost, no
        delivery timeline for physical products, and no tracking number.
      </p>
      <p>
        <strong>Zero Liability</strong>
      </p>
      <p>
        We are <strong>not responsible</strong> for any delay, failure, or
        issue in digital delivery caused by payment gateway, internet
        connection, device problems, or any third-party service.
      </p>
      <p>
        Delays caused by your device, internet connection, or the payment
        processor are outside our control and do not create a liability on our
        part. We have <strong>zero liability</strong> for any inconvenience,
        loss of time, or any other damage resulting from delivery issues.
      </p>
      <p>
        <strong>Contact</strong>
      </p>
      <p>
        Neven Academy Assam
        <br />
        1000, Uday Nagar, Bono Durga Mandir, Karim Chowk, K.Chowka, Ward No.4,
        Mangaldoi, Darrang, Assam, 784125
        <br />
        Phone: 9101776379
        <br />
        Email:{" "}
        <a
          href={SUPPORT_MAILTO_HREF}
          className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </article>
  );
}
