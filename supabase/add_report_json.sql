-- Add report_json column to documents table
-- Run this in your Supabase SQL editor

alter table documents
  add column if not exists report_json jsonb;
