-- Creates the users table — stores email, hashed password, KYC status. This is the first table and has no dependencies.
-- Run this FIRST. Every other table depends on users.id.

-- Enable UUID extension (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  phone         VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  kyc_status    VARCHAR(20) DEFAULT 'pending'
                  CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
