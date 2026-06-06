import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase";
import { clientIpFromRequest, recordDpdpSignupConsent } from "@/lib/dpdp/consent";
import {
  clearSignupAttestationCookie,
  verifySignupAttestation,
} from "@/lib/dpdp/signupConsentAttestation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const errRedirect = (message: string) =>
    NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(message)}`,
    );

  if (!code) {
    return errRedirect("Missing authorization code");
  }

  const dest = new URL(next, origin);
  const response = NextResponse.redirect(dest.toString());
  const { url, anonKey } = getSupabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return errRedirect("Authentication failed. Please try again.");
  }

  const createdMs =
    data.user?.created_at != null
      ? new Date(data.user.created_at).getTime()
      : data.session?.user?.created_at != null
        ? new Date(data.session.user.created_at).getTime()
        : 0;
  const isNewUser = createdMs > 0 && Date.now() - createdMs < 5 * 60 * 1000;
  if (isNewUser && data.user?.id) {
    if (!verifySignupAttestation(request, { method: "google_oauth" })) {
      const svc = getSupabaseServiceRoleClient();
      if (svc) {
        await svc.auth.admin.deleteUser(data.user.id);
      }
      clearSignupAttestationCookie(response);
      return errRedirect(
        "Please confirm you are 18+ and agree to the data processing notice before signing up.",
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      null;
    await recordDpdpSignupConsent({
      userId: data.user.id,
      method: "google_oauth",
      ip,
    });
    clearSignupAttestationCookie(response);
  }
  dest.searchParams.set("kalnehi_auth_event", isNewUser ? "sign_up" : "login");
  response.headers.set("Location", dest.toString());

  return response;
}
