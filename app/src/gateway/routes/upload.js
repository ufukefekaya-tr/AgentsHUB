import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

const router = express.Router({ mergeParams: true });

// Setup Multer Storage mapping to Agent's Workspace
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const agentId = req.params.id;
        if (!agentId) return cb(new Error("Agent ID missing."));
        
        const workspacePath = path.join(process.cwd(), 'Agents', agentId, 'Workspace');
        
        // Ensure strictly that Workspace directory exists
        if (!fs.existsSync(workspacePath)) {
            fs.mkdirSync(workspacePath, { recursive: true });
        }
        
        cb(null, workspacePath);
    },
    filename: (req, file, cb) => {
        // Sanitize the original name to avoid path traversal tricks
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        // Prepend short hash to avoid identical name collisions
        const prefix = crypto.randomBytes(4).toString('hex');
        cb(null, `${prefix}_${cleanName}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB Limit
});

router.post('/', upload.single('file'), (req, res) => {
    const agentId = req.params.id;
    
    if (!req.file) {
        return res.status(400).json({ error: { message: "Herhangi bir dosya yüklenmedi." } });
    }

    // Capture the absolute physical path of the uploaded file on the disk
    const absolutePath = req.file.path;
    
    logger.info(`[UPLOAD] Ajan (${agentId}) Workspace dizinine dosya yüklendi: ${req.file.originalname} -> ${absolutePath}`);

    // Return the specific path to the client so UI can inject it into the input string immediately
    return res.json({
        success: true,
        filename: req.file.filename,
        originalName: req.file.originalname,
        absolutePath: absolutePath,
        size: req.file.size
    });
});

export default router;
