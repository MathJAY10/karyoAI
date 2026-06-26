import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ingestionQueue } from '../config/bullmq';
import { getFileHash } from '../utils/hash';
import path from 'path';
import fs from 'fs';

export const uploadDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).user?.id || 1;
    const file = req.file;

    console.log('==============================');
    console.log('UPLOAD REQUEST RECEIVED');
    console.log('Workspace ID:', workspaceId);
    console.log('User ID:', userId);
    console.log('==============================');

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({ error: 'Workspace ID required' });
      return;
    }

    const fileHash = getFileHash(file.buffer);

    console.log('File Name:', file.originalname);
    console.log('File Size:', file.size);
    console.log('File Hash:', fileHash);

    // Idempotency check
    const existingDoc = await prisma.document.findFirst({
      where: {
        workspaceId: parseInt(workspaceId, 10),
        fileHash
      }
    });

    if (existingDoc) {
      console.log('DOCUMENT ALREADY EXISTS:', existingDoc.id);

      if (existingDoc.status === 'READY') {
        res.status(200).json({
          message: 'Document already exists and is ready',
          documentId: existingDoc.id,
          status: existingDoc.status
        });
        return;
      }

      if (existingDoc.status === 'PROCESSING') {
        res.status(200).json({
          message: 'Document is currently processing',
          documentId: existingDoc.id,
          status: existingDoc.status
        });
        return;
      }

      // If FAILED or pending (orphaned), requeue
      if (existingDoc.status === 'FAILED' || existingDoc.status === 'pending' || existingDoc.status === 'PENDING') {
        console.log('REQUEUING DOCUMENT:', existingDoc.id);
        
        await prisma.document.update({
          where: { id: existingDoc.id },
          data: { status: 'pending', errorMessage: null }
        });

        await ingestionQueue.add('process', {
          documentId: existingDoc.id,
          filePath: existingDoc.filePath
        });

        res.status(202).json({
          message: 'Document requeued for processing',
          documentId: existingDoc.id,
          status: 'pending'
        });
        return;
      }

      // Fallback
      res.status(200).json({
        message: 'Document already exists',
        documentId: existingDoc.id,
        status: existingDoc.status
      });
      return;
    }
    // Upload folder
    const uploadDir = path.join(__dirname, '../../uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Created Upload Directory:', uploadDir);
    }

    const uniqueFileName = `${Date.now()}-${file.originalname}`;
    const storagePath = path.join(uploadDir, uniqueFileName);

    fs.writeFileSync(storagePath, file.buffer);

    console.log('FILE SAVED TO:', storagePath);

    console.log('Creating DB Record...');

    console.log('Saved Filename:', uniqueFileName);
    console.log('Stored DB value for filePath:', uniqueFileName);

    const newDoc = await prisma.document.create({
      data: {
        userId,
        workspaceId: parseInt(workspaceId, 10),
        fileName: file.originalname,
        fileType: file.mimetype,
        filePath: uniqueFileName,
        fileSize: file.size,
        fileHash,
        status: 'pending'
      }
    });

    console.log('DOCUMENT CREATED:', newDoc.id);

    // Queue Job
    console.log('ADDING JOB TO BULLMQ...');

    try {
      const job = await ingestionQueue.add(
        'process',
        {
          documentId: newDoc.id,
          filePath: uniqueFileName
        }
      );

      console.log('JOB SUCCESSFULLY ADDED');
      console.log('Job ID:', job.id);
      console.log('Queue Name: document-ingestion');
    } catch (queueError) {
      console.error('QUEUE ERROR:', queueError);

      await prisma.document.update({
        where: { id: newDoc.id },
        data: {
          status: 'FAILED',
          errorMessage: String(queueError)
        }
      });

      throw queueError;
    }

    res.status(202).json({
      message: 'Document queued for processing',
      documentId: newDoc.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('ERROR IN uploadDocument:', error);

    res.status(500).json({
      error: 'Internal server error',
      details: String(error)
    });
  }
};

export const getDocumentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const doc = await prisma.document.findUnique({
      where: {
        id: parseInt(id, 10)
      },
      select: {
        id: true,
        status: true,
        totalChunks: true,
        errorMessage: true
      }
    });

    if (!doc) {
      res.status(404).json({
        error: 'Document not found'
      });
      return;
    }

    res.json(doc);
  } catch (error) {
    console.error('ERROR IN getDocumentStatus:', error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const getReadyDocuments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const documents = await prisma.document.findMany({
      where: {
        userId,
        status: 'READY'
      },
      select: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(documents);
  } catch (error) {
    console.error('ERROR IN getReadyDocuments:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};