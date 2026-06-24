"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getActivationFlowStatus } from "@/actions/activation";
import { MarkWhatYouKnowOverlay } from "@/components/syllabus/MarkWhatYouKnowOverlay";
import { SyllabusProjectionHeader } from "@/components/syllabus/SyllabusProjectionHeader";
import { FirstSessionReturnHook } from "@/components/syllabus/FirstSessionReturnHook";
import { trackActivity } from "@/lib/activity";
import { JourneyAction } from "@/lib/analytics/journeyEvents";

const MARKS_RAISE_SESSION_KEY = "kal_first_marks_raise_done";

export function SyllabusActivationHost({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const activationParam = searchParams.get("activation") === "1";
  const [showMarkOverlay, setShowMarkOverlay] = useState(false);
  const [returnHookOpen, setReturnHookOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void (async () => {
      const status = await getActivationFlowStatus();
      if (!status.flowCompleted && (activationParam || status.scoresSaved)) {
        setShowMarkOverlay(true);
      }
      setChecked(true);
    })();
  }, [activationParam]);

  const onProjectionIncreased = useCallback((delta: number, newScore: number) => {
    if (delta <= 0) return;
    trackActivity(JourneyAction.FIRST_SYLLABUS_MARKS_RAISE, {
      feature: "syllabus",
      page: "/syllabus",
      metadata: { delta, projected: newScore },
    });
    if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(MARKS_RAISE_SESSION_KEY)) {
      sessionStorage.setItem(MARKS_RAISE_SESSION_KEY, "1");
      setReturnHookOpen(true);
    }
  }, []);

  if (!checked) return <>{children}</>;

  return (
    <>
      <div className="space-y-4">
        <SyllabusProjectionHeader onProjectionIncreased={onProjectionIncreased} />
        {children}
      </div>
      <MarkWhatYouKnowOverlay
        open={showMarkOverlay}
        onDone={() => setShowMarkOverlay(false)}
      />
      <FirstSessionReturnHook open={returnHookOpen} onClose={() => setReturnHookOpen(false)} />
    </>
  );
}
