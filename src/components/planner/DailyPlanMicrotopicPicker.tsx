"use client";

import { useEffect, useId, useMemo, useState } from "react";

import {
  chaptersForSubject,
  microtopicsForSubjectChapter,
  uniqueSubjects,
} from "@/lib/taskPlanner";
import { useTaskStore } from "@/store/useTaskStore";

type Props = {
  value: string | null;
  onChange: (syllabusMasterId: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
};

/**
 * Subject → chapter → microtopic for daily plan tasks (no academic duplicate/date UI).
 */
export function DailyPlanMicrotopicPicker({
  value,
  onChange,
  disabled = false,
  compact = false,
}: Props) {
  const uid = useId();
  const syllabusById = useTaskStore((s) => s.microtopics);
  const microtopics = useMemo(
    () => Object.values(syllabusById),
    [syllabusById],
  );

  const resolved = value ? syllabusById[value] : undefined;
  const [subject, setSubject] = useState(resolved?.subject ?? "");
  const [chapter, setChapter] = useState(resolved?.chapter ?? "");

  useEffect(() => {
    const r = value ? syllabusById[value] : undefined;
    setSubject(r?.subject ?? "");
    setChapter(r?.chapter ?? "");
  }, [value, syllabusById]);

  const subjects = useMemo(
    () => uniqueSubjects(microtopics),
    [microtopics],
  );
  const chapters = useMemo(
    () => chaptersForSubject(microtopics, subject),
    [microtopics, subject],
  );
  const microtopicOptions = useMemo(
    () => microtopicsForSubjectChapter(microtopics, subject, chapter),
    [microtopics, subject, chapter],
  );

  const pad = compact ? "mt-1 min-h-[40px] py-1.5 text-xs" : "mt-1.5 min-h-[44px] py-2 text-sm";
  const labelCls = compact ? "text-[10px] font-medium text-kal-muted" : "text-xs font-medium text-kal-muted";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${uid}-subject`} className={labelCls}>Subject</label>
          {subject ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => { setSubject(""); setChapter(""); onChange(null); }}
              className="text-[11px] font-medium text-kal-muted hover:text-kal-text disabled:opacity-40"
            >
              Clear
            </button>
          ) : null}
        </div>
        <select
          id={`${uid}-subject`}
          value={subject}
          disabled={disabled || microtopics.length === 0}
          onChange={(e) => {
            const s = e.target.value;
            setSubject(s);
            setChapter("");
            onChange(null);
          }}
          className={`w-full rounded-xl border border-kal-border bg-kal-input-bg px-2.5 ${pad} text-kal-text transition-colors`}
        >
          <option value="">— Optional —</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${uid}-chapter`} className={labelCls}>Chapter</label>
          {chapter ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => { setChapter(""); onChange(null); }}
              className="text-[11px] font-medium text-kal-muted hover:text-kal-text disabled:opacity-40"
            >
              Clear
            </button>
          ) : null}
        </div>
        <select
          id={`${uid}-chapter`}
          value={chapter}
          disabled={disabled || !subject}
          onChange={(e) => {
            setChapter(e.target.value);
            onChange(null);
          }}
          className={`w-full rounded-xl border border-kal-border bg-kal-input-bg px-2.5 ${pad} text-kal-text transition-colors`}
        >
          <option value="">— Optional —</option>
          {chapters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${uid}-microtopic`} className={labelCls}>Microtopic</label>
          {value ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="text-[11px] font-medium text-kal-muted hover:text-kal-text disabled:opacity-40"
            >
              Clear
            </button>
          ) : null}
        </div>
        <select
          id={`${uid}-microtopic`}
          value={value ?? ""}
          disabled={disabled || !chapter}
          onChange={(e) => {
            const id = e.target.value.trim();
            onChange(id.length > 0 ? id : null);
          }}
          className={`w-full rounded-xl border border-kal-border bg-kal-input-bg px-2.5 ${pad} text-kal-text transition-colors`}
        >
          <option value="">— Optional —</option>
          {microtopicOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.microtopic}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
