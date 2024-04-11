-- create members table
CREATE TABLE Members(
    member_id SERIAL PRIMARY KEY,
    fname VARCHAR(255) NOT NULL,
    lname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    join_date DATE DEFAULT CURRENT_DATE,
    gender VARCHAR(255) NOT NULL,

    -- login info
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
  
);

-- create trainers table
CREATE TABLE Trainers(
    trainer_id SERIAL PRIMARY KEY,
    fname VARCHAR(255) NOT NULL,
    lname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    join_date DATE DEFAULT CURRENT_DATE,
    gender VARCHAR(255) NOT NULL,

    -- login info
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
  
);

--create admins table
CREATE TABLE Admins(
    admin_id SERIAL PRIMARY KEY,
    fname VARCHAR(255) NOT NULL,
    lname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    birth_date DATE,
    join_date DATE DEFAULT CURRENT_DATE,

    -- login info
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE FitnessGoals(
    fitnessgoal_id SERIAL PRIMARY KEY,
    member_id INT REFERENCES Members(member_id),
    goal_weight INT NOT NULL,
    goal_calories INT NOT NULL,
    goal_sleep INT NOT NULL
);

CREATE TABLE HealthMetrics(
    health_metric_id SERIAL PRIMARY KEY,
    member_id INT REFERENCES Members(member_id),
    hours_slept FLOAT,
    curr_weight FLOAT,
    height FLOAT,
    calories_consummed FLOAT
);

CREATE TABLE HealthStatistics(
    health_stats_id SERIAL PRIMARY KEY,
    member_id INT REFERENCES Members(member_id),
    hours_slept FLOAT,
    curr_weight FLOAT,
    height FLOAT,
    calories_consummed FLOAT
);

CREATE TABLE Equipment(
    equipment_id SERIAL PRIMARY KEY,
    equip_name VARCHAR(255) NOT NULL,
    model_year DATE DEFAULT CURRENT_DATE
);

CREATE TABLE Exercises(
    exercise_id SERIAL PRIMARY KEY,
    exercise VARCHAR(255) NOT NULL,
    equipment_id INT REFERENCES Equipment(equipment_id)
);

CREATE TABLE MemberRoutines(
    routine_id SERIAL PRIMARY KEY,
    exercise_id INT REFERENCES Exercises(exercise_id),
    member_id INT REFERENCES Members(member_id),
    reps INT,
    distance FLOAT
);

CREATE TABLE FitnessAchievements(
    achievements_id SERIAL PRIMARY KEY,
    member_id INT REFERENCES Members(member_id),
    achievement TEXT NOT NULL,
    achievement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- create rooms table
CREATE TABLE Rooms(
    room_num SERIAL PRIMARY KEY,
    availability BOOLEAN
);

--create schedule table
CREATE TABLE Schedule(
    schedule_id SERIAL PRIMARY KEY,
    trainer_id INT REFERENCES Trainers(trainer_id),
    day VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    CHECK (start_time < end_time),

    availability BOOLEAN NOT NULL,
    session_type VARCHAR(255) NOT NULL,
    room_num INT REFERENCES Rooms(room_num)

);

CREATE TABLE ScheduledMembers(
    table_id SERIAL PRIMARY KEY,
    schedule_id INT REFERENCES Schedule(schedule_id),
    trainer_id INT REFERENCES Trainers(trainer_id),
    member_id INT REFERENCES Members(member_id)
);

CREATE TABLE TrainerAvailability(
    availability_id SERIAL PRIMARY KEY,
    trainer_id INT REFERENCES Trainers(trainer_id),
    day VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL 
);

-- create maintenance table
CREATE TABLE Maintenance (
   maintenance_id SERIAL PRIMARY KEY,
   equipment_id INT REFERENCES Equipment(equipment_id),
   last_checkup DATE DEFAULT CURRENT_DATE
);

-- create payment table
CREATE TABLE Billing (
   bill_id SERIAL PRIMARY KEY,
   member_id INT REFERENCES Members(member_id),
   schedule_id INT REFERENCES Schedule(schedule_id),
   fee FLOAT NOT NULL,
   type VARCHAR(255),
   paid BOOLEAN DEFAULT false
);

CREATE TABLE Prices (
    price_id SERIAL PRIMARY KEY,
    session_type VARCHAR(255) NOT NULL,
    price FLOAT NOT NULL
);

-- check if schedule overlaps with existing schedule
CREATE OR REPLACE FUNCTION checkOverlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM SCHEDULE
        WHERE trainer_id = NEW.trainer_id
          AND day = NEW.day
          AND NOT (NEW.start_time >= end_time OR NEW.end_time <= start_time)
    ) THEN
        RAISE EXCEPTION 'Schedule overlaps with existing schedules';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scheduleOverlapTrigger
BEFORE INSERT ON Schedule
FOR EACH ROW
EXECUTE FUNCTION checkOverlap();

-- check if schedule matches trainer's availability 
CREATE OR REPLACE FUNCTION checkAvailability()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM TrainerAvailability
        WHERE trainer_id = NEW.trainer_id
          AND day = NEW.day
          AND (NEW.start_time < start_time OR NEW.end_time > end_time)
          AND NOT (start_time != '00:00' OR end_time != '00:00')
    ) THEN
        RAISE EXCEPTION 'Not within trainer availability';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkAvailabilityTrigger
BEFORE INSERT ON SCHEDULE
FOR EACH ROW
EXECUTE FUNCTION checkAvailability();

CREATE OR REPLACE FUNCTION validAvailability()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM TrainerAvailability
        WHERE trainer_id = NEW.trainer_id
          AND day = NEW.day
          AND ((NEW.start_time = '00:00' AND NEW.end_time != '00:00') OR (NEW.start_time != '00:00' AND NEW.end_time = '00:00'))
    ) THEN
        RAISE EXCEPTION 'Not valid';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER validAvailabilityTrigger
BEFORE UPDATE ON TrainerAvailability
FOR EACH ROW
EXECUTE FUNCTION validAvailability();
