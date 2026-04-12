import { kalnehiPageMetadata, SITE_NAME } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("about");

export default function AboutUsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 pb-8 text-[15px] leading-relaxed text-kal-text sm:text-base">
      <h1 className="text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
        About Us
      </h1>
      <p>
        <strong>Last updated:</strong> April 08, 2026
      </p>
      <p>
        <strong>Neven Academy Assam</strong> is a sole proprietorship founded
        with the mission to help students prepare for competitive exams like
        NEET, JEE, CUET and others through disciplined daily planning and smart
        tools.
      </p>
      <p>
        {SITE_NAME} is our flagship digital product — a mobile-first PWA
        designed to bring visibility, execution, and accountability to
        students&apos; daily study routine.
      </p>
      <p>
        <strong>Important Disclaimer</strong>
      </p>
      <p>
        While we strive to provide useful tools,{" "}
        <strong>we make no guarantees</strong> about exam results, score
        improvement, or academic success.
      </p>
      <p>
        All features, including AI-powered tools, are provided &quot;as
        is&quot;. <strong>We are not responsible</strong> if the app does not
        meet your expectations or if you do not achieve the desired results.{" "}
        <strong>Maybe the AI did it. We are not sure.</strong>
      </p>
      <p>
        You use {SITE_NAME} <strong>entirely at your own risk</strong>. Neven
        Academy Assam and its owner have <strong>zero liability</strong> for any
        outcome resulting from the use of this app.
      </p>
      <p>
        <strong>Contact Us</strong>
      </p>
      <p>
        Neven Academy Assam
        <br />
        1000, Uday Nagar, Bono Durga Mandir, Karim Chowk, K.Chowka, Ward No.4,
        Mangaldoi, Darrang, Assam, 784125
        <br />
        Phone: 9101776379
        <br />
        Email: curioversitylearning@gmail.com
      </p>
    </article>
  );
}
