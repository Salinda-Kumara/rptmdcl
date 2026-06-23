import { Injectable, Logger } from '@nestjs/common';
import { promises as fs, createReadStream } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import type { ReadStream } from 'fs';

/**
 * Local filesystem storage for development.
 *
 * Files are stored under <api>/uploads/<applicationId>/<uuid><ext>.
 * The same public surface (put/getStream/remove) can be backed by MinIO in
 * production by swapping the implementation — controllers/services stay the same.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root = resolve(process.cwd(), 'uploads');

  /** Store a buffer and return the relative storage path. */
  async put(applicationId: string, originalName: string, buffer: Buffer): Promise<string> {
    const ext = this.extOf(originalName);
    const dir = join(this.root, applicationId);
    await fs.mkdir(dir, { recursive: true });

    const key = `${randomUUID()}${ext}`;
    const fullPath = join(dir, key);
    await fs.writeFile(fullPath, buffer);

    // Relative path used as the stored "minioPath"
    return `${applicationId}/${key}`;
  }

  /** Open a read stream for a stored path. */
  getStream(storagePath: string): ReadStream {
    return createReadStream(this.absolutePath(storagePath));
  }

  /** Delete a stored file (best-effort). */
  async remove(storagePath: string): Promise<void> {
    try {
      await fs.unlink(this.absolutePath(storagePath));
    } catch (err) {
      this.logger.warn(`Failed to delete file ${storagePath}: ${(err as Error).message}`);
    }
  }

  private absolutePath(storagePath: string): string {
    // Prevent path traversal — resolve and ensure it stays under root.
    const full = resolve(this.root, storagePath);
    if (!full.startsWith(this.root)) {
      throw new Error('Invalid storage path');
    }
    return full;
  }

  private extOf(name: string): string {
    const idx = name.lastIndexOf('.');
    return idx >= 0 ? name.slice(idx).toLowerCase() : '';
  }
}
