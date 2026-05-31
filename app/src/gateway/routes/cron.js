import express from 'express';
import { cronManager } from '../../scheduler/cron_manager.js';

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
    res.json(cronManager.list(req.params.id));
});

router.post('/', async (req, res) => {
    try {
        const { cronExpr, taskPrompt } = req.body;
        if (!cronExpr || !taskPrompt) return res.status(400).json({ error: 'cronExpr ve taskPrompt zorunlu' });
        const jobId = await cronManager.schedule(req.params.id, cronExpr, taskPrompt);
        res.json({ status: 'scheduled', jobId });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.delete('/:jobId', async (req, res) => {
    const cancelled = await cronManager.cancel(req.params.jobId);
    res.json({ status: cancelled ? 'cancelled' : 'not_found' });
});

export default router;
