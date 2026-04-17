-- SSC / banking target exams: exam_name matches syllabus_master.exam_name.
-- max_score = official-style written exam totals used for projection caps (examScoreMax / PrepBrain).
-- Sources: SSC examination scheme (ssc.nic.in notifications); SBI/IBPS PO mains patterns (official recruitment PDFs and IBPS CWE specifications).

INSERT INTO public.exams (exam_name, display_name, sort_order, max_score, multi_subject)
VALUES
  -- SSC CHSL: Tier-II Computer Based Examination total (Section-I + Section-II + Section-III scored MCQs; Tier-I is qualifying; skill/typing tests are qualifying, not added here). Typical notified total 405.
  ('SSC CHSL', 'SSC CHSL', 54, 405, false),
  -- SSC CGL: Tier-II Paper-I (compulsory for all posts) total marks; Tier-I CBT is qualifying for shortlisting and not counted in final merit for the standard scheme. Optional Paper-II/III (JSO/AAO) excluded — this is the common merit denominator.
  ('SSC CGL', 'SSC CGL', 55, 450, false),
  -- IBPS PO CWE Mains: 200 (objective) + 25 (English descriptive). Interview is separate and not included in this written-total cap.
  ('IBPS PO', 'IBPS PO', 56, 225, false),
  -- SBI PO Phase-II (Mains): 200 (objective) + 50 (descriptive English). Interview is separate.
  ('SBI PO', 'SBI PO', 57, 250, false)
ON CONFLICT (exam_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  sort_order = EXCLUDED.sort_order,
  max_score = EXCLUDED.max_score,
  multi_subject = EXCLUDED.multi_subject;
