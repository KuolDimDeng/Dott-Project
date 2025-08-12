-- Create Vehicle table
CREATE TABLE IF NOT EXISTS jobs_vehicle (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'van',
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(30),
    vin VARCHAR(17),
    fuel_type VARCHAR(20) DEFAULT 'gasoline',
    mileage INTEGER DEFAULT 0,
    license_plate VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    is_available BOOLEAN DEFAULT true,
    assigned_to_id UUID REFERENCES hr_employee(id),
    purchase_date DATE,
    purchase_price NUMERIC(10,2),
    insurance_policy VARCHAR(100),
    insurance_expiry DATE,
    last_service_date DATE,
    next_service_date DATE,
    service_interval_miles INTEGER DEFAULT 5000,
    notes TEXT,
    photo VARCHAR(200),
    created_by_id BIGINT REFERENCES custom_auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for Vehicle
CREATE INDEX IF NOT EXISTS jobs_vehicle_tenant_id_idx ON jobs_vehicle(tenant_id);
CREATE INDEX IF NOT EXISTS jobs_vehicle_tenant_status_idx ON jobs_vehicle(tenant_id, status);
CREATE INDEX IF NOT EXISTS jobs_vehicle_tenant_available_idx ON jobs_vehicle(tenant_id, is_available);
CREATE INDEX IF NOT EXISTS jobs_vehicle_tenant_registration_idx ON jobs_vehicle(tenant_id, registration_number);

-- Create JobAssignment table for ManyToMany relationship
CREATE TABLE IF NOT EXISTS jobs_jobassignment (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    job_id BIGINT NOT NULL REFERENCES jobs_job(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_employee(id) ON DELETE CASCADE,
    is_lead BOOLEAN DEFAULT false,
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by_id BIGINT REFERENCES custom_auth_user(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(tenant_id, job_id, employee_id)
);

-- Create indexes for JobAssignment
CREATE INDEX IF NOT EXISTS jobs_jobassignment_tenant_id_idx ON jobs_jobassignment(tenant_id);
CREATE INDEX IF NOT EXISTS jobs_jobassignment_tenant_job_idx ON jobs_jobassignment(tenant_id, job_id);
CREATE INDEX IF NOT EXISTS jobs_jobassignment_tenant_employee_idx ON jobs_jobassignment(tenant_id, employee_id);

-- Create ManyToMany relationship table for job employees
CREATE TABLE IF NOT EXISTS jobs_job_assigned_employees (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs_job(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_employee(id) ON DELETE CASCADE,
    UNIQUE(job_id, employee_id)
);

-- Add foreign key constraint for vehicle_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'jobs_job_vehicle_id_fkey'
    ) THEN
        ALTER TABLE jobs_job 
        ADD CONSTRAINT jobs_job_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) REFERENCES jobs_vehicle(id);
    END IF;
END $$;
