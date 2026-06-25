import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist-desktop/**",
      "next-env.d.ts",
      // Electron main/preload and the desktop build script are CommonJS Node
      // modules (run outside the Next bundle) and intentionally use require().
      "electron/**",
      "scripts/**",
    ],
  },
];

export default eslintConfig;
