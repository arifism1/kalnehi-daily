"use server";

import Groq from "groq-sdk";
import { revalidatePath } from "next/cache";

import { ensureVoiceMinuteHeadroom, incrementVoiceMinuteUsage } from "@/actions/subscription";
import type { MotivationOutboxOp } from "@/lib/motivationTypes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import {
  clampVoiceBillingDurationSeconds,
  estimateMaxVoiceAudioDurationSeconds,
  VOICE_BILLING_DURATION_SEC_MIN,
} from "@/lib/voiceDurationBilling";
import { recordVoiceUsageEvent } from "@/lib/journey/recordVoiceUsage";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

const GROQ_TRANSCRIBE_MODEL = "whisper-large-v3-turbo";

export type MotivationDataResult =
  | {
      ok: true;
      letters: import("@/types/supabase").Tables<"motivation_letters">[];
      voices: import("@/types/supabase").Tables<"motivation_voice_affirmations">[];
      photos: import("@/types/supabase").Tables<"motivation_vision_photos">[];
      prefs: import("@/types/supabase").Tables<"user_motivation_prefs"> | null;
    }
  | { ok: false; error: string };

export async function fetchMotivationData(): Promise<MotivationDataResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }
    const [letters, voices, photos, prefs] = await Promise.all([
      supabase
        .from("motivation_letters")
        .select("*")
        .eq("user_id", user.id)
        .order("letter_date", { ascending: false }),
      supabase
        .from("motivation_voice_affirmations")
        .select("*")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false }),
      supabase
        .from("motivation_vision_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_motivation_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (letters.error)
      return { ok: false, error: formatSupabaseError(letters.error) };
    if (voices.error)
      return { ok: false, error: formatSupabaseError(voices.error) };
    if (photos.error)
      return { ok: false, error: formatSupabaseError(photos.error) };
    if (prefs.error)
      return { ok: false, error: formatSupabaseError(prefs.error) };
    return {
      ok: true,
      letters: letters.data ?? [],
      voices: voices.data ?? [],
      photos: photos.data ?? [],
      prefs: prefs.data ?? null,
    };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function upsertMotivationLetter(
  letterDate: string,
  body: string,
  pinned: boolean,
  sealed: boolean,
  openDate: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };
    const d = letterDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return { ok: false, error: "Invalid date." };
    }
    let open: string | null = null;
    if (sealed) {
      const od = openDate?.trim() ?? "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(od)) {
        return { ok: false, error: "Choose a valid open date." };
      }
      if (od <= d) {
        return {
          ok: false,
          error: "Open date must be after the letter date.",
        };
      }
      open = od;
    }
    const row: TablesInsert<"motivation_letters"> = {
      user_id: user.id,
      letter_date: d,
      body: body.slice(0, 50_000),
      pinned,
      sealed,
      open_date: open,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("motivation_letters").upsert(row, {
      onConflict: "user_id,letter_date",
    });
    if (error) return { ok: false, error: formatSupabaseError(error) };
    revalidatePath("/motivation");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function createMotivationVoiceEntry(input: {
  id?: string;
  transcript: string;
  tags: string[];
  audioBase64: string | null;
  audioMime: string | null;
  recordedAt: string;
}): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };
    const id = input.id ?? crypto.randomUUID();
    const audio =
      input.audioBase64 && input.audioBase64.length > 1_600_000
        ? null
        : input.audioBase64;
    const row: TablesInsert<"motivation_voice_affirmations"> = {
      id,
      user_id: user.id,
      transcript: input.transcript.slice(0, 20_000),
      tags: input.tags.slice(0, 12),
      audio_mime: input.audioMime,
      audio_base64: audio,
      recorded_at: input.recordedAt,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("motivation_voice_affirmations")
      .insert(row);
    if (error) {
      if (error.code === "23505") return { ok: true, id };
      return { ok: false, error: formatSupabaseError(error) };
    }
    revalidatePath("/motivation");
    revalidatePath("/");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function createMotivationPhotoEntry(input: {
  id?: string;
  imageDataUrl: string;
  caption: string | null;
  photoDate: string;
  isWallpaper: boolean;
}): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };
    const id = input.id ?? crypto.randomUUID();
    const img = input.imageDataUrl.slice(0, 2_000_000);
    const row: TablesInsert<"motivation_vision_photos"> = {
      id,
      user_id: user.id,
      image_data_url: img,
      caption: input.caption?.slice(0, 500) ?? null,
      photo_date: input.photoDate,
      is_wallpaper: input.isWallpaper,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("motivation_vision_photos").insert(row);
    if (error) {
      if (error.code === "23505") return { ok: true, id };
      return { ok: false, error: formatSupabaseError(error) };
    }
    if (input.isWallpaper) {
      await clearOtherWallpapers(supabase, user.id, id);
      await upsertPrefsWallpaper(supabase, user.id, id);
    }
    revalidatePath("/motivation");
    revalidatePath("/");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

async function clearOtherWallpapers(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  keepId: string,
) {
  await supabase
    .from("motivation_vision_photos")
    .update({ is_wallpaper: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .neq("id", keepId);
}

async function upsertPrefsWallpaper(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  photoId: string | null,
) {
  const row: TablesInsert<"user_motivation_prefs"> = {
    user_id: userId,
    wallpaper_photo_id: photoId,
    updated_at: new Date().toISOString(),
  };
  await supabase.from("user_motivation_prefs").upsert(row, {
    onConflict: "user_id",
  });
}

export async function setMotivationWallpaperPhoto(
  photoId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };
    if (photoId) {
      await clearOtherWallpapers(supabase, user.id, photoId);
      const patch: TablesUpdate<"motivation_vision_photos"> = {
        is_wallpaper: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("motivation_vision_photos")
        .update(patch)
        .eq("id", photoId)
        .eq("user_id", user.id);
      if (error) return { ok: false, error: formatSupabaseError(error) };
    } else {
      await supabase
        .from("motivation_vision_photos")
        .update({ is_wallpaper: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
    await upsertPrefsWallpaper(supabase, user.id, photoId);
    revalidatePath("/motivation");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

// react-doctor-disable-next-line react-doctor/server-auth-actions -- delegates to upsertMotivationLetter/createMotivationVoiceEntry/createMotivationPhotoEntry, each of which calls getUser()
export async function applyMotivationOutboxOp(
  op: MotivationOutboxOp,
): Promise<{ ok: true } | { ok: false; error: string }> {
  switch (op.kind) {
    case "letter_upsert":
      return upsertMotivationLetter(
        op.letterDate,
        op.body,
        op.pinned,
        op.sealed,
        op.openDate,
      );
    case "voice_create": {
      const r = await createMotivationVoiceEntry({
        id: op.id,
        transcript: op.transcript,
        tags: op.tags,
        audioBase64: op.audioBase64,
        audioMime: op.audioMime,
        recordedAt: op.recordedAt,
      });
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    }
    case "photo_create": {
      const r = await createMotivationPhotoEntry({
        id: op.id,
        imageDataUrl: op.imageDataUrl,
        caption: op.caption,
        photoDate: op.photoDate,
        isWallpaper: op.isWallpaper,
      });
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    }
    case "wallpaper_set":
      return setMotivationWallpaperPhoto(op.photoId);
    default:
      return { ok: false, error: "Unknown op" };
  }
}

export async function transcribeMotivationAudio(
  formData: FormData,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false, error: "Voice transcription is not configured." };
    }

    const file = formData.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "No audio file." };
    }
    if (file.size > 4 * 1024 * 1024) {
      return { ok: false, error: "Recording is too large." };
    }

    const headroomMin =
      clampVoiceBillingDurationSeconds(estimateMaxVoiceAudioDurationSeconds(file.size)) /
      60;
    const headroom = await ensureVoiceMinuteHeadroom(headroomMin);
    if (!headroom.ok) {
      return { ok: false, error: headroom.error };
    }

    const groq = new Groq({ apiKey });
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: GROQ_TRANSCRIBE_MODEL,
      response_format: "verbose_json",
      language: "en",
    });
    const text = (transcription.text ?? "").trim();
    if (!text) {
      return { ok: false, error: "Could not transcribe audio." };
    }

    const verbose = transcription as { duration?: number };
    const billedSeconds = clampVoiceBillingDurationSeconds(
      typeof verbose.duration === "number" && verbose.duration > 0
        ? verbose.duration
        : VOICE_BILLING_DURATION_SEC_MIN,
    );
    const usage = await incrementVoiceMinuteUsage(billedSeconds / 60);
    if (!usage.ok) {
      return { ok: false, error: usage.error };
    }

    void recordVoiceUsageEvent(user.id, {
      feature: "voice_motivation",
      secondsCharged: billedSeconds,
    });

    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}
