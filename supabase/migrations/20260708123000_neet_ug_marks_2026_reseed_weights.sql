-- Refresh NEET UG marks_2026 (per-UNIT weights matching `syllabus_master.chapter`).
-- Totals: Physics 180, Chemistry 179, Biology 360 (combined 719).
-- Idempotent: NULL all NEET UG marks_2026, then set rows below.

UPDATE public.chapter_marks SET marks_2026 = NULL WHERE exam_name = 'NEET UG';

UPDATE public.chapter_marks SET marks_2026 = v.m
FROM (VALUES
  ('NEET UG', 'Physics', 'UNIT 1: UNITS AND MEASUREMENTS', 4),
  ('NEET UG', 'Physics', 'UNIT 2: KINEMATICS', 3),
  ('NEET UG', 'Physics', 'UNIT 3: LAWS OF MOTION', 11),
  ('NEET UG', 'Physics', 'UNIT 4: WORK, ENERGY AND POWER', 7),
  ('NEET UG', 'Physics', 'UNIT 5: ROTATIONAL MOTION', 17),
  ('NEET UG', 'Physics', 'UNIT 6: GRAVITATION', 7),
  ('NEET UG', 'Physics', 'UNIT 7: PROPERTIES OF SOLIDS AND LIQUIDS', 14),
  ('NEET UG', 'Physics', 'UNIT 8: THERMODYNAMICS', 11),
  ('NEET UG', 'Physics', 'UNIT 9: KINETIC THEORY OF GASES', 4),
  ('NEET UG', 'Physics', 'UNIT 10: OSCILLATIONS AND WAVES', 11),
  ('NEET UG', 'Physics', 'UNIT 11: ELECTROSTATICS', 11),
  ('NEET UG', 'Physics', 'UNIT 12: CURRENT ELECTRICITY', 11),
  ('NEET UG', 'Physics', 'UNIT 13: MAGNETIC EFFECTS OF CURRENT AND MAGNETISM', 11),
  ('NEET UG', 'Physics', 'UNIT 14: ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS', 8),
  ('NEET UG', 'Physics', 'UNIT 15: ELECTROMAGNETIC WAVES', 4),
  ('NEET UG', 'Physics', 'UNIT 16: OPTICS', 17),
  ('NEET UG', 'Physics', 'UNIT 17: DUAL NATURE OF MATTER AND RADIATION', 7),
  ('NEET UG', 'Physics', 'UNIT 18: ATOMS AND NUCLEI', 7),
  ('NEET UG', 'Physics', 'UNIT 19: ELECTRONIC DEVICES', 11),
  ('NEET UG', 'Physics', 'UNIT 20: EXPERIMENTAL SKILLS', 4),
  ('NEET UG', 'Chemistry', 'UNIT 1: SOME BASIC CONCEPTS IN CHEMISTRY', 8),
  ('NEET UG', 'Chemistry', 'UNIT 2: ATOMIC STRUCTURE', 4),
  ('NEET UG', 'Chemistry', 'UNIT 3: CHEMICAL BONDING AND MOLECULAR STRUCTURE', 16),
  ('NEET UG', 'Chemistry', 'UNIT 4: CHEMICAL THERMODYNAMICS', 4),
  ('NEET UG', 'Chemistry', 'UNIT 5: SOLUTIONS', 9),
  ('NEET UG', 'Chemistry', 'UNIT 6: EQUILIBRIUM', 12),
  ('NEET UG', 'Chemistry', 'UNIT 7: REDOX REACTIONS AND ELECTROCHEMISTRY', 9),
  ('NEET UG', 'Chemistry', 'UNIT 8: CHEMICAL KINETICS', 9),
  ('NEET UG', 'Chemistry', 'UNIT 9: CLASSIFICATION OF ELEMENTS AND PERIODICITY IN PROPERTIES', 12),
  ('NEET UG', 'Chemistry', 'UNIT 10: p-BLOCK ELEMENTS', 12),
  ('NEET UG', 'Chemistry', 'UNIT 11: d- AND f-BLOCK ELEMENTS', 9),
  ('NEET UG', 'Chemistry', 'UNIT 12: COORDINATION COMPOUNDS', 9),
  ('NEET UG', 'Chemistry', 'UNIT 13: PURIFICATION AND CHARACTERISATION OF ORGANIC COMPOUNDS', 5),
  ('NEET UG', 'Chemistry', 'UNIT 14: SOME BASIC PRINCIPLES OF ORGANIC CHEMISTRY', 8),
  ('NEET UG', 'Chemistry', 'UNIT 15: HYDROCARBONS', 8),
  ('NEET UG', 'Chemistry', 'UNIT 16: ORGANIC COMPOUNDS CONTAINING HALOGENS', 8),
  ('NEET UG', 'Chemistry', 'UNIT 17: ORGANIC COMPOUNDS CONTAINING OXYGEN', 16),
  ('NEET UG', 'Chemistry', 'UNIT 18: ORGANIC COMPOUNDS CONTAINING NITROGEN', 8),
  ('NEET UG', 'Chemistry', 'UNIT 19: BIOMOLECULES', 8),
  ('NEET UG', 'Chemistry', 'UNIT 20: PRINCIPLES RELATED TO PRACTICAL CHEMISTRY', 5),
  ('NEET UG', 'Biology', 'UNIT 1: DIVERSITY IN THE LIVING WORLD', 34),
  ('NEET UG', 'Biology', 'UNIT 2: STRUCTURAL ORGANISATION IN ANIMALS AND PLANTS', 21),
  ('NEET UG', 'Biology', 'UNIT 3: CELL STRUCTURE AND FUNCTION', 29),
  ('NEET UG', 'Biology', 'UNIT 4: PLANT PHYSIOLOGY', 38),
  ('NEET UG', 'Biology', 'UNIT 5: HUMAN PHYSIOLOGY', 58),
  ('NEET UG', 'Biology', 'UNIT 6: REPRODUCTION', 46),
  ('NEET UG', 'Biology', 'UNIT 7: GENETICS AND EVOLUTION', 66),
  ('NEET UG', 'Biology', 'UNIT 8: BIOLOGY AND HUMAN WELFARE', 9),
  ('NEET UG', 'Biology', 'UNIT 9: BIOTECHNOLOGY AND ITS APPLICATIONS', 13),
  ('NEET UG', 'Biology', 'UNIT 10: ECOLOGY AND ENVIRONMENT', 46)
) AS v(exam, subj, ch, m)
WHERE chapter_marks.exam_name = v.exam
  AND chapter_marks.subject = v.subj
  AND chapter_marks.chapter = v.ch;
