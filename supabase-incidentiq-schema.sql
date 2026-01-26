-- IncidentIQ Database Schema
-- Run this in Supabase SQL Editor

-- Create incidents table
create table incidents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Basic info
  incident_reference text unique not null,
  nursery text not null,
  incident_type text not null,
  status text default 'draft' not null,

  -- Timing
  incident_date date not null,
  incident_time time not null,
  reported_by text not null,

  -- Person involved
  person_type text not null,
  person_name text not null,
  person_age text,
  person_dob date,
  person_gender text,
  person_room text,
  person_role text,

  -- Incident details
  location text not null,
  location_detail text,
  description text not null,

  -- Injury details (for accidents)
  injury_types jsonb,
  injury_causes jsonb,
  body_areas jsonb,
  injury_severity text,

  -- Allergy specific
  allergen_involved text,
  reaction_occurred boolean,
  reaction_details text,
  medication_administered boolean,
  medication_details text,

  -- First response
  first_aid_given boolean,
  first_aid_details text,
  medical_attention_required text,
  medical_attention_details text,
  hospital_attendance text,

  -- Notifications
  parents_notified boolean,
  parents_notified_by text,
  parents_notified_time timestamp with time zone,
  parent_response text,

  -- Witnesses
  witnesses jsonb,
  witness_statements_taken text,
  photos_taken boolean,

  -- Investigation
  investigation_findings text,
  root_cause_analysis jsonb,

  -- Remedial actions
  remedial_measures text,
  remedial_responsible text,
  remedial_target_date date,
  remedial_completed_date date,

  -- Regulatory
  ofsted_notifiable text,
  ofsted_notified boolean,
  ofsted_notified_date date,
  riddor_reportable text,
  riddor_reported boolean,
  riddor_reported_date date,

  -- Sign-off
  manager_review_notes text,
  manager_signed_off boolean default false,
  manager_name text,
  signed_off_at timestamp with time zone,

  -- Escalation
  escalated_to_head_office boolean default false,
  escalated_at timestamp with time zone,
  head_office_notes text
);

-- Create indexes
create index incidents_nursery_idx on incidents(nursery);
create index incidents_date_idx on incidents(incident_date);
create index incidents_type_idx on incidents(incident_type);
create index incidents_status_idx on incidents(status);
create index incidents_reference_idx on incidents(incident_reference);

-- Create witness statements table
create table witness_statements (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  incident_id uuid references incidents(id) on delete cascade,
  witness_name text not null,
  witness_role text,
  witness_contact text,
  statement_text text not null,
  statement_date date not null
);

create index witness_statements_incident_idx on witness_statements(incident_id);

-- Enable Row Level Security (open access for MVP)
alter table incidents enable row level security;
alter table witness_statements enable row level security;

create policy "Allow public access incidents" on incidents for all using (true);
create policy "Allow public access statements" on witness_statements for all using (true);

-- Function to auto-update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_incidents_updated_at
  before update on incidents
  for each row
  execute function update_updated_at_column();
