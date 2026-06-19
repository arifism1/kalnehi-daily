import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactDoctor from "eslint-plugin-react-doctor";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  reactDoctor.configs.next,
  // Engine boundary: src/engine/** must stay domain-agnostic. It may NOT import
  // vertical configs, app/UI layers, or exam-specific modules. This mechanically
  // prevents the "one engine" from re-coupling to a single vertical's wording.
  {
    files: ["src/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/verticals", "@/verticals/*", "**/verticals/*"],
              message:
                "Engine must stay domain-agnostic: no vertical config imports.",
            },
            {
              group: [
                "@/content/*",
                "@/components/*",
                "@/app/*",
                "@/config/*",
                "@/store/*",
                "@/hooks/*",
                "@/actions/*",
              ],
              message: "Engine must not import app/UI/vertical layers.",
            },
            {
              group: [
                "@/lib/syllabus*",
                "@/lib/exam*",
                "@/lib/targetScore*",
                "@/lib/rankPrediction",
                "@/lib/cuetDomainSubjects",
                "@/lib/upscMainsOptionalSubjects",
              ],
              message:
                "Engine must not import exam-specific (student) modules. Use a vertical adapter instead.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
