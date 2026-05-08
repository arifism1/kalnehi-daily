-- Personal Motivation: seal letter until future open date ("Letter to Future Self").

alter table public.motivation_letters
  add column if not exists sealed boolean not null default false;

alter table public.motivation_letters
  add column if not exists open_date date;

comment on column public.motivation_letters.sealed is 'When true, client hides body until open_date.';
comment on column public.motivation_letters.open_date is 'First calendar day the sealed letter can be opened; null if not sealed.';
