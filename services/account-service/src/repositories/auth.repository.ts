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

  // Update user profile fields (name, phone)
  async updateProfile(userId: string, updates: { name?: string; phone?: string }): Promise<IUserRow | undefined> {
    const [row] = await db('users')
      .where({ id: userId })
      .update({ ...updates, updated_at: new Date() })
      .returning('*');
    return row;
  },

  async getOrCreatePrimaryAccount(userId: string): Promise<{ id: string; balance: number; currency: string }> {
    const existing = await db('accounts')
      .where({ user_id: userId })
      .orderBy('created_at', 'asc')
      .first(['id', 'balance', 'currency']);

    if (existing) {
      return {
        id: existing.id,
        balance: Number(existing.balance ?? 0),
        currency: existing.currency,
      };
    }

    const [created] = await db('accounts')
      .insert({ user_id: userId, balance: 0, currency: 'INR', status: 'active', version: 0 })
      .returning(['id', 'balance', 'currency']);

    return {
      id: created.id,
      balance: Number(created.balance ?? 0),
      currency: created.currency,
    };
  },
};
