module.exports = [
    {
        files: ["**/*.js"],
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
                Buffer: "readonly",
                // App globals
                mainConfig: "writable",
                usersConfig: "writable",
                serversConfig: "writable",
                currentLanguage: "writable",
                webServer: "writable",
                ftpDaemon: "writable"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];
