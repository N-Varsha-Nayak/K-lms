ALTER TABLE enrollments MODIFY course_id INT NULL;
ALTER TABLE enrollments ADD COLUMN subject_id BIGINT UNSIGNED NULL AFTER course_id;
ALTER TABLE enrollments ADD KEY idx_enrollments_subject_id (subject_id);
ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE;
ALTER TABLE enrollments ADD UNIQUE KEY unique_subject_enrollment (user_id, subject_id);
