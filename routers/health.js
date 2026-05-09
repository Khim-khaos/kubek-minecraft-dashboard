const express = require("express");
const router = express.Router();
const HEALTH = require("../modules/health");
const packageJSON = require("./../package.json");

/**
 * Endpoint для проверки работоспособности системы
 */
router.get("/", async function (req, res) {
    try {
        const health = await HEALTH.getHealthStatus();
        health.version = packageJSON.version;
        res.send(health);
    } catch (error) {
        res.status(500).send({
            status: "error",
            message: error.message
        });
    }
});

module.exports.router = router;
