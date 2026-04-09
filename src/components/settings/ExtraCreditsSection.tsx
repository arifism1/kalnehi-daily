"use client";

import { Camera, Loader2, Mic, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { addBonusCredits } from "@/actions/subscription";
import { EXTRA_CREDITS } from "@/lib/subscriptionTiers";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

type CreditPack = (typeof EXTRA_CREDITS)[keyof typeof EXTRA_CREDITS];

function CreditCard({
  pack,
  onBuy,
  disabled,
}: {
  pack: CreditPack;
  onBuy: (pack: CreditPack) => void;
  disabled: boolean;
}) {
  const isPhoto = pack.type === "photo_scans";

  return (
    <div className="flex items-center justify-between rounded-xl border border-kal-border bg-kal-card px-4 py-3">
      <div className="flex items-center gap-3">
        {isPhoto ? (
          <Camera className="h-4 w-4 text-kal-accent" />
        ) : (
          <Mic className="h-4 w-4 text-kal-accent" />
        )}
        <div>
          <p className="text-sm font-medium text-kal-text">{pack.label}</p>
          <p className="text-xs text-kal-text-secondary">{pack.priceDisplay}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onBuy(pack)}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-kal-border bg-kal-card-muted px-3 text-xs font-semibold text-kal-text disabled:opacity-50"
      >
        <Plus className="h-3 w-3" />
        Buy
      </button>
    </div>
  );
}

export function ExtraCreditsSection() {
  const { refetch } = useSubscriptionAccess();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleBuy(pack: CreditPack) {
    startTransition(async () => {
      setMessage(null);
      const res = await addBonusCredits(pack.type, pack.amount);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setMessage(`Added ${pack.label}!`);
      refetch();
    });
  }

  return (
    <div className="overflow-hidden rounded-[1rem] border border-kal-border bg-kal-card kal-shadow-card">
      <div className="border-b border-kal-border px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-kal-accent">
          Extra AI Credits
        </h3>
        <p className="mt-1 text-xs text-kal-text-secondary">
          One-time add-ons — credits never expire.
        </p>
      </div>
      <div className="space-y-2 p-3">
        <CreditCard
          pack={EXTRA_CREDITS.photoScans25}
          onBuy={handleBuy}
          disabled={isPending}
        />
        <CreditCard
          pack={EXTRA_CREDITS.voiceMinutes50}
          onBuy={handleBuy}
          disabled={isPending}
        />
      </div>
      {isPending && (
        <div className="flex justify-center border-t border-kal-border py-2">
          <Loader2 className="h-4 w-4 animate-spin text-kal-accent" />
        </div>
      )}
      {message && (
        <div className="border-t border-kal-border px-4 py-2">
          <p className="text-xs text-kal-text-secondary" role="status">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
