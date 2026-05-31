import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router({ mergeParams: true }); // :id parametresini yakalamak için

async function getFoldersPath(agentId) {
    return path.join(process.cwd(), 'Agents', agentId, 'Chats', 'folders.json');
}

async function readFolders(agentId) {
    try {
        const data = JSON.parse(await fs.readFile(await getFoldersPath(agentId), 'utf8'));
        return Array.isArray(data) ? data : []; 
    } catch (e) {
        return [];
    }
}

async function writeFolders(agentId, folders) {
    const p = await getFoldersPath(agentId);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(folders, null, 2), 'utf8');
}

router.get('/', async (req, res) => {
    try {
        res.json(await readFolders(req.params.id));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        const folderId = `folder_${Date.now()}`;
        const folders = await readFolders(req.params.id);
        folders.push({ id: folderId, name });
        await writeFolders(req.params.id, folders);
        res.json({ id: folderId, name });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/:folderId', async (req, res) => {
    try {
        const { name } = req.body;
        const folders = await readFolders(req.params.id);
        const f = folders.find(f => f.id === req.params.folderId);
        if (f) { f.name = name; await writeFolders(req.params.id, folders); }
        res.json({ status: "renamed" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:folderId', async (req, res) => {
    try {
        const folders = await readFolders(req.params.id);
        await writeFolders(req.params.id, folders.filter(f => f.id !== req.params.folderId));
        res.json({ status: "deleted" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
