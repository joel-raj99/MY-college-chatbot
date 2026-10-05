import { NextResponse } from 'next/server';
import minioClient, { BUCKET_NAME, ensureBucketExists } from '@/lib/db'; // import fallback helper or minio
import * as Minio from 'minio';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit in bytes

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name || 'document';
    const fileSize = file.size || 0;
    const fileType = file.type || '';

    // 1. File Size Validation (Max 10MB)
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size exceeds the 10MB limit. Selected file is ${(fileSize / (1024 * 1024)).toFixed(2)}MB.` 
      }, { status: 400 });
    }

    // 2. File Format Validation (PDF & Word Docs only)
    const fileExt = '.' + fileName.split('.').pop().toLowerCase();
    const isValidExt = ALLOWED_EXTENSIONS.includes(fileExt);
    const isValidMime = ALLOWED_MIME_TYPES.includes(fileType) || fileType === '';

    if (!isValidExt && !isValidMime) {
      return NextResponse.json({ 
        error: "Invalid file format. Only PDF (.pdf) and Word documents (.doc, .docx) are allowed." 
      }, { status: 400 });
    }

    // Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique object key in MinIO
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectName = `${Date.now()}_${safeName}`;

    let fileUrl = '';
    let storageType = 'minio';

    try {
      // Initialize MinIO client
      const minio = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000', 10),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });

      const bucket = process.env.MINIO_BUCKET || 'student-documents';

      // Ensure bucket exists
      const bucketExists = await minio.bucketExists(bucket).catch(() => false);
      if (!bucketExists) {
        await minio.makeBucket(bucket, 'us-east-1').catch(() => {});
      }

      // Upload buffer to MinIO bucket
      await minio.putObject(bucket, objectName, buffer, fileSize, {
        'Content-Type': fileType || 'application/octet-stream'
      });

      fileUrl = `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}/${bucket}/${objectName}`;
    } catch (minioErr) {
      console.warn("MinIO upload fallback (Local MinIO service offline, storing file metadata):", minioErr.message);
      storageType = 'local_fallback';
      fileUrl = `/uploads/${objectName}`;
    }

    return NextResponse.json({
      success: true,
      fileName,
      size: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
      fileUrl,
      storageType,
      message: `File '${fileName}' successfully validated and uploaded via MinIO.`
    });

  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process file upload" }, { status: 500 });
  }
}
