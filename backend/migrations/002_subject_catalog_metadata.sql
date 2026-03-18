ALTER TABLE subjects ADD COLUMN slug VARCHAR(255) NULL AFTER title;
ALTER TABLE subjects ADD COLUMN short_description VARCHAR(255) NULL AFTER description;
ALTER TABLE subjects ADD COLUMN category VARCHAR(120) NOT NULL DEFAULT 'Technology' AFTER short_description;
ALTER TABLE subjects ADD COLUMN level VARCHAR(40) NOT NULL DEFAULT 'Beginner' AFTER category;
ALTER TABLE subjects ADD COLUMN pricing_tier VARCHAR(20) NOT NULL DEFAULT 'free' AFTER level;
ALTER TABLE subjects ADD COLUMN price_inr INT NOT NULL DEFAULT 0 AFTER pricing_tier;
ALTER TABLE subjects ADD COLUMN instructor_name VARCHAR(120) NULL AFTER price_inr;
ALTER TABLE subjects ADD COLUMN thumbnail_url VARCHAR(500) NULL AFTER instructor_name;
ALTER TABLE subjects ADD COLUMN rating DECIMAL(3,2) NOT NULL DEFAULT 4.50 AFTER thumbnail_url;
ALTER TABLE subjects ADD COLUMN enrolled_count INT NOT NULL DEFAULT 0 AFTER rating;
ALTER TABLE subjects ADD COLUMN estimated_hours DECIMAL(5,1) NOT NULL DEFAULT 1.0 AFTER enrolled_count;

CREATE UNIQUE INDEX uq_subjects_slug ON subjects (slug);
CREATE INDEX idx_subjects_pricing_tier ON subjects (pricing_tier);
CREATE INDEX idx_subjects_category ON subjects (category);
CREATE INDEX idx_subjects_level ON subjects (level);
