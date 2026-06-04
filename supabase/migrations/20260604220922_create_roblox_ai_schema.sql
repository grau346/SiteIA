/*
# RobloxAI Agent — initial schema

## Summary
Creates the three core tables for the RobloxAI Agent application:
`conversations`, `messages`, and `agent_settings`.

## Tables

### conversations
Stores each chat session with the AI agent.
- `id` — serial primary key
- `title` — display name, defaults to "New Conversation"
- `mode` — agent operating mode (e.g. script, gui, debug)
- `executor` — script executor target
- `game_target` — Roblox game identifier
- `created_at` / `updated_at` — timestamps with timezone

### messages
Stores individual messages within a conversation.
- `id` — serial primary key
- `conversation_id` — FK → conversations.id (CASCADE delete)
- `role` — "user" or "assistant"
- `content` — message text
- `file_url` / `file_name` — optional attached file metadata
- `created_at` — timestamp with timezone

### agent_settings
Single-row table holding global agent configuration.
- `id` — serial primary key
- `executor`, `platform`, `obfuscation`, `roblox_version`, `script_style`, `default_mode` — agent config fields
- `system_prompt_extra` — user-appended system prompt text
- `ui_lib_preference` — preferred UI library
- `updated_at` — timestamp with timezone

## Security
- RLS enabled on all tables.
- Policies use `TO anon, authenticated` (single-tenant app, no sign-in required)
  so the anon-key frontend client can read/write freely.
*/

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id serial PRIMARY KEY,
  title text NOT NULL DEFAULT 'New Conversation',
  mode text,
  executor text,
  game_target text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_conversations" ON conversations;
CREATE POLICY "anon_select_conversations" ON conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_conversations" ON conversations;
CREATE POLICY "anon_insert_conversations" ON conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_conversations" ON conversations;
CREATE POLICY "anon_update_conversations" ON conversations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_conversations" ON conversations;
CREATE POLICY "anon_delete_conversations" ON conversations FOR DELETE
  TO anon, authenticated USING (true);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  file_url text,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);

-- agent_settings
CREATE TABLE IF NOT EXISTS agent_settings (
  id serial PRIMARY KEY,
  executor text,
  platform text,
  obfuscation text,
  roblox_version text,
  script_style text,
  default_mode text,
  system_prompt_extra text,
  ui_lib_preference text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_agent_settings" ON agent_settings;
CREATE POLICY "anon_select_agent_settings" ON agent_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_agent_settings" ON agent_settings;
CREATE POLICY "anon_insert_agent_settings" ON agent_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_agent_settings" ON agent_settings;
CREATE POLICY "anon_update_agent_settings" ON agent_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_agent_settings" ON agent_settings;
CREATE POLICY "anon_delete_agent_settings" ON agent_settings FOR DELETE
  TO anon, authenticated USING (true);
