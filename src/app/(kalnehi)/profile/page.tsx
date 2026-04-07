import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ProfileForm } from "@/components/profile/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-kal-muted hover:text-kal-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          You
        </p>
        <h1 className="mt-1 text-xl font-bold text-kal-text">Profile</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Goals, exam history, and install — laid out like iOS Settings.
        </p>
      </div>

      <ProfileForm />
    </div>
  );
}
