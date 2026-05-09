import assert from "node:assert/strict";
import test from "node:test";

import { resolveAuthenticatedWaitlistContactEmail } from "./joinContactEmail";

test("accepts when body email matches session email (normalized)", () => {
  const r = resolveAuthenticatedWaitlistContactEmail("a@b.com", "A@B.COM");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.contactEmail, "a@b.com");
});

test("rejects when session has no email", () => {
  const r = resolveAuthenticatedWaitlistContactEmail("a@b.com", null);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /account does not have an email/i);
});

test("rejects when body email differs from session", () => {
  const r = resolveAuthenticatedWaitlistContactEmail("evil@x.com", "good@y.com");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /match the address you signed in/i);
});
