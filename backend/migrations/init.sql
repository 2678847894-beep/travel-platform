-- 删除旧表并重建
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS document_files CASCADE;
DROP TABLE IF EXISTS sop_documents CASCADE;
DROP TABLE IF EXISTS sop_folders CASCADE;
DROP TABLE IF EXISTS daily_tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) DEFAULT '',
    role VARCHAR(20) DEFAULT 'employee',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sop_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sop_documents (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER REFERENCES sop_folders(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    steps JSONB DEFAULT '[]',
    responsible VARCHAR(100) DEFAULT '',
    execution_time VARCHAR(100) DEFAULT '',
    trip_filter VARCHAR(50) DEFAULT '全部',
    notes TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE daily_tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    task_date DATE NOT NULL,
    task_time VARCHAR(10) DEFAULT '',
    location VARCHAR(200) DEFAULT '',
    description TEXT DEFAULT '',
    trip_filter VARCHAR(50) DEFAULT '全部',
    is_completed BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE document_files (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) DEFAULT '',
    file_size BIGINT DEFAULT 0,
    folder_name VARCHAR(100) DEFAULT '证件类',
    trip_filter VARCHAR(50) DEFAULT '全部',
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE checklist_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) DEFAULT '其他',
    checklist_template VARCHAR(100) DEFAULT '默认',
    is_prepared BOOLEAN DEFAULT FALSE,
    is_essential BOOLEAN DEFAULT FALSE,
    is_international BOOLEAN DEFAULT FALSE,
    is_electronic BOOLEAN DEFAULT FALSE,
    related_doc_id INTEGER REFERENCES document_files(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 默认管理员 admin/admin123
INSERT INTO users (username, password_hash, nickname, role) VALUES ('admin', '$2b$12$EkWBV2tG1EHI44zOMxRYnuwWFdeKdnI6Vg7ORdoIJmJtSmr1cHUzC', '管理员', 'admin');

-- 默认员工
INSERT INTO users (username, password_hash, nickname, role) VALUES ('employee', '$2b$12$EkWBV2tG1EHI44zOMxRYnuwWFdeKdnI6Vg7ORdoIJmJtSmr1cHUzC', '员工', 'employee');

-- 默认SOP文件夹
INSERT INTO sop_folders (name, description, sort_order) VALUES 
('1-直播准备', '设备调试与预热', 1),
('2-出行前准备', '证件/行李/机票', 2),
('3-入住酒店', '预约/登记/客房检查', 3),
('4-采购流程', '选品/比价/下单', 4),
('5-直播执行', '直播前中后操作', 5),
('6-返程', '结账/退房/返程', 6),
('7-售后&复盘', '售后处理与数据复盘', 7);
