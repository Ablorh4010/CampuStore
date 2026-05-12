CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  university VARCHAR(255),
  level VARCHAR(50),
  field_of_study VARCHAR(255),
  profile_bio TEXT,
  profile_image_url TEXT,
  cv_url TEXT,
  linkedin_url VARCHAR(255),
  phone VARCHAR(20),
  location VARCHAR(255),
  is_admin BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  tags VARCHAR(255)[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  visibility VARCHAR(20) DEFAULT 'public',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, post_id)
);

CREATE TABLE opportunities (
  id SERIAL PRIMARY KEY,
  source VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_email VARCHAR(255),
  company_phone VARCHAR(20),
  sector VARCHAR(100),
  description TEXT,
  requirements TEXT,
  location VARCHAR(255),
  work_mode VARCHAR(50),
  stipend VARCHAR(100),
  duration VARCHAR(100),
  deadline DATE,
  application_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hostels (
  id SERIAL PRIMARY KEY,
  source VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  contact_person VARCHAR(255),
  city VARCHAR(100),
  university VARCHAR(255),
  address TEXT,
  description TEXT,
  rooms_available INTEGER,
  price_per_year DECIMAL(10, 2),
  amenities VARCHAR(255)[],
  image_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2),
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_type VARCHAR(50),
  student_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
  hostel_id INTEGER REFERENCES hostels(id) ON DELETE SET NULL,
  email_subject VARCHAR(255) NOT NULL,
  email_body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  sent_at TIMESTAMP,
  replied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_replies (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  reply_subject VARCHAR(255),
  reply_body TEXT NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saved_opportunities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, opportunity_id)
);

CREATE TABLE saved_hostels (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, hostel_id)
);

CREATE TABLE hostel_reviews (
  id SERIAL PRIMARY KEY,
  hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_opportunities_company ON opportunities(company_name);
CREATE INDEX idx_hostels_city ON hostels(city);
CREATE INDEX idx_email_campaigns_student ON email_campaigns(student_user_id);
