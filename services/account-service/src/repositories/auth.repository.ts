// Auth repository — all SQL queries for the users table. No business logic.
import { db } from '@settlr/database';
import type { IUserRow } from '@settlr/types';

export const authRepository = {
  // Insert a new user and return the created row
  async createUser(email: string, passwordHash: string, phone?: string, name?: string): Promise<IUserRow> {
    const [row] = await db('users')
      .insert({ email, password_hash: passwordHash, phone: phone || null, name: name || null })
      .returning('*');
    return row;
  },

  // Find user by email (for login and duplicate check)
  async findByEmail(email: string): Promise<IUserRow | undefined> {
    return db('users').where({ email }).first();
  },

  // Find user by ID (for token refresh and profile)
  async findById(userId: string): Promise<IUserRow | undefined> {
    return db('users').where({ id: userId }).first();
  },

  // Deactivate a user (soft delete)
  async deactivate(userId: string): Promise<void> {
    await db('users').where({ id: userId }).update({ is_active: false, updated_at: new Date() });
  },
};
