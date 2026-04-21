-- Revision reminders: optional notes, workflow status, PrepBrain source flag.

alter table public.user_revision_queue_items
  add column if not exists notes text not null default '',
  add column if not exists status text not null default 'pending',
  add column if not exists reminder_source text not null default 'manual';

alter table public.user_revision_queue_items
  drop constraint if exists user_revision_queue_items_notes_len;

alter table public.user_revision_queue_items
  add constraint user_revision_queue_items_notes_len
    check (char_length(notes) <= 5000);

alter table public.user_revision_queue_items
  drop constraint if exists user_revision_queue_items_status_chk;

alter table public.user_revision_queue_items
  add constraint user_revision_queue_items_status_chk
    check (status in ('pending', 'done', 'archived'));

alter table public.user_revision_queue_items
  drop constraint if exists user_revision_queue_items_reminder_source_chk;

alter table public.user_revision_queue_items
  add constraint user_revision_queue_items_reminder_source_chk
    check (reminder_source in ('manual', 'suggested'));

comment on column public.user_revision_queue_items.notes is 'Optional student notes for this revision reminder.';
comment on column public.user_revision_queue_items.status is 'Reminder workflow: pending, done, or archived.';
comment on column public.user_revision_queue_items.reminder_source is 'manual = user-created; suggested = reserved for PrepBrain / smart suggestions.';
