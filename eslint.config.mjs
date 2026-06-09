import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignores globales en Flat Config
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/lib/db/db.json",
      "src/lib/db/emails_sent.json"
    ]
  },
  // Cargar reglas heredadas de Next.js
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Desactivar temporalmente reglas muy estrictas de TS/React para el desarrollo local
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "react-hooks/exhaustive-deps": "off"
    }
  }
];

export default eslintConfig;
