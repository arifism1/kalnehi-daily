"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Plus,
  Search,
  UserMinus,
  X,
  Check,
  Loader2,
} from "lucide-react";

import type { OrgRow, BatchRow, MemberRow } from "@/app/admin/organizations/page";
import { createOrganizationAction } from "@/actions/b2b/createOrganizationAction";
import { updateOrganizationAction } from "@/actions/b2b/updateOrganizationAction";
import { createBatchAction } from "@/actions/b2b/createBatchAction";
import { lookupUserByEmailAction } from "@/actions/b2b/lookupUserByEmailAction";
import { linkUserToOrganizationAction } from "@/actions/b2b/linkUserToOrganizationAction";
import { removeMemberAction } from "@/actions/b2b/removeMemberAction";
import { getOrgDetailsAction } from "@/actions/b2b/getOrgDetailsAction";
import { inviteEmailsAction } from "@/actions/b2b/inviteEmailsAction";
import { revokeInviteAction } from "@/actions/b2b/revokeInviteAction";
import type { UserLookupResult } from "@/actions/b2b/lookupUserByEmailAction";
import type { InviteRow } from "@/actions/b2b/getOrgDetailsAction";

const EXAM_TYPES = [
  "NEET UG",
  "NEET PG",
  "JEE Main 2025",
  "JEE Advanced",
  "CAT",
  "GATE",
  "UPSC CSE Prelims",
  "CA Foundation",
  "CA Intermediate",
  "CA Final",
  "CLAT UG",
  "CUET",
  "CBSE Class 12",
  "GRE",
  "SAT",
  "GMAT",
  "INI-CET",
  "NDA",
  "Other",
];

const ROLES = ["student", "faculty", "admin", "parent"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dt: string) {
  return new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-");
}

function ColorSwatch({ primary, accent }: { primary: string; accent: string }) {
  return (
    <span className="inline-flex gap-0.5">
      <span
        className="inline-block size-3.5 rounded-sm border border-black/10"
        style={{ background: primary }}
        title={primary}
      />
      <span
        className="inline-block size-3.5 rounded-sm border border-black/10"
        style={{ background: accent }}
        title={accent}
      />
    </span>
  );
}

// ─── Sub-component: New Org Inline Form ───────────────────────────────────────

function NewOrgForm({
  onCreated,
}: {
  onCreated: (org: OrgRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primary, setPrimary] = useState("#FF7A00");
  const [accent, setAccent] = useState("#FAF7F2");
  const [logoUrl, setLogoUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    setSlug(slugify(v));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    startTransition(async () => {
      const res = await createOrganizationAction({
        name: name.trim(),
        slug: slug.trim(),
        primary_color: primary,
        accent_color: accent,
        logo_url: logoUrl.trim() || null,
        custom_domain: domain.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const now = new Date().toISOString();
      onCreated({
        id: res.orgId,
        name: name.trim(),
        slug: slug.trim(),
        logo_url: logoUrl.trim() || null,
        primary_color: primary,
        accent_color: accent,
        custom_domain: domain.trim() || null,
        settings: {},
        created_at: now,
        updated_at: now,
        student_count: 0,
      });
      setName("");
      setSlug("");
      setPrimary("#FF7A00");
      setAccent("#FAF7F2");
      setLogoUrl("");
      setDomain("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-kal-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Plus className="size-3.5" />
        New Organization
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-kal-accent/30 bg-kal-accent/[0.04] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-kal-accent">
          New Organization
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-kal-muted hover:text-kal-text"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
            Name *
          </label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Aakash Institute"
            className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
            Slug *
          </label>
          <input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="aakash-institute"
            className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 font-mono text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
            Primary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="size-9 cursor-pointer rounded border border-kal-border bg-transparent p-0.5"
            />
            <span className="font-mono text-xs text-kal-text-secondary">{primary}</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
            Accent / Background Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="size-9 cursor-pointer rounded border border-kal-border bg-transparent p-0.5"
            />
            <span className="font-mono text-xs text-kal-text-secondary">{accent}</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
            Logo URL
          </label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://cdn.example.com/logo.png"
            className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
            Custom Domain
          </label>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="app.aakash.com"
            className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-kal-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Create
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-kal-border px-4 py-2 text-xs font-medium text-kal-text-secondary hover:border-kal-accent/30 hover:text-kal-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Sub-component: Org Detail ────────────────────────────────────────────────

function OrgDetail({
  org,
  onBack,
  onOrgUpdated,
}: {
  org: OrgRow;
  onBack: () => void;
  onOrgUpdated: (updated: Partial<OrgRow> & { id: string }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // ── Edit state ──
  const [editName, setEditName] = useState(org.name);
  const [editPrimary, setEditPrimary] = useState(org.primary_color);
  const [editAccent, setEditAccent] = useState(org.accent_color);
  const [editLogo, setEditLogo] = useState(org.logo_url ?? "");
  const [editDomain, setEditDomain] = useState(org.custom_domain ?? "");
  const [editError, setEditError] = useState<string | null>(null);
  const [editOk, setEditOk] = useState(false);

  // ── Batch state ──
  const [batches, setBatches] = useState<BatchRow[] | null>(null);
  const [batchName, setBatchName] = useState("");
  const [batchExam, setBatchExam] = useState(EXAM_TYPES[0]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchOk, setBatchOk] = useState(false);

  // ── Member state ──
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ── Invitation state ──
  const [invitations, setInvitations] = useState<InviteRow[] | null>(null);
  // Single-add form
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  // Bulk form
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<typeof ROLES[number]>("student");
  const [inviteBatchId, setInviteBatchId] = useState("");
  const [inviteResult, setInviteResult] = useState<{
    invited: number;
    linked: number;
  } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const [emailSearch, setEmailSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserLookupResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [linkRole, setLinkRole] = useState<typeof ROLES[number]>("student");
  const [linkBatchId, setLinkBatchId] = useState<string>("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkOk, setLinkOk] = useState<string | null>(null);

  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Load detail data once on mount.
  useEffect(() => {
    setDetailLoading(true);
    getOrgDetailsAction(org.id).then((res) => {
      setDetailLoading(false);
      if (!res.ok) {
        setDetailError(res.error);
        return;
      }
      setBatches(res.batches);
      setMembers(res.members);
      setInvitations(res.invitations);
      if (res.batches.length > 0) {
        setLinkBatchId(res.batches[0].id);
        setInviteBatchId(res.batches[0].id);
      }
    });
  }, [org.id]);

  // ── Edit save ──
  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    setEditOk(false);
    startTransition(async () => {
      const res = await updateOrganizationAction({
        orgId: org.id,
        name: editName.trim(),
        logo_url: editLogo.trim() || null,
        primary_color: editPrimary,
        accent_color: editAccent,
        custom_domain: editDomain.trim() || null,
      });
      if (!res.ok) {
        setEditError(res.error);
        return;
      }
      setEditOk(true);
      onOrgUpdated({
        id: org.id,
        name: editName.trim(),
        logo_url: editLogo.trim() || null,
        primary_color: editPrimary,
        accent_color: editAccent,
        custom_domain: editDomain.trim() || null,
      });
      router.refresh();
    });
  }

  // ── Create batch ──
  function handleAddBatch(e: React.FormEvent) {
    e.preventDefault();
    setBatchError(null);
    setBatchOk(false);
    if (!batchName.trim()) {
      setBatchError("Batch name is required.");
      return;
    }
    startTransition(async () => {
      const res = await createBatchAction({
        orgId: org.id,
        name: batchName.trim(),
        exam_type: batchExam,
      });
      if (!res.ok) {
        setBatchError(res.error);
        return;
      }
      setBatches((prev) => [
        ...(prev ?? []),
        {
          id: res.batchId,
          organization_id: org.id,
          name: res.name,
          exam_type: res.exam_type,
          created_at: res.created_at,
        },
      ]);
      setBatchOk(true);
      setBatchName("");
    });
  }

  // ── User lookup ──
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setSearchResults(null);
    setLinkOk(null);
    startTransition(async () => {
      const res = await lookupUserByEmailAction(emailSearch);
      if (!res.ok) {
        setSearchError(res.error);
        return;
      }
      if (res.users.length === 0) {
        setSearchError("No users found matching that email.");
        return;
      }
      setSearchResults(res.users);
    });
  }

  // ── Link user ──
  function handleLink(u: UserLookupResult) {
    setLinkError(null);
    setLinkOk(null);
    startTransition(async () => {
      const res = await linkUserToOrganizationAction({
        userId: u.id,
        organizationId: org.id,
        batchId: linkBatchId || null,
        role: linkRole,
      });
      if (!res.ok) {
        setLinkError(res.error);
        return;
      }
      setLinkOk(u.email);
      setSearchResults(null);
      setEmailSearch("");
      // Optimistically add to members list.
      const newMember: MemberRow = {
        user_id: u.id,
        organization_id: org.id,
        batch_id: linkBatchId || null,
        batch_name: batches?.find((b) => b.id === linkBatchId)?.name ?? null,
        role: linkRole,
        joined_at: new Date().toISOString(),
        full_name: u.full_name,
        email: u.email,
      };
      setMembers((prev) => {
        const existing = prev?.find((m) => m.user_id === u.id);
        if (existing) {
          return (prev ?? []).map((m) =>
            m.user_id === u.id ? { ...m, ...newMember } : m,
          );
        }
        return [newMember, ...(prev ?? [])];
      });
    });
  }

  // ── Remove member ──
  function handleRemove(userId: string) {
    if (removeConfirm !== userId) {
      setRemoveConfirm(userId);
      return;
    }
    setRemoveConfirm(null);
    setRemoveError(null);
    startTransition(async () => {
      const res = await removeMemberAction(userId, org.id);
      if (!res.ok) {
        setRemoveError(res.error);
        return;
      }
      setMembers((prev) => (prev ?? []).filter((m) => m.user_id !== userId));
    });
  }

  // ── Send invitations (single-add with name) ──
  function handleSingleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteResult(null);
    if (!singleEmail.trim()) {
      setInviteError("Enter an email address.");
      return;
    }
    startTransition(async () => {
      const res = await inviteEmailsAction({
        orgId: org.id,
        invitees: [{ email: singleEmail.trim(), full_name: singleName.trim() || undefined }],
        batchId: inviteBatchId || null,
        role: inviteRole,
      });
      if (!res.ok) {
        setInviteError(res.error);
        return;
      }
      setInviteResult({ invited: res.invited, linked: res.linked });
      setSingleName("");
      setSingleEmail("");
      getOrgDetailsAction(org.id).then((r) => {
        if (r.ok) setInvitations(r.invitations);
      });
    });
  }

  // ── Send invitations (bulk paste) ──
  function handleBulkInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteResult(null);
    if (!inviteEmails.trim()) {
      setInviteError("Enter at least one email address.");
      return;
    }
    // Split on whitespace / commas / semicolons client-side.
    const emails = inviteEmails
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));
    if (emails.length === 0) {
      setInviteError("No valid email addresses found.");
      return;
    }
    startTransition(async () => {
      const res = await inviteEmailsAction({
        orgId: org.id,
        invitees: emails.map((email) => ({ email })),
        batchId: inviteBatchId || null,
        role: inviteRole,
      });
      if (!res.ok) {
        setInviteError(res.error);
        return;
      }
      setInviteResult({ invited: res.invited, linked: res.linked });
      setInviteEmails("");
      getOrgDetailsAction(org.id).then((r) => {
        if (r.ok) setInvitations(r.invitations);
      });
    });
  }

  // ── Revoke invitation ──
  function handleRevoke(inviteId: string) {
    setRevokeError(null);
    startTransition(async () => {
      const res = await revokeInviteAction(inviteId, org.id);
      if (!res.ok) {
        setRevokeError(res.error);
        return;
      }
      setInvitations((prev) => (prev ?? []).filter((i) => i.id !== inviteId));
    });
  }

  const isLoading = detailLoading || pending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-kal-muted hover:text-kal-text"
        >
          <ArrowLeft className="size-4" />
          All Organizations
        </button>
        <span className="text-kal-border">/</span>
        <span className="text-sm font-semibold text-kal-text">{org.name}</span>
        <span className="ml-auto rounded-full bg-kal-card border border-kal-border px-2.5 py-0.5 font-mono text-[10px] text-kal-muted">
          {org.slug}
        </span>
      </div>

      {/* Edit panel */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-kal-border bg-kal-card/40 p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-kal-text">Organization Details</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Name
            </label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Logo URL
            </label>
            <input
              value={editLogo}
              onChange={(e) => setEditLogo(e.target.value)}
              placeholder="https://cdn.example.com/logo.png"
              className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={editPrimary}
                onChange={(e) => setEditPrimary(e.target.value)}
                className="size-9 cursor-pointer rounded border border-kal-border bg-transparent p-0.5"
              />
              <span className="font-mono text-xs text-kal-text-secondary">{editPrimary}</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Accent / Background Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={editAccent}
                onChange={(e) => setEditAccent(e.target.value)}
                className="size-9 cursor-pointer rounded border border-kal-border bg-transparent p-0.5"
              />
              <span className="font-mono text-xs text-kal-text-secondary">{editAccent}</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Custom Domain
            </label>
            <input
              value={editDomain}
              onChange={(e) => setEditDomain(e.target.value)}
              placeholder="app.institute.com"
              className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            />
          </div>
        </div>

        {/* Branding preview */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-kal-border/60 bg-kal-card/60 px-4 py-3">
          <div
            className="flex h-10 w-24 items-center justify-center rounded-lg text-xs font-bold text-white shadow"
            style={{ background: editPrimary }}
          >
            Primary
          </div>
          <div
            className="flex h-10 w-24 items-center justify-center rounded-lg border border-kal-border text-xs font-bold text-kal-text shadow"
            style={{ background: editAccent }}
          >
            Accent
          </div>
          {editLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={editLogo}
              alt="Logo preview"
              className="h-10 max-w-[6rem] rounded object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <p className="ml-auto text-[10px] text-kal-muted">Live branding preview</p>
        </div>

        {editError && <p className="mt-2 text-xs text-red-500">{editError}</p>}
        {editOk && (
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-500">
            <Check className="size-3.5" /> Saved.
          </p>
        )}

        <div className="mt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-kal-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Save Changes
          </button>
        </div>
      </form>

      {/* Batches card */}
      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-5">
        <h2 className="mb-4 text-sm font-semibold text-kal-text">Batches</h2>

        {detailLoading ? (
          <p className="text-xs text-kal-muted">Loading…</p>
        ) : batches && batches.length > 0 ? (
          <table className="mb-4 w-full text-xs">
            <thead>
              <tr className="border-b border-kal-border text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Exam</th>
                <th className="pb-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kal-border/40">
              {batches.map((b) => (
                <tr key={b.id}>
                  <td className="py-2 pr-4 font-medium text-kal-text">{b.name}</td>
                  <td className="py-2 pr-4 text-kal-text-secondary">{b.exam_type}</td>
                  <td className="py-2 tabular-nums text-kal-muted">{fmt(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !detailLoading && (
            <p className="mb-4 text-xs text-kal-muted">No batches yet.</p>
          )
        )}

        {/* Add batch form */}
        <form
          onSubmit={handleAddBatch}
          className="flex flex-wrap items-end gap-2 border-t border-kal-border/60 pt-4"
        >
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Batch Name
            </label>
            <input
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="NEET 2027 Batch A"
              className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Exam Type
            </label>
            <select
              value={batchExam}
              onChange={(e) => setBatchExam(e.target.value)}
              className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            >
              {EXAM_TYPES.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-kal-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            Add Batch
          </button>
          {batchError && (
            <span className="w-full text-xs text-red-500">{batchError}</span>
          )}
          {batchOk && (
            <span className="flex w-full items-center gap-1 text-xs text-emerald-500">
              <Check className="size-3.5" /> Batch added.
            </span>
          )}
        </form>
      </div>

      {/* Invitations card */}
      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-kal-text">Email Allowlist</h2>
            <p className="mt-0.5 text-xs text-kal-muted">
              Students sign up at{" "}
              <span className="font-mono">kalnehi.com/auth</span>. On their first
              login, they are automatically added to this org. Already-registered
              users are linked immediately.
            </p>
          </div>
        </div>

        {/* Role + Batch selectors — shared by both sub-forms */}
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof ROLES[number])}
              className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {batches && batches.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
                Batch (optional)
              </label>
              <select
                value={inviteBatchId}
                onChange={(e) => setInviteBatchId(e.target.value)}
                className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
              >
                <option value="">— No batch —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Single-add form: name + email */}
        <form
          onSubmit={handleSingleInvite}
          className="mb-3 rounded-xl border border-kal-border/60 bg-kal-card/60 p-4"
        >
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-kal-muted">
            Add one student (with name)
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
                Name (optional)
              </label>
              <input
                type="text"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="Arjun Sharma"
                className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
                Email *
              </label>
              <input
                type="email"
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !singleEmail.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-kal-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Add
            </button>
          </div>
        </form>

        {/* Bulk-paste form */}
        <form
          onSubmit={handleBulkInvite}
          className="mb-4 rounded-xl border border-kal-border/60 bg-kal-card/60 p-4"
        >
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-kal-muted">
            Or paste multiple emails (one per line)
          </p>
          <div className="space-y-2">
            <textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              rows={3}
              placeholder={"student1@example.com\nstudent2@example.com, student3@example.com"}
              className="w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 font-mono text-xs text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            />
            <button
              type="submit"
              disabled={isLoading || !inviteEmails.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-kal-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Add All to Allowlist
            </button>
          </div>
        </form>

        {inviteError && (
          <p className="mb-3 text-xs text-red-500">{inviteError}</p>
        )}
        {inviteResult && (
          <p className="mb-3 flex items-center gap-1 text-xs text-emerald-500">
            <Check className="size-3.5" />
            {inviteResult.invited} email{inviteResult.invited !== 1 ? "s" : ""} added
            {inviteResult.linked > 0 &&
              ` — ${inviteResult.linked} linked & Smart Plan granted immediately`}
            .
          </p>
        )}

        {/* Pending invitations table */}
        {revokeError && (
          <p className="mb-3 text-xs text-red-500">{revokeError}</p>
        )}
        {detailLoading ? (
          <p className="text-xs text-kal-muted">Loading…</p>
        ) : invitations && invitations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-kal-border text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Batch</th>
                  <th className="pb-2 pr-4">Added</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-kal-border/40">
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2 pr-4 font-medium text-kal-text">
                      {inv.full_name ?? <span className="text-kal-muted">—</span>}
                    </td>
                    <td className="py-2 pr-4 font-mono text-kal-text">
                      {inv.email}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="rounded-full border border-kal-border bg-kal-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                        {inv.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-kal-muted">
                      {batches?.find((b) => b.id === inv.batch_id)?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-kal-muted">
                      {fmt(inv.invited_at)}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleRevoke(inv.id)}
                        title="Remove from allowlist"
                        className="text-kal-muted hover:text-red-500 disabled:opacity-30"
                      >
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !detailLoading && (
            <p className="text-xs text-kal-muted">
              No pending invitations. Use the form above to pre-approve student
              emails.
            </p>
          )
        )}
      </div>

      {/* Members card */}
      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-5">
        <h2 className="mb-4 text-sm font-semibold text-kal-text">Members</h2>

        {/* Email search */}
        <form onSubmit={handleSearch} className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Find User by Email
            </label>
            <input
              type="email"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              placeholder="student@example.com"
              className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Role
            </label>
            <select
              value={linkRole}
              onChange={(e) => setLinkRole(e.target.value as typeof ROLES[number])}
              className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {batches && batches.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
                Batch (optional)
              </label>
              <select
                value={linkBatchId}
                onChange={(e) => setLinkBatchId(e.target.value)}
                className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
              >
                <option value="">— No batch —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || !emailSearch.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-kal-border px-4 py-2 text-xs font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent disabled:opacity-50"
          >
            <Search className="size-3.5" />
            Find User
          </button>
        </form>

        {searchError && <p className="mb-3 text-xs text-red-500">{searchError}</p>}
        {linkError && <p className="mb-3 text-xs text-red-500">{linkError}</p>}
        {linkOk && (
          <p className="mb-3 flex items-center gap-1 text-xs text-emerald-500">
            <Check className="size-3.5" /> {linkOk} linked to this organization.
          </p>
        )}

        {/* Search results */}
        {searchResults && searchResults.length > 0 && (
          <div className="mb-4 space-y-1.5 rounded-xl border border-kal-border/60 bg-kal-card/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
              Confirm user to link
            </p>
            {searchResults.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-4 rounded-lg bg-kal-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-kal-text">
                    {u.full_name ?? "—"}
                  </p>
                  <p className="truncate text-xs text-kal-muted">{u.email}</p>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleLink(u)}
                  className="shrink-0 flex items-center gap-1 rounded-lg bg-kal-accent/10 px-3 py-1.5 text-xs font-semibold text-kal-accent hover:bg-kal-accent/20 disabled:opacity-50"
                >
                  Link
                </button>
              </div>
            ))}
          </div>
        )}

        {removeError && <p className="mb-3 text-xs text-red-500">{removeError}</p>}
        {detailError && <p className="mb-3 text-xs text-red-500">{detailError}</p>}

        {/* Member table */}
        {detailLoading ? (
          <p className="text-xs text-kal-muted">Loading members…</p>
        ) : members && members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-kal-border text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Batch</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2 pr-4">Plan</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-kal-border/40">
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td className="py-2 pr-4 font-medium text-kal-text">
                      {m.full_name ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-kal-text-secondary">{m.email ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <span className="rounded-full bg-kal-card border border-kal-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-kal-muted">{m.batch_name ?? "—"}</td>
                    <td className="py-2 pr-4 tabular-nums text-kal-muted">
                      {fmt(m.joined_at)}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Check className="size-2.5" />
                        Plan Active
                      </span>
                    </td>
                    <td className="py-2">
                      {removeConfirm === m.user_id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleRemove(m.user_id)}
                            className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500 hover:bg-red-500/20"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemoveConfirm(null)}
                            className="rounded bg-kal-card border border-kal-border px-2 py-0.5 text-[10px] text-kal-muted hover:text-kal-text"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemove(m.user_id)}
                          disabled={isLoading}
                          title="Remove member"
                          className="text-kal-muted hover:text-red-500 disabled:opacity-30"
                        >
                          <UserMinus className="size-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !detailLoading && (
            <p className="text-xs text-kal-muted">No members yet. Use the search above to link a user.</p>
          )
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminOrganizationsClient({
  initialOrgs,
}: {
  initialOrgs: OrgRow[];
}) {
  const [orgs, setOrgs] = useState<OrgRow[]>(initialOrgs);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedOrg = orgs.find((o) => o.id === selectedId) ?? null;

  function handleOrgCreated(org: OrgRow) {
    setOrgs((prev) => [org, ...prev]);
  }

  function handleOrgUpdated(updated: Partial<OrgRow> & { id: string }) {
    setOrgs((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
    );
  }

  // ── Detail view ──
  if (selectedOrg) {
    return (
      <div className="space-y-6 p-0">
        <OrgDetail
          org={selectedOrg}
          onBack={() => setSelectedId(null)}
          onOrgUpdated={handleOrgUpdated}
        />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-kal-text">Organizations</h1>
          <p className="mt-1 text-sm text-kal-muted">
            Manage B2B institutions, their batches, and student memberships.
          </p>
        </div>
        <NewOrgForm onCreated={handleOrgCreated} />
      </div>

      {orgs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-kal-border py-16">
          <Building2 className="size-8 text-kal-border" />
          <p className="text-sm text-kal-muted">No organizations yet.</p>
          <p className="text-xs text-kal-muted">
            Click "New Organization" above to onboard your first institution.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kal-border text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                <th className="px-4 pb-2 pt-3">Name</th>
                <th className="px-4 pb-2 pt-3">Slug</th>
                <th className="px-4 pb-2 pt-3">Colors</th>
                <th className="px-4 pb-2 pt-3 text-right">Students</th>
                <th className="px-4 pb-2 pt-3">Created</th>
                <th className="px-4 pb-2 pt-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-kal-border/40">
              {orgs.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className="cursor-pointer transition-colors hover:bg-kal-accent/[0.04]"
                >
                  <td className="px-4 py-3 font-medium text-kal-text">{o.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-kal-muted">{o.slug}</td>
                  <td className="px-4 py-3">
                    <ColorSwatch primary={o.primary_color} accent={o.accent_color} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-kal-text">
                    {o.student_count}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs text-kal-muted">
                    {fmt(o.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-kal-accent">Manage →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
