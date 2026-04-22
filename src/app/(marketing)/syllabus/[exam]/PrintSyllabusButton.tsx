"use client";

interface PrintSyllabusButtonProps {
  examName: string;
}

export default function PrintSyllabusButton({ examName }: PrintSyllabusButtonProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-kal-border px-5 text-sm font-semibold text-kal-text-secondary transition hover:border-kal-accent/40 hover:text-kal-accent-dark"
      aria-label={`Print ${examName} syllabus`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-1.5"
        aria-hidden
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      Print PDF
    </button>
  );
}
