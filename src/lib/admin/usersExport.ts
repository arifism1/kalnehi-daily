import ExcelJS from "exceljs";

import { todayISTKey } from "@/lib/admin/istDates";
import {
  USER_EXPORT_AUTH_COLUMNS,
  type UserExportRow,
} from "@/lib/admin/queries/userExportQueries";

import type { Database } from "@/types/supabase";

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

const PROFILE_COLUMN_KEYS = Object.keys({
  ai_study_partner_seconds_remaining: 0,
  ai_tokens_month: 0,
  ai_tokens_used: 0,
  ai_usage_row_version: 0,
  attempts: 0,
  bonus_ai_tokens: 0,
  bonus_ai_tokens_ledger: 0,
  bonus_ai_tokens_ledger_at_cancel: 0,
  bonus_photo_scans: 0,
  bonus_photo_scans_ledger: 0,
  bonus_voice_minutes: 0,
  bonus_voice_minutes_ledger: 0,
  bonus_voice_minutes_ledger_at_cancel: 0,
  class_studying: 0,
  cuet_domain_subjects: 0,
  enabled_exams_in_track: 0,
  enabled_features: 0,
  exam_dates: 0,
  full_name: 0,
  has_had_trial: 0,
  has_used_free_trial: 0,
  id: 0,
  level: 0,
  mandatory_onboarding_completed_at: 0,
  organization_id: 0,
  paid_trial_ai_tokens_used: 0,
  payment_grace_until: 0,
  pending_upgrade_order_id: 0,
  phone_number: 0,
  phone_verified_at: 0,
  photo_scans_used_this_month: 0,
  prepbrain_tokens_month: 0,
  prepbrain_tokens_used: 0,
  prev_exam_attempted: 0,
  prev_score: 0,
  prev_score_entries: 0,
  primary_exam: 0,
  pwa_first_opened_at: 0,
  pwa_install_platform: 0,
  pwa_install_status: 0,
  pwa_last_opened_at: 0,
  quick_nav_hrefs: 0,
  razorpay_subscription_id: 0,
  referral_campaign: 0,
  referral_captured_at: 0,
  referral_medium: 0,
  referral_source: 0,
  referral_url: 0,
  selected_track: 0,
  signup_attribution: 0,
  subscription_autopay_months_total: 0,
  subscription_cancelled_at: 0,
  subscription_end_date: 0,
  subscription_plan: 0,
  subscription_start_date: 0,
  subscription_status: 0,
  subscription_tier: 0,
  system_push_notifications: 0,
  target_exam: 0,
  target_exam_date: 0,
  trial_access_type: 0,
  trial_date: 0,
  trial_photo_scans_used: 0,
  trial_started_at: 0,
  trial_voice_seconds_used: 0,
  ui_prefs: 0,
  updated_at: 0,
  upsc_optional_subject: 0,
  upsc_optional_subjects: 0,
  usage_reset_date: 0,
  user_id: 0,
  voice_minutes_used_this_month: 0,
  welcome_ai_tokens_used: 0,
  xp: 0,
} satisfies Record<keyof UserProfileRow, number>) as (keyof UserProfileRow)[];

export const USER_EXPORT_COLUMNS: string[] = [...USER_EXPORT_AUTH_COLUMNS, ...PROFILE_COLUMN_KEYS];

function serializeCellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" || typeof value === "string") return value;
  return JSON.stringify(value);
}

export function usersExportFilename(): string {
  return `kalnehi-users-export-${todayISTKey()}.xlsx`;
}

export async function buildUsersExportWorkbook(rows: UserExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Users");

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  sheet.addRow(USER_EXPORT_COLUMNS);

  for (const row of rows) {
    const values = USER_EXPORT_COLUMNS.map((col) =>
      serializeCellValue(row[col as keyof UserExportRow]),
    );
    sheet.addRow(values);
  }

  sheet.getRow(1).font = { bold: true };

  for (let i = 0; i < USER_EXPORT_COLUMNS.length; i++) {
    const col = sheet.getColumn(i + 1);
    let maxLen = USER_EXPORT_COLUMNS[i]?.length ?? 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 40);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
