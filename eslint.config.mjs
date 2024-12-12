import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        languageOptions: 
        {
            globals: globals.browser
        }
    },
    pluginJs.configs.recommended,
    {
        rules: 
        {
            "indent": ["error", 4],
            "brace-style": ["error", "allman", {
                "allowSingleLine": false 
            }],
            "object-curly-newline": ["error", {
                "multiline": true, "minProperties": 2, "consistent": true
            }],
            "newline-before-return": "error",
            "object-curly-spacing": ["error", "always"]
        }
    }
];