-- Create django_site table
CREATE TABLE IF NOT EXISTS django_site (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(100) NOT NULL,
    name VARCHAR(50) NOT NULL,
    CONSTRAINT django_site_domain_key UNIQUE (domain)
);

-- Create django_session table
CREATE TABLE IF NOT EXISTS django_session (
    session_key VARCHAR(40) PRIMARY KEY,
    session_data TEXT NOT NULL,
    expire_date TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS django_session_expire_date_idx ON django_session (expire_date);

-- Create auth_user table (for admin)
CREATE TABLE IF NOT EXISTS auth_user (
    id SERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE NULL,
    is_superuser BOOLEAN NOT NULL,
    username VARCHAR(150) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL,
    is_staff BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create django_admin_log table
CREATE TABLE IF NOT EXISTS django_admin_log (
    id SERIAL PRIMARY KEY,
    action_time TIMESTAMP WITH TIME ZONE NOT NULL,
    object_id TEXT NULL,
    object_repr VARCHAR(200) NOT NULL,
    action_flag SMALLINT NOT NULL CHECK (action_flag > 0),
    change_message TEXT NOT NULL,
    content_type_id INTEGER NULL REFERENCES django_content_type(id),
    user_id INTEGER NOT NULL REFERENCES auth_user(id)
);

-- Insert default site
INSERT INTO django_site (id, domain, name)
VALUES (1, 'example.com', 'example.com')
ON CONFLICT (id) DO NOTHING;

-- Create any additional Django tables needed by applications
CREATE TABLE IF NOT EXISTS django_redirect (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES django_site(id),
    old_path VARCHAR(200) NOT NULL,
    new_path VARCHAR(200) NOT NULL
);
CREATE INDEX IF NOT EXISTS django_redirect_site_id_idx ON django_redirect (site_id);
CREATE INDEX IF NOT EXISTS django_redirect_old_path_idx ON django_redirect (old_path);

-- Create token_blacklist tables (for JWT auth)
CREATE TABLE IF NOT EXISTS token_blacklist_outstandingtoken (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id INTEGER NULL REFERENCES auth_user(id)
);

CREATE TABLE IF NOT EXISTS token_blacklist_blacklistedtoken (
    id SERIAL PRIMARY KEY,
    blacklisted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    token_id INTEGER NOT NULL REFERENCES token_blacklist_outstandingtoken(id) UNIQUE
);

-- Create account related tables for allauth
CREATE TABLE IF NOT EXISTS account_emailaddress (
    id SERIAL PRIMARY KEY, 
    email VARCHAR(254) NOT NULL,
    verified BOOLEAN NOT NULL,
    "primary" BOOLEAN NOT NULL,
    user_id INTEGER NOT NULL REFERENCES auth_user(id)
);
CREATE INDEX IF NOT EXISTS account_emailaddress_user_id_idx ON account_emailaddress (user_id);
CREATE INDEX IF NOT EXISTS account_emailaddress_email_idx ON account_emailaddress (email);

CREATE TABLE IF NOT EXISTS account_emailconfirmation (
    id SERIAL PRIMARY KEY,
    created TIMESTAMP WITH TIME ZONE NOT NULL,
    sent TIMESTAMP WITH TIME ZONE NULL,
    key VARCHAR(64) NOT NULL UNIQUE,
    email_address_id INTEGER NOT NULL REFERENCES account_emailaddress(id)
);
CREATE INDEX IF NOT EXISTS account_emailconfirmation_email_address_id_idx ON account_emailconfirmation (email_address_id); 