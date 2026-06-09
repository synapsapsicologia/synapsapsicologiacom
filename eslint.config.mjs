import nextConfig from "eslint-config-next";
import coreWebVitals from "eslint-config-next/core-web-vitals";

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
  ...nextConfig,
  ...coreWebVitals,
  // Desactivar temporalmente reglas muy estrictas de TS/React para el desarrollo local
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off"
    }
  }
];

export default eslintConfig;
