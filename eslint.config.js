const prettier = require("eslint-plugin-prettier");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
    {
        files: ["**/*.js"],
        plugins: {
            prettier: prettier,
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                // Node.js globals
                process: "readonly",
                __dirname: "readonly",
                require: "readonly",
                module: "readonly",
                exports: "readonly",
                setInterval: "readonly",
                setTimeout: "readonly",
                console: "readonly",
                Buffer: "readonly"
            }
        },
        rules: {
            ...prettierConfig.rules,
            "prettier/prettier": "error",
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];
