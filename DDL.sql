-- create members table
CREATE TABLE Member(
    member_id SERIAL PRIMARY KEY,
    fname VARCHAR(255) NOT NULL,
    lname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    birth_date DATE,
    join_date DATE DEFAULT CURRENT_DATE,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) UNIQUE NOT NULL,
    resting_hr INT,
    avg_sleep INT,
    curr_weight INT,
    height INT,
    goal_weight INT,
    distance INT,
    goal_time TIME
);

-- create trainers table
CREATE TABLE Trainer(
    trainer_id SERIAL PRIMARY KEY,
    fname VARCHAR(255) NOT NULL,
    lname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    birth_date DATE,
    join_date DATE DEFAULT CURRENT_DATE,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) UNIQUE NOT NULL,
    gender VARCHAR(255)
);

--create admins table
CREATE TABLE Admin(
    admin_id SERIAL PRIMARY KEY,
    fname VARCHAR(255) NOT NULL,
    lname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    birth_date DATE,
    join_date DATE DEFAULT CURRENT_DATE,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) UNIQUE NOT NULL
);

--create schedule table
CREATE TABLE Schedule(
    time_slot PRIMARY KEY TIME NOT NULL,
    member_id INT NOT NULL UNIQUE,
    trainer_id INT NOT NULL UNIQUE,
    trainer_fname VARCHAR(255) NOT NULL,
    trainer_lname VARCHAR(255) NOT NULL,
    availability VARCHAR(255) NOT NULL,
    session_type VARCHAR(255) NOT NULL,
    FOREIGN KEY (member_id)
        REFERENCES Member,
    FOREIGN KEY (trainer_id)
        REFERENCES Trainers
);