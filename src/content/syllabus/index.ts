export interface SyllabusChapter {
  name: string;
  topics: string[];
}

export interface SyllabusSubject {
  name: string;
  chapters: SyllabusChapter[];
}

export interface SyllabusData {
  slug: string;
  exam: string;
  fullName: string;
  conductedBy: string;
  lastUpdated: string;
  description: string;
  subjects: SyllabusSubject[];
  importantNotes: string[];
}

const jeeMain: SyllabusData = {
  slug: "jee-main",
  exam: "JEE Main",
  fullName: "Joint Entrance Examination Main",
  conductedBy: "National Testing Agency (NTA)",
  lastUpdated: "2024",
  description: "JEE Main tests Physics, Chemistry, and Mathematics from Class 11 and 12 NCERT curriculum. The exam has two sessions per year (January and April). Scoring well in JEE Main unlocks direct admission to NITs, IIITs, and GFTIs, and qualifies students for JEE Advanced.",
  subjects: [
    {
      name: "Physics",
      chapters: [
        { name: "Mechanics", topics: ["Units and Dimensions", "Motion in a Straight Line", "Motion in a Plane", "Laws of Motion", "Work, Energy and Power", "System of Particles and Rotational Motion", "Gravitation"] },
        { name: "Thermodynamics", topics: ["Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory of Gases"] },
        { name: "Oscillations and Waves", topics: ["Oscillations (SHM)", "Waves", "Sound Waves"] },
        { name: "Electrostatics", topics: ["Electric Charges and Fields", "Electrostatic Potential and Capacitance"] },
        { name: "Current Electricity", topics: ["Current Electricity", "Moving Charges and Magnetism", "Magnetism and Matter"] },
        { name: "Electromagnetic Induction", topics: ["Electromagnetic Induction", "Alternating Current", "Electromagnetic Waves"] },
        { name: "Optics", topics: ["Ray Optics and Optical Instruments", "Wave Optics"] },
        { name: "Modern Physics", topics: ["Dual Nature of Radiation and Matter", "Atoms", "Nuclei", "Semiconductor Electronics"] },
      ],
    },
    {
      name: "Chemistry",
      chapters: [
        { name: "Physical Chemistry", topics: ["Some Basic Concepts of Chemistry", "Structure of Atom", "States of Matter", "Chemical Thermodynamics", "Equilibrium", "Redox Reactions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry"] },
        { name: "Inorganic Chemistry", topics: ["Periodic Table and Properties", "Chemical Bonding", "Hydrogen", "s-Block Elements", "p-Block Elements (Groups 13-18)", "d-Block and f-Block Elements", "Coordination Compounds"] },
        { name: "Organic Chemistry", topics: ["Basic Concepts", "Hydrocarbons", "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers", "Aldehydes, Ketones and Carboxylic Acids", "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life"] },
      ],
    },
    {
      name: "Mathematics",
      chapters: [
        { name: "Algebra", topics: ["Sets, Relations and Functions", "Complex Numbers", "Quadratic Equations", "Progressions and Series", "Permutations and Combinations", "Binomial Theorem", "Matrices and Determinants", "Mathematical Induction"] },
        { name: "Calculus", topics: ["Limits and Derivatives", "Continuity and Differentiability", "Applications of Derivatives", "Integrals", "Applications of Integrals", "Differential Equations"] },
        { name: "Coordinate Geometry", topics: ["Straight Lines", "Circles", "Conic Sections (Parabola, Ellipse, Hyperbola)", "3D Geometry"] },
        { name: "Trigonometry", topics: ["Trigonometric Functions", "Inverse Trigonometric Functions"] },
        { name: "Statistics and Probability", topics: ["Statistics", "Probability"] },
        { name: "Vectors", topics: ["Vectors and 3D Geometry", "Vector Algebra"] },
      ],
    },
  ],
  importantNotes: [
    "JEE Main Paper 1 is for B.E./B.Tech aspirants (PCM). Paper 2A is for B.Arch, Paper 2B is for B.Planning.",
    "NTA scores for JEE Main are calculated on a percentile basis, normalised across all sessions.",
    "Top 2.5 lakh JEE Main qualifiers are eligible for JEE Advanced.",
    "Negative marking: -1 for wrong MCQ answers. No negative marking for numerical questions.",
  ],
};

const jeeAdvanced: SyllabusData = {
  slug: "jee-advanced",
  exam: "JEE Advanced",
  fullName: "Joint Entrance Examination Advanced",
  conductedBy: "IITs (rotating responsibility)",
  lastUpdated: "2024",
  description: "JEE Advanced is the gateway to IITs. It is harder than JEE Main in concept depth and question style. Only the top 2.5 lakh JEE Main qualifiers are eligible. The syllabus is similar to JEE Main but with deeper conceptual questions and no direct NCERT reliance.",
  subjects: [
    {
      name: "Physics",
      chapters: [
        { name: "General", topics: ["Units, Dimensions and Errors", "Vernier callipers, Screw gauge"] },
        { name: "Mechanics", topics: ["Kinematics in 1D and 2D", "Newton's Laws", "Friction", "Circular Motion", "Work-Energy Theorem", "Conservation Laws", "Centre of Mass", "Rotational Mechanics", "Gravitation", "Properties of Matter (Elasticity, Fluid Mechanics)"] },
        { name: "Thermal Physics", topics: ["Thermal Expansion", "Calorimetry", "Heat Transfer", "Kinetic Theory of Gases", "Laws of Thermodynamics"] },
        { name: "Electricity and Magnetism", topics: ["Electrostatics (Coulomb's Law, Gauss's Law)", "Capacitors", "Current Electricity (Kirchhoff's Laws, RC circuits)", "Magnetic Force", "Electromagnetic Induction", "Faraday's and Lenz's Laws", "Self and Mutual Inductance", "AC Circuits"] },
        { name: "Optics", topics: ["Reflection", "Refraction", "Prisms", "Lenses", "Interference", "Diffraction", "Polarization", "Optical Instruments"] },
        { name: "Modern Physics", topics: ["Photoelectric Effect", "Bohr's Model", "X-Rays", "Nuclear Physics", "Radioactivity", "Semiconductors"] },
      ],
    },
    {
      name: "Chemistry",
      chapters: [
        { name: "Physical Chemistry", topics: ["Mole Concept", "Atomic Structure", "Chemical Bonding (VSEPR, Hybridization, MO Theory)", "States of Matter", "Thermodynamics (Hess's Law, Spontaneity)", "Chemical Equilibrium (Kp, Kc)", "Ionic Equilibrium (pH, Buffers)", "Electrochemistry", "Chemical Kinetics", "Nuclear Chemistry"] },
        { name: "Inorganic Chemistry", topics: ["Periodic Properties", "s-Block, p-Block, d-Block, f-Block", "Coordination Compounds (Isomerism, VBT, CFT)", "Qualitative Inorganic Analysis"] },
        { name: "Organic Chemistry", topics: ["IUPAC Nomenclature", "Stereochemistry (Geometric, Optical)", "Reaction Mechanisms (SN1, SN2, E1, E2, EAS, NAS)", "Hydrocarbons", "Functional Group Reactions", "Named Reactions (Aldol, Cannizzaro, Hoffmann, etc.)", "Polymers", "Biomolecules"] },
      ],
    },
    {
      name: "Mathematics",
      chapters: [
        { name: "Algebra", topics: ["Complex Numbers (Argument, Modulus, De Moivre's)", "Quadratic Equations", "Progressions (AP, GP, HP)", "Logarithms", "Permutations and Combinations", "Binomial Theorem", "Matrices and Determinants"] },
        { name: "Trigonometry", topics: ["Trigonometric Identities", "Equations", "Properties of Triangles", "Inverse Trigonometric Functions"] },
        { name: "Analytical Geometry", topics: ["Straight Lines", "Circles", "Parabola", "Ellipse", "Hyperbola", "3D Geometry (Planes, Lines)", "Vectors"] },
        { name: "Differential Calculus", topics: ["Functions (Domain, Range, Composition)", "Limits (L'Hopital)", "Continuity and Differentiability", "Applications (Maxima, Minima, Tangents, Normals)"] },
        { name: "Integral Calculus", topics: ["Indefinite Integration (Methods)", "Definite Integration (Properties)", "Area under Curves", "Differential Equations (Variable Separable, Linear)"] },
        { name: "Probability", topics: ["Probability (Classical, Conditional)", "Bayes' Theorem", "Random Variables and Distributions"] },
      ],
    },
  ],
  importantNotes: [
    "JEE Advanced has two papers (Paper 1 and Paper 2), each 3 hours. Both papers are mandatory.",
    "Question types vary: MCQ (single/multiple correct), numerical, paragraph-based. Marking schemes differ.",
    "IIT admission is based on JEE Advanced rank (AIR), not JEE Main score.",
    "Syllabus is not strictly NCERT — many questions require understanding beyond standard textbooks.",
  ],
};

const neet: SyllabusData = {
  slug: "neet",
  exam: "NEET",
  fullName: "National Eligibility cum Entrance Test (Undergraduate)",
  conductedBy: "National Testing Agency (NTA)",
  lastUpdated: "2024",
  description: "NEET is the single national entrance examination for MBBS, BDS, AYUSH, and other medical courses in India. The syllabus is based on Class 11 and 12 NCERT content for Physics, Chemistry, and Biology (Botany + Zoology).",
  subjects: [
    {
      name: "Biology — Botany",
      chapters: [
        { name: "Diversity of Living Organisms", topics: ["The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom"] },
        { name: "Structural Organisation", topics: ["Morphology of Flowering Plants", "Anatomy of Flowering Plants"] },
        { name: "Cell Biology", topics: ["Cell: The Unit of Life", "Biomolecules", "Cell Cycle and Cell Division"] },
        { name: "Plant Physiology", topics: ["Transport in Plants", "Mineral Nutrition", "Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth and Development"] },
        { name: "Reproduction", topics: ["Reproduction in Organisms", "Sexual Reproduction in Flowering Plants"] },
        { name: "Genetics and Evolution", topics: ["Principles of Inheritance and Variation", "Molecular Basis of Inheritance", "Evolution"] },
        { name: "Ecology", topics: ["Organisms and Populations", "Ecosystem", "Biodiversity and Conservation", "Environmental Issues"] },
      ],
    },
    {
      name: "Biology — Zoology",
      chapters: [
        { name: "Structural Organisation", topics: ["Structural Organisation in Animals"] },
        { name: "Human Physiology", topics: ["Digestion and Absorption", "Breathing and Exchange of Gases", "Body Fluids and Circulation", "Excretory Products and Elimination", "Locomotion and Movement", "Neural Control and Coordination", "Chemical Coordination and Integration"] },
        { name: "Reproduction", topics: ["Human Reproduction", "Reproductive Health"] },
        { name: "Biotechnology", topics: ["Biotechnology: Principles and Processes", "Biotechnology and its Applications"] },
        { name: "Biology in Human Welfare", topics: ["Human Health and Disease", "Strategies for Enhancement in Food Production", "Microbes in Human Welfare"] },
      ],
    },
    {
      name: "Physics",
      chapters: [
        { name: "Class 11", topics: ["Physical World and Measurement", "Kinematics", "Laws of Motion", "Work, Energy and Power", "Motion of System of Particles", "Gravitation", "Properties of Bulk Matter", "Thermodynamics", "Kinetic Theory of Gases", "Oscillations and Waves"] },
        { name: "Class 12", topics: ["Electrostatics", "Current Electricity", "Magnetic Effects of Current", "Electromagnetic Induction", "Electromagnetic Waves", "Optics", "Dual Nature of Matter", "Atoms and Nuclei", "Electronic Devices"] },
      ],
    },
    {
      name: "Chemistry",
      chapters: [
        { name: "Class 11", topics: ["Some Basic Concepts", "Structure of Atom", "Classification of Elements", "Chemical Bonding", "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions", "Hydrogen", "s-Block Elements", "Some p-Block Elements", "Organic Chemistry Basics", "Hydrocarbons", "Environmental Chemistry"] },
        { name: "Class 12", topics: ["Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry", "General Principles of Isolation", "p-Block Elements", "d- and f-Block Elements", "Coordination Compounds", "Haloalkanes", "Alcohols, Phenols, Ethers", "Aldehydes, Ketones, Carboxylic Acids", "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life"] },
      ],
    },
  ],
  importantNotes: [
    "NEET is a single 3-hour paper with 180 questions (45 each from Physics, Chemistry, Botany, Zoology).",
    "Negative marking: +4 for correct, -1 for wrong. No negative marking for unattempted.",
    "NCERT Biology is the primary source — most NEET Biology questions are directly from NCERT text.",
    "NEET score is used for admission to government and private medical colleges across all states.",
    "No upper age limit for NEET (Supreme Court ruling 2024). OBC/SC/ST candidates get reservation.",
  ],
};

const upscCse: SyllabusData = {
  slug: "upsc-cse",
  exam: "UPSC CSE",
  fullName: "Union Public Service Commission Civil Services Examination",
  conductedBy: "Union Public Service Commission (UPSC)",
  lastUpdated: "2024",
  description: "The UPSC Civil Services Examination selects officers for the IAS, IPS, IFS, and allied services. It has three stages: Prelims (objective), Mains (descriptive), and Interview. The syllabus is vast — spanning History, Polity, Geography, Economy, Environment, Science & Technology, Current Affairs, and an Optional subject.",
  subjects: [
    {
      name: "Prelims — General Studies Paper 1",
      chapters: [
        { name: "History", topics: ["Ancient India", "Medieval India", "Modern India (Freedom Struggle)", "Post-Independence India", "Art and Culture"] },
        { name: "Geography", topics: ["Physical Geography", "Indian Geography", "World Geography", "Economic Geography"] },
        { name: "Polity and Governance", topics: ["Indian Constitution", "Parliament and Legislature", "Executive", "Judiciary", "Federalism", "Panchayati Raj", "Public Policy"] },
        { name: "Economy", topics: ["National Income", "Planning and Development", "Agriculture", "Industry and Infrastructure", "External Sector", "Banking and Finance"] },
        { name: "Environment and Ecology", topics: ["Biodiversity", "Climate Change", "Environmental Laws", "Conservation"] },
        { name: "Science and Technology", topics: ["Space Technology", "Defence Technology", "Biotechnology", "IT and Communication"] },
        { name: "Current Events", topics: ["National Importance", "International Affairs"] },
      ],
    },
    {
      name: "Prelims — General Studies Paper 2 (CSAT)",
      chapters: [
        { name: "Comprehension", topics: ["Reading Passages", "Analytical Comprehension"] },
        { name: "Reasoning", topics: ["Logical Reasoning", "Analytical Ability"] },
        { name: "Data Interpretation", topics: ["Charts, Graphs, Tables"] },
        { name: "Communication and Decision Making", topics: ["Problem Solving", "Interpersonal Skills"] },
        { name: "General Mental Ability", topics: ["Basic Numeracy", "Data Sufficiency"] },
      ],
    },
    {
      name: "Mains — General Studies Papers 1-4",
      chapters: [
        { name: "GS Paper 1 — Heritage, History, Geography, Society", topics: ["Indian Heritage and Culture", "Modern Indian History", "Freedom Struggle and World History", "Indian Society", "Urbanization", "Indian Geography", "World Geography", "Natural Phenomena"] },
        { name: "GS Paper 2 — Governance, Polity, Social Justice, IR", topics: ["Indian Constitution", "Parliament, Judiciary, Executive", "Federalism and Decentralization", "Government Policies and Schemes", "Welfare Schemes", "Health and Education", "International Relations (Bilateral, Regional, Global)"] },
        { name: "GS Paper 3 — Economy, Technology, Security", topics: ["Economic Development", "Agriculture and Food Processing", "Land Reforms", "Infrastructure", "Environmental Issues", "Disaster Management", "Internal Security", "Cyber Security", "Space and Technology"] },
        { name: "GS Paper 4 — Ethics, Integrity, Aptitude", topics: ["Ethics and Human Interface", "Attitude and Aptitude", "Emotional Intelligence", "Public Service Values", "Probity in Governance", "Case Studies"] },
      ],
    },
    {
      name: "Mains — Essay and General English",
      chapters: [
        { name: "Essay Papers", topics: ["Essay Paper 1 (2 essays × 125 marks)", "Essay Paper 2 (2 essays × 125 marks)"] },
        { name: "General English", topics: ["Essay", "Precis Writing", "Comprehension", "English Grammar and Usage"] },
      ],
    },
  ],
  importantNotes: [
    "CSAT Paper 2 is qualifying — only 33% required. Marks are not counted in merit.",
    "Mains has 9 papers: 7 merit-counted GS + Essay + 2 qualifying language papers.",
    "Optional subject adds 500 marks to Mains total — choice matters significantly.",
    "Current affairs is tested across all papers — daily reading is essential throughout preparation.",
    "Interview (Personality Test) carries 275 marks — significant weight in final selection.",
  ],
};

const gate: SyllabusData = {
  slug: "gate",
  exam: "GATE CS",
  fullName: "Graduate Aptitude Test in Engineering — Computer Science",
  conductedBy: "IITs and IISc (rotating)",
  lastUpdated: "2024",
  description: "GATE CS (Computer Science and Information Technology) is used for admission to M.Tech programs at IITs, NITs, and for PSU recruitment. The exam tests Engineering Mathematics and core CS subjects at a level deeper than most B.Tech courses.",
  subjects: [
    {
      name: "Engineering Mathematics",
      chapters: [
        { name: "Discrete Mathematics", topics: ["Propositional and First Order Logic", "Set Theory", "Functions, Relations", "Combinatorics", "Graph Theory (Trees, BFS, DFS, Connectivity)"] },
        { name: "Linear Algebra", topics: ["Matrices and Determinants", "Eigenvalues and Eigenvectors", "Systems of Equations"] },
        { name: "Calculus", topics: ["Limits, Continuity", "Differentiation and Integration", "Mean Value Theorems", "Maxima and Minima"] },
        { name: "Probability and Statistics", topics: ["Probability (Conditional, Bayes)", "Random Variables", "Distributions (Binomial, Poisson, Normal)", "Statistics (Mean, Variance, Hypothesis Testing)"] },
      ],
    },
    {
      name: "Core Computer Science",
      chapters: [
        { name: "Digital Logic", topics: ["Boolean Algebra", "Combinational Circuits", "Sequential Circuits", "Number Systems"] },
        { name: "Computer Organization and Architecture", topics: ["Machine Instructions and Addressing", "ALU and Datapath", "Control Unit", "Memory Hierarchy", "I/O Interface", "Pipelining"] },
        { name: "Programming and Data Structures", topics: ["C Programming", "Recursion", "Arrays, Linked Lists, Stacks, Queues", "Trees (BST, AVL, Heaps)", "Graphs", "Hashing"] },
        { name: "Algorithms", topics: ["Sorting and Searching", "Divide and Conquer", "Greedy", "Dynamic Programming", "Graph Algorithms (Dijkstra, Floyd-Warshall, Kruskal, Prim)", "Complexity (P, NP, NP-complete)"] },
        { name: "Theory of Computation", topics: ["Regular Languages and Finite Automata", "Context-Free Grammars and Pushdown Automata", "Turing Machines", "Undecidability"] },
        { name: "Compiler Design", topics: ["Lexical Analysis", "Parsing (LL, LR)", "Syntax-Directed Translation", "Intermediate Code Generation", "Runtime Environments", "Code Optimization"] },
        { name: "Operating Systems", topics: ["Processes and Threads", "CPU Scheduling", "Process Synchronization", "Deadlock", "Memory Management (Paging, Segmentation)", "Virtual Memory", "File Systems", "I/O Systems"] },
        { name: "Databases", topics: ["ER Model", "Relational Model", "SQL", "Functional Dependencies and Normalization", "Transactions and Concurrency Control", "Indexing and B-Trees"] },
        { name: "Computer Networks", topics: ["OSI and TCP/IP Models", "Data Link Layer (Framing, Error Control)", "Network Layer (IP, ICMP, Routing)", "Transport Layer (TCP, UDP)", "Application Layer (DNS, HTTP, FTP, SMTP)"] },
      ],
    },
  ],
  importantNotes: [
    "GATE CS has 65 questions: 55 in CS and 10 in General Aptitude. Total 100 marks.",
    "Negative marking: -1/3 for 1-mark MCQs, -2/3 for 2-mark MCQs. No negative for NAT (numerical).",
    "GATE score is valid for 3 years for PSU applications.",
    "Subject-wise weightage varies year to year — consult previous 5 years' papers for patterns.",
  ],
};

const catMba: SyllabusData = {
  slug: "cat",
  exam: "CAT",
  fullName: "Common Admission Test",
  conductedBy: "IIMs (rotating responsibility)",
  lastUpdated: "2024",
  description: "CAT is the primary entrance examination for admission to IIMs and 1200+ other management institutes. The exam tests Verbal Ability & Reading Comprehension (VARC), Data Interpretation & Logical Reasoning (DILR), and Quantitative Aptitude (QA).",
  subjects: [
    {
      name: "Verbal Ability and Reading Comprehension (VARC)",
      chapters: [
        { name: "Reading Comprehension", topics: ["Long RC Passages (5-6 passages × 3-4 questions)", "Inference-based questions", "Author's tone and purpose"] },
        { name: "Verbal Ability", topics: ["Para-jumbles (reorder sentences)", "Para-summary (choose best summary)", "Out-of-context sentence", "Odd sentence out"] },
      ],
    },
    {
      name: "Data Interpretation and Logical Reasoning (DILR)",
      chapters: [
        { name: "Data Interpretation", topics: ["Tables", "Bar Charts, Line Graphs, Pie Charts", "Combination of graphs", "Caselet DI (text-based data)"] },
        { name: "Logical Reasoning", topics: ["Seating Arrangements", "Blood Relations", "Syllogisms", "Clocks and Calendars", "Games and Tournaments", "Venn Diagrams", "Linear and Circular Arrangements"] },
      ],
    },
    {
      name: "Quantitative Aptitude (QA)",
      chapters: [
        { name: "Arithmetic", topics: ["Percentages", "Profit and Loss", "Simple and Compound Interest", "Ratio and Proportion", "Mixtures and Alligation", "Time, Speed, Distance", "Time and Work"] },
        { name: "Number Systems", topics: ["Properties of Numbers", "Divisibility", "HCF and LCM", "Remainders", "Unit Digits"] },
        { name: "Algebra", topics: ["Linear and Quadratic Equations", "Inequalities", "Functions", "Logarithms", "Progressions (AP, GP)"] },
        { name: "Geometry", topics: ["Lines, Angles, Triangles", "Circles", "Polygons", "Coordinate Geometry"] },
        { name: "Modern Maths", topics: ["Permutations and Combinations", "Probability", "Set Theory"] },
      ],
    },
  ],
  importantNotes: [
    "CAT is a 2-hour exam (40 minutes per section). Sections are individually timed.",
    "Negative marking: +3 for correct MCQs, -1 for wrong. No negative for TITA (type in the answer).",
    "IIM shortlisting uses WAT (Written Ability Test) and PI (Personal Interview) beyond CAT score.",
    "CAT percentile (not raw score) determines shortlisting. 99+ percentile needed for top IIMs.",
  ],
};

const clat: SyllabusData = {
  slug: "clat",
  exam: "CLAT",
  fullName: "Common Law Admission Test",
  conductedBy: "Consortium of National Law Universities",
  lastUpdated: "2024",
  description: "CLAT is the centralized entrance test for admission to the 22 National Law Universities (NLUs) in India. The exam has moved to a comprehension-based format, testing legal reasoning, English, current affairs, logical reasoning, and quantitative techniques through passages.",
  subjects: [
    {
      name: "English Language",
      chapters: [
        { name: "Reading Comprehension", topics: ["Passage-based questions", "Inferences and conclusions", "Vocabulary in context", "Grammar and usage errors"] },
      ],
    },
    {
      name: "Current Affairs and General Knowledge",
      chapters: [
        { name: "Legal Current Affairs", topics: ["Supreme Court judgments", "Constitutional amendments", "Legal news and developments"] },
        { name: "General Current Affairs", topics: ["National events", "International affairs", "Government schemes", "Sports, Awards, Books"] },
        { name: "Static GK", topics: ["Indian Polity basics", "History relevance", "Geography fundamentals"] },
      ],
    },
    {
      name: "Legal Reasoning",
      chapters: [
        { name: "Passage-based Legal Reasoning", topics: ["Apply given legal principles to facts", "Identify legal issues", "Determine outcomes based on rules", "Constitutional law principles", "Contract, Tort, Criminal law basics"] },
      ],
    },
    {
      name: "Logical Reasoning",
      chapters: [
        { name: "Passage-based Reasoning", topics: ["Identify arguments and conclusions", "Strengthen/weaken arguments", "Analogy-based reasoning", "Logical sequences"] },
      ],
    },
    {
      name: "Quantitative Techniques",
      chapters: [
        { name: "Basic Mathematics (Class 10 level)", topics: ["Arithmetic (Percentages, Ratios)", "Basic Algebra", "Data Interpretation (simple graphs and tables)"] },
      ],
    },
  ],
  importantNotes: [
    "CLAT 2024 has 120 questions in 2 hours. All questions are passage-based — no isolated fact questions.",
    "Negative marking: +1 for correct, -0.25 for wrong.",
    "Legal Reasoning passages require applying principles from the passage, not pre-existing law knowledge.",
    "Admission is based on CLAT rank + category. NLUs offer 5-year BA LLB and 1-year LLM programs.",
  ],
};

const caIntermediate: SyllabusData = {
  slug: "ca-intermediate",
  exam: "CA Intermediate",
  fullName: "Chartered Accountancy Intermediate",
  conductedBy: "Institute of Chartered Accountants of India (ICAI)",
  lastUpdated: "2024",
  description: "CA Intermediate is the second level of the CA qualification. It has 6 papers across 2 groups. Students typically sit for both groups together or one group at a time. The pass rate is among the lowest of any professional examination in India.",
  subjects: [
    {
      name: "Group 1",
      chapters: [
        { name: "Paper 1: Advanced Accounting", topics: ["Framework for Preparation of Financial Statements", "Accounting Standards (AS 1-29)", "Company Accounts", "Partnership Accounts", "Departmental Accounts", "Branch Accounts", "Average Due Date", "Self-Balancing Ledgers"] },
        { name: "Paper 2: Corporate and Other Laws", topics: ["Companies Act 2013 (selected provisions)", "Directors, Meetings, Dividends", "Winding Up", "Limited Liability Partnership", "Other Business Laws (FEMA basics, PMLA overview)"] },
        { name: "Paper 3: Taxation — Income Tax and GST", topics: ["Income Tax: Heads of Income", "Deductions under Chapter VI-A", "Assessment Procedure", "GST: Supply, Input Tax Credit", "Registration", "Returns", "Customs Duty basics"] },
      ],
    },
    {
      name: "Group 2",
      chapters: [
        { name: "Paper 4: Cost and Management Accounting", topics: ["Cost Concepts and Classification", "Material, Labour and Overhead Costing", "Standard Costing", "Marginal Costing", "Budget and Budgetary Control", "Decision-Making (Make or Buy, Shut Down)"] },
        { name: "Paper 5: Auditing and Ethics", topics: ["Nature and Scope of Audit", "Audit Planning", "Internal Controls", "Vouching and Verification", "Company Audit", "CARO 2020", "Code of Ethics (ICAI)"] },
        { name: "Paper 6: Financial Management and Strategic Management", topics: ["Financial Management: Time Value of Money", "Capital Budgeting", "Working Capital", "Leverages", "Strategic Management: Strategy Formulation", "SWOT Analysis", "Competitive Advantage"] },
      ],
    },
  ],
  importantNotes: [
    "CA Intermediate has 6 papers across 2 groups. You can attempt groups separately.",
    "Pass criteria: 40% in each paper AND 50% aggregate in the group.",
    "Articleship (3 years) runs alongside/after Inter. Many students attempt both groups during articleship.",
    "ICAI allows 3 attempts per year (May, November, January). May/Nov are the main exam windows.",
  ],
};

const sscCgl: SyllabusData = {
  slug: "ssc-cgl",
  exam: "SSC CGL",
  fullName: "Staff Selection Commission Combined Graduate Level",
  conductedBy: "Staff Selection Commission (SSC)",
  lastUpdated: "2024",
  description: "SSC CGL recruits for Group B and C posts in various central government ministries and departments. The selection is in Tier 1 (CBT), Tier 2 (CBT), and for some posts, a document verification stage.",
  subjects: [
    {
      name: "Tier 1 — All Sections",
      chapters: [
        { name: "General Intelligence and Reasoning", topics: ["Analogy", "Series (Number, Alphabet, Figure)", "Classification", "Coding-Decoding", "Blood Relations", "Direction Sense", "Venn Diagrams", "Syllogism", "Matrix", "Statement and Conclusions"] },
        { name: "General Awareness", topics: ["History (Ancient, Medieval, Modern)", "Geography (India and World)", "Polity and Constitution", "Economy", "Science and Technology", "Static GK (Books, Awards, Sports)", "Current Affairs"] },
        { name: "Quantitative Aptitude", topics: ["Number System", "Percentages", "Ratio and Proportion", "Average, Mixture", "Time, Speed, Distance", "Time and Work", "Simple and Compound Interest", "Profit and Loss", "Geometry (Basic)", "Trigonometry (Basic)", "Data Interpretation"] },
        { name: "English Comprehension", topics: ["Reading Comprehension", "Cloze Test", "Para Jumbles", "Error Spotting", "Synonyms and Antonyms", "Fill in the Blanks", "Idioms and Phrases"] },
      ],
    },
    {
      name: "Tier 2 — Paper 1 (All Posts)",
      chapters: [
        { name: "Mathematical Abilities", topics: ["Number System (advanced)", "Algebra", "Geometry (Triangles, Circles)", "Mensuration", "Trigonometry", "Statistics and Probability"] },
        { name: "Reasoning and General Intelligence", topics: ["All Tier 1 topics at higher difficulty"] },
        { name: "English Language and Comprehension", topics: ["Reading Comprehension", "Vocabulary", "Grammar", "Sentence Improvement", "Para Jumbles"] },
        { name: "General Awareness", topics: ["All Tier 1 GA topics at higher difficulty"] },
        { name: "Computer Knowledge", topics: ["Computer Basics", "Memory and Storage", "OS Fundamentals", "MS Office basics", "Internet and Networking"] },
      ],
    },
  ],
  importantNotes: [
    "SSC CGL Tier 1 is qualifying — Tier 2 marks determine final merit.",
    "Tier 2 Paper 2 (Statistics) is only for Junior Statistical Officer posts.",
    "Negative marking: -0.5 per wrong answer in Tier 1, -1 per wrong in Tier 2 (3-mark questions).",
    "Posts include Inspector Income Tax, Assistant Audit Officer, Accountant, Sub-Inspector (CBI/NIA), etc.",
  ],
};

export const SYLLABI: SyllabusData[] = [
  jeeMain,
  jeeAdvanced,
  neet,
  upscCse,
  gate,
  catMba,
  clat,
  caIntermediate,
  sscCgl,
];

export function getAllSyllabi(): SyllabusData[] {
  return SYLLABI;
}

export function getSyllabusBySlug(slug: string): SyllabusData | undefined {
  return SYLLABI.find((s) => s.slug === slug);
}

export function getSyllabusSlugs(): string[] {
  return SYLLABI.map((s) => s.slug);
}
