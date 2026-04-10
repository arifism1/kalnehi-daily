-- Replace exam- or curriculum-specific wording with neutral competitive-prep copy.
UPDATE public.daily_motivational_phrases
SET phrase = 'If you want exam-day recall, earn it with honest repetition—not last-week cramming.'
WHERE phrase = 'If you want NEET-level recall, give NEET-level repetition.';

UPDATE public.daily_motivational_phrases
SET phrase = 'Tough papers reward problem intuition built from hundreds of honest attempts.'
WHERE phrase = 'JEE rewards problem intuition built from hundreds of honest attempts.';

UPDATE public.daily_motivational_phrases
SET phrase = 'The longest syllabi reward patience with books when the world offers noise.'
WHERE phrase = 'UPSC rewards patience with books when the world offers noise.';

UPDATE public.daily_motivational_phrases
SET phrase = 'One clear hour on your core text beats three fuzzy hours on random PDFs.'
WHERE phrase = 'One clear hour on NCERT beats three fuzzy hours on random PDFs.';
