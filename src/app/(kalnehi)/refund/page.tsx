import { SITE_NAME } from "@/lib/seo-metadata";

export default function RefundPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 pb-8 text-[15px] leading-relaxed text-kal-text sm:text-base">
      <h1 className="text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
        Refund &amp; Cancellation Policy
      </h1>
      <p>
        <strong>Last updated:</strong> April 08, 2026
      </p>
      <p>
        All purchases made on {SITE_NAME} are{" "}
        <strong>final and non-refundable</strong>.
      </p>
      <p>
        <strong>No Refunds Policy</strong>
      </p>
      <p>
        Once you subscribe or make any payment, the amount is{" "}
        <strong>non-refundable</strong> under any circumstances, except where
        law strictly requires it. We do not offer refunds for change of mind,
        dissatisfaction, or any other reason.
      </p>
      <p>
        <strong>3-Day Trial</strong>
      </p>
      <p>
        You may cancel the 3-day trial plan before it ends to avoid being
        charged the full monthly fee. Cancellation must be done from your
        account settings. After the trial converts to a paid plan,{" "}
        <strong>no refund</strong> is possible.
      </p>
      <p>
        <strong>Technical Issues</strong>
      </p>
      <p>
        In case of any technical problem, we are{" "}
        <strong>not responsible</strong>. We may, at our sole discretion, try
        to resolve the issue, but this does not create any right to a refund.
      </p>
      <p>
        <strong>Zero Liability on Refunds</strong>
      </p>
      <p>
        We have <strong>zero responsibility</strong> and{" "}
        <strong>zero liability</strong> for any financial loss you may suffer
        due to subscription or payment. Failure to cancel before the trial ends
        does not entitle you to a refund.
      </p>
      <p>
        <strong>Contact</strong>
      </p>
      <p>
        For any questions, please email us at curioversitylearning@gmail.com.
      </p>
      <p>
        Neven Academy Assam
        <br />
        1000, Uday Nagar, Bono Durga Mandir, Karim Chowk, K.Chowka, Ward No.4,
        Mangaldoi, Darrang, Assam, 784125
        <br />
        Phone: 9101776379
      </p>
    </article>
  );
}
