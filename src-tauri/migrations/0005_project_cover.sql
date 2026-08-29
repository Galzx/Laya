-- Add optional cover_image (supports custom imported base64 photos or preset artistic covers)
ALTER TABLE projects ADD COLUMN cover_image TEXT;
