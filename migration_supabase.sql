-- PostgreSQL database dump for travel_platform
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Name: users; Type: TABLE
--
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

--
-- Name: sop_folders; Type: TABLE
--
CREATE TABLE public.sop_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    parent_id INTEGER REFERENCES public.sop_folders(id),
    created_at TIMESTAMP DEFAULT NOW()
);

--
-- Name: sop_documents; Type: TABLE
--
CREATE TABLE public.sop_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    content TEXT,
    folder_id INTEGER REFERENCES public.sop_folders(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_by INTEGER REFERENCES public.users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

--
-- Name: checklist_items; Type: TABLE
--
CREATE TABLE public.checklist_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) DEFAULT '其他',
    checklist_template VARCHAR(100) DEFAULT '默认',
    is_prepared BOOLEAN DEFAULT false,
    is_essential BOOLEAN DEFAULT false,
    is_international BOOLEAN DEFAULT false,
    is_electronic BOOLEAN DEFAULT false,
    related_doc_id INTEGER,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

--
-- Name: daily_tasks; Type: TABLE
--
CREATE TABLE public.daily_tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to INTEGER REFERENCES public.users(id),
    due_date DATE,
    project VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

--
-- Name: document_files; Type: TABLE
--
CREATE TABLE public.document_files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(300) NOT NULL,
    original_name VARCHAR(300) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    folder VARCHAR(100) DEFAULT '未分类',
    uploaded_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data
INSERT INTO public.users VALUES (1, 'Pear', '$2b$12$EkWBV2tG1EHI44zOMxRYnuwWFdeKdnI6Vg7ORdoIJmJtSmr1cHUzC', 'Pear', 'admin', true, '2026-07-20 08:14:26');
INSERT INTO public.users VALUES (2, 'employee', '$2b$12$EkWBV2tG1EHI44zOMxRYnuwWFdeKdnI6Vg7ORdoIJmJtSmr1cHUzC', '员工', 'employee', true, '2026-07-20 08:14:26');

SELECT setval('public.users_id_seq', 2, true);

-- Migration: add trip_filter column to sop_folders
ALTER TABLE public.sop_folders ADD COLUMN IF NOT EXISTS trip_filter VARCHAR(50) DEFAULT '香港差旅';

-- Migration: add trip_filter column to sop_documents (if not exists)
ALTER TABLE public.sop_documents ADD COLUMN IF NOT EXISTS trip_filter VARCHAR(50) DEFAULT '香港差旅';

