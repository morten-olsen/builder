import { randomUUID } from 'node:crypto';

import type { Services } from '../../container/container.js';
import { DatabaseService } from '../database/database.js';

type FileReview = {
  id: string;
  sessionId: string;
  userId: string;
  filePath: string;
  fileHash: string;
  createdAt: string;
};

type MarkReviewedInput = {
  sessionId: string;
  userId: string;
  filePath: string;
  fileHash: string;
};

type UnmarkReviewedInput = {
  sessionId: string;
  userId: string;
  filePath: string;
};

type ListBySessionInput = {
  sessionId: string;
  userId: string;
};

const mapRow = (row: {
  id: string;
  session_id: string;
  user_id: string;
  file_path: string;
  file_hash: string;
  created_at: string;
}): FileReview => ({
  id: row.id,
  sessionId: row.session_id,
  userId: row.user_id,
  filePath: row.file_path,
  fileHash: row.file_hash,
  createdAt: row.created_at,
});

class FileReviewService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  get #database(): DatabaseService {
    return this.#services.get(DatabaseService);
  }

  markReviewed = async (input: MarkReviewedInput): Promise<FileReview> => {
    const db = await this.#database.getInstance();

    // Upsert via DELETE + INSERT
    await db
      .deleteFrom('file_reviews')
      .where('session_id', '=', input.sessionId)
      .where('user_id', '=', input.userId)
      .where('file_path', '=', input.filePath)
      .execute();

    const id = randomUUID();
    const now = new Date().toISOString();

    await db
      .insertInto('file_reviews')
      .values({
        id,
        session_id: input.sessionId,
        user_id: input.userId,
        file_path: input.filePath,
        file_hash: input.fileHash,
        created_at: now,
      })
      .execute();

    return {
      id,
      sessionId: input.sessionId,
      userId: input.userId,
      filePath: input.filePath,
      fileHash: input.fileHash,
      createdAt: now,
    };
  };

  unmarkReviewed = async (input: UnmarkReviewedInput): Promise<void> => {
    const db = await this.#database.getInstance();

    await db
      .deleteFrom('file_reviews')
      .where('session_id', '=', input.sessionId)
      .where('user_id', '=', input.userId)
      .where('file_path', '=', input.filePath)
      .execute();
  };

  listBySession = async (input: ListBySessionInput): Promise<FileReview[]> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('file_reviews')
      .selectAll()
      .where('session_id', '=', input.sessionId)
      .where('user_id', '=', input.userId)
      .execute();

    return rows.map(mapRow);
  };
}

export type { FileReview, MarkReviewedInput, UnmarkReviewedInput, ListBySessionInput };
export { FileReviewService };
