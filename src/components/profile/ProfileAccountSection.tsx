"use client";

import Link from "next/link";
import { Building2, UserCircle } from "lucide-react";

import { LoginMethodsSection } from "@/components/profile/LoginMethodsSection";
import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import { useOrgContext } from "@/components/OrgContextProvider";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

/**
 * Account (avatar, plan, billing) + login methods — bottom of Settings, above Sign out.
 */
export function ProfileAccountSection() {
  const user = useAuthStore((s) => s.user);
  const org = useOrgContext();

  const {
    status: subStatus,
    plan: subPlan,
    endDate: subEndDate,
    autopayMonthsTotal,
    hasPaidAccess,
  } = useSubscriptionAccess();

  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl =
    (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta?.picture === "string" && meta.picture) ||
    null;

  if (!user) {
    return null;
  }

  return (
    <SettingsExpandableSection
      sectionId="profile-account"
      kicker="Profile"
      title="Account"
      description="Plan, billing, and linked sign-ins."
      icon={UserCircle}
      expandable={false}
    >
      <div className="space-y-6">
        <div className="kal-glass-panel overflow-hidden rounded-[1rem]">
          <div className="flex min-h-[52px] items-center gap-3 border-b border-kal-border px-4 py-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="size-11 shrink-0 rounded-full border border-kal-border object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="kal-glass-subtle flex size-11 shrink-0 items-center justify-center rounded-full">
                <UserCircle className="size-8 text-kal-muted" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                Signed in as
              </p>
              <p className="truncate text-sm text-kal-text">{user.email}</p>
            </div>
          </div>
          <div className="px-4 py-3">
            {subStatus ? (
              <div className="mb-3 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                  Current plan
                </p>
                <p className="mt-1 text-sm font-medium text-kal-text">
                  {subPlan === "annual"
                    ? "Annual Smart Plan"
                    : subPlan === "six_month"
                      ? "6-Month Smart Plan"
                      : subPlan === "monthly" || subPlan === "trial"
                        ? "Monthly Smart Plan"
                        : "Smart Plan"}
                  {" · "}
                  <span
                    className={
                      subStatus === "active" || subStatus === "trial"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : subStatus === "cancelled"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-kal-text-secondary"
                    }
                  >
                    {subStatus === "active"
                      ? "Active"
                      : subStatus === "trial"
                        ? "Trial"
                        : subStatus === "cancelled"
                          ? hasPaidAccess
                            ? "Cancelled (access continues)"
                            : "Cancelled"
                          : subStatus === "expired"
                            ? "Expired"
                            : subStatus}
                  </span>
                </p>
                {subEndDate ? (
                  <p className="mt-0.5 text-xs text-kal-text-secondary">
                    {subPlan === "annual" || subPlan === "six_month"
                      ? "Plan runs until"
                      : subStatus === "cancelled"
                        ? "Access until"
                        : "Month ends"}{" "}
                    {new Date(subEndDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {(subPlan === "monthly" || subPlan === "trial") &&
                      autopayMonthsTotal !== null &&
                      subStatus !== "cancelled" && (
                        <> · AutoPay up to {autopayMonthsTotal} month{autopayMonthsTotal === 1 ? "" : "s"}</>
                      )}
                  </p>
                ) : null}
              </div>
            ) : null}
            <Link
              href="/my-subscription"
              className="kal-glass-subtle flex w-full min-h-[48px] items-center justify-center rounded-xl py-3 text-[15px] font-semibold text-kal-text transition-colors hover:opacity-95 active:opacity-90"
            >
              My Subscription &amp; billing
            </Link>
          </div>
        </div>

        {/* My Institute — only shown to B2B students enrolled in an organisation */}
        {org && (
          <div className="space-y-1.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
              My Institute
            </p>
            <div className="kal-glass-panel overflow-hidden rounded-[1rem] px-4 py-3">
              <div className="flex items-start gap-3">
                {org.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={org.logoUrl}
                    alt={org.orgName}
                    className="mt-0.5 size-9 shrink-0 rounded-lg border border-kal-border object-contain"
                  />
                ) : (
                  <div className="kal-glass-subtle mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-kal-border">
                    <Building2 className="size-5 text-kal-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-kal-text">
                    {org.orgName}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {org.batchName && (
                      <span className="text-xs text-kal-text-secondary">
                        {org.batchName}
                      </span>
                    )}
                    {org.role && (
                      <span className="rounded-full border border-kal-border bg-kal-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                        {org.role}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-kal-muted">
                    Enrolled via your institution. Contact your admin to update
                    enrolment details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div id="login-methods" className="scroll-mt-24 space-y-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
            Login methods
          </p>
          <div className="kal-glass-panel overflow-hidden rounded-[1rem]">
            <LoginMethodsSection />
          </div>
        </div>
      </div>
    </SettingsExpandableSection>
  );
}
