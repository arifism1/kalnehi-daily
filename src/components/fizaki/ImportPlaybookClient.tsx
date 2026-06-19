"use client";

/**
 * Admin playbook import. Pastes/edits playbook text and structures it (client-side, pure)
 * into Module → Skill → Micro-skill via the same structurer used by the server action that
 * will persist into knowledge_nodes once the migration is applied.
 */
import { useMemo, useState } from "react";

import { DEMO_PLAYBOOK } from "@/lib/fizaki/demoData";
import {
  playbookToNodes,
  structurePlaybook,
} from "@/lib/fizaki/playbookStructurer";

export function ImportPlaybookClient() {
  const [text, setText] = useState(DEMO_PLAYBOOK);
  const [submitted, setSubmitted] = useState(DEMO_PLAYBOOK);

  const { structured, nodeCount } = useMemo(() => {
    const s = structurePlaybook(submitted);
    return { structured: s, nodeCount: playbookToNodes(s).length };
  }, [submitted]);

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight text-kal-text">
        Import Playbook
      </h1>
      <p className="mt-1 text-sm text-kal-text-secondary">
        Paste your existing sales playbook — we structure it into modules, skills, and
        micro-skills your reps practice with spaced reinforcement.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="mt-4 w-full rounded-xl border border-kal-border bg-kal-card px-3 py-2 font-mono text-xs text-kal-text outline-none focus:border-kal-accent"
        aria-label="Playbook text"
      />
      <button
        type="button"
        onClick={() => setSubmitted(text)}
        className="mt-3 w-full rounded-xl bg-kal-accent px-4 py-3 text-sm font-semibold text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover"
      >
        Structure playbook
      </button>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-kal-text">
            {structured.modules.length} modules · {nodeCount} nodes
          </h2>
        </div>
        <ul className="mt-3 space-y-3">
          {structured.modules.map((m, mi) => (
            <li
              key={`${m.title}-${mi}`}
              className="rounded-xl border border-kal-border bg-kal-card p-3"
            >
              <p className="text-sm font-semibold text-kal-accent">{m.title}</p>
              <ul className="mt-2 space-y-1.5">
                {m.skills.map((s, si) => (
                  <li key={`${s.title}-${si}`} className="text-sm text-kal-text">
                    <span className="font-medium">{s.title}</span>
                    {s.microSkills.length > 0 && (
                      <ul className="ml-4 mt-0.5 list-disc text-xs text-kal-muted">
                        {s.microSkills.map((micro, mmi) => (
                          <li key={`${micro}-${mmi}`}>{micro}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
