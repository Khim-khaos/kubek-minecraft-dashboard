const COMMONS = require("./../modules/commons");
const TASK_MANAGER = require("./../modules/taskManager");
const APP_CONFIG = require("./../modules/appConfig");

const express = require("express");
const router = express.Router();

// Endpoint списка задач
router.get("/", function (req, res) {
    const tasks = APP_CONFIG.getTasks();
    res.set("Content-Type", "application/json");
    res.send(tasks);
    TASK_MANAGER.removeCompletedTasks();
});

// Endpoint задачи по её ID
router.get("/:id", function (req, res) {
    let q = req.params;
    const tasks = APP_CONFIG.getTasks();
    if (COMMONS.isObjectsValid(q.id) && Object.keys(tasks).includes(q.id)) {
        res.set("Content-Type", "application/json");
        return res.send(tasks[q.id]);
    }
    res.sendStatus(400);
});

module.exports.router = router;