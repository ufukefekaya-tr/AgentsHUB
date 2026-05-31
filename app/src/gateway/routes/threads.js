import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { UMI } from '../../memory/umi.js';

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
    try {
        const includeArchived = req.query.archived === '1' ? 1 : 0;
        const threads = await UMI.listThreads(req.params.id, includeArchived);
        res.json(threads);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/:threadId/move', async (req, res) => {
    try {
        await UMI.moveThreadToFolder(req.params.id, req.params.threadId, req.body.folderId);
        res.json({ status: "moved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/:threadId/archive', async (req, res) => {
    try {
        await UMI.archiveThread(req.params.id, req.params.threadId, 1);
        res.json({ status: "archived" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/:threadId/unarchive', async (req, res) => {
    try {
        await UMI.archiveThread(req.params.id, req.params.threadId, 0);
        res.json({ status: "restored" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/:threadId', async (req, res) => {
    try {
        const threadPath = path.join(process.cwd(), 'Agents', req.params.id, 'Chats', `${req.params.threadId}.json`);
        try { await fs.access(threadPath); } catch { return res.status(404).json({ error: "Thread bulunamadı" }); }
        const history = await UMI.getHistory(req.params.id, req.params.threadId);
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/:threadId', async (req, res) => {
    try {
        await UMI.renameThread(req.params.id, req.params.threadId, req.body.title);
        res.json({ status: "renamed" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:threadId', async (req, res) => {
    try {
        await UMI.deleteThread(req.params.id, req.params.threadId);
        res.json({ status: "deleted" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
