import globals from "globals";
import pluginJs from "@eslint/js";
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        ...globals.mocha,
      },
    }
  },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  security.configs.recommended,
  {
    plugins: {
      "no-secrets": noSecrets
    },
    rules: {
      "no-secrets/no-secrets": ["error", {
        "tolerance": 4.5,  // Aumentar umbral de entropía (de 4.0 a 4.5)
        "ignoreContent": [
          "mongodb://",
          "localhost:27017",
          "replicaSet=rs0"
        ],
        "additionalRegexes": {
          "Basic Auth": "disabled"
        }
      }],
      // Desactivar object injection globalmente - genera muchos falsos positivos
      // cuando las claves provienen de Object.keys() del mismo objeto
      "security/detect-object-injection": "off"
    }
  },
  {
    // Ignorar archivos de configuración y .env
    ignores: [
      "src/config/index.js",
      ".env*",
      "envCopy.md",
      "node_modules/**",
      "dist/**",
      "public/**/assets/**",
      "eslint.config.mjs"
    ]
  }
];