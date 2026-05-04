import { NextResponse } from "next/server";

import {
  canAccessFcmBroadcastTools,
  showFcmDevToolsServer,
} from "@/lib/fcm/adminGate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const fcmCapabilitiesCacheHeaders = {
  "Cache-Control":
    "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
};

/**
 * Whether the signed-in user may use admin broadcast push UI (`/api/fcm/send`).
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { canSendPush: false, showDevFcmTools: false },
        { headers: fcmCapabilitiesCacheHeaders },
      );
    }
    return NextResponse.json(
      {
        canSendPush: canAccessFcmBroadcastTools(user),
        showDevFcmTools: showFcmDevToolsServer(user),
      },
      { headers: fcmCapabilitiesCacheHeaders },
    );
  } catch (e) {
    console.error("[fcm/capabilities]", e);
    return NextResponse.json(
      { canSendPush: false, showDevFcmTools: false },
      { status: 500, headers: fcmCapabilitiesCacheHeaders },
    );
  }
}
