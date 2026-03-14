const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the index.html from the parent folder
app.use(express.static(path.join(__dirname, '..')));

const jobs = [];
let jobIdCounter = 1;

// Push a require script to the queue
app.post('/api/execute', (req, res) => {
    const { targetUser, moduleId, functionName } = req.body;

    if (!moduleId) {
        return res.status(400).json({ error: "Module ID is required" });
    }

    let luaScript = `require(${moduleId})`;
    if (functionName) {
        luaScript += `.${functionName}(`;
        if (targetUser) {
            luaScript += `"${targetUser.replace(/"/g, '')}"`;
        }
        luaScript += `)`;
    }

    const job = {
        id: jobIdCounter++,
        targetUser: targetUser || 'None',
        moduleId,
        script: luaScript,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        error: null
    };

    jobs.push(job);
    res.json({ success: true, job });
});

// Fetch execution logs
app.get('/api/logs', (req, res) => {
    res.json({ jobs: jobs.slice().reverse() });
});

// Roblox game server polls for pending jobs
app.get('/api/poll', (req, res) => {
    const pendingJob = jobs.find(j => j.status === 'Pending');
    if (pendingJob) {
        pendingJob.status = 'Executing';
        return res.json({ jobId: pendingJob.id, script: pendingJob.script });
    }
    res.json({ message: "No pending jobs" });
});

// Roblox game server reports results
app.post('/api/result', (req, res) => {
    const { jobId, status, error } = req.body;
    const job = jobs.find(j => j.id === jobId);

    if (job) {
        job.status = status;
        job.error = error || null;
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Job not found" });
});

// Clear all logs
app.delete('/api/logs', (req, res) => {
    jobs.length = 0;
    jobIdCounter = 1;
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`--------------------------------------------`);
    console.log(`  Web Executor Backend is LIVE`);
    console.log(`  Open in browser: http://localhost:${PORT}`);
    console.log(`--------------------------------------------`);
});
