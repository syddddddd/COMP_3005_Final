const express = require('express');
const app = express();
const port = 3000;

app.set("view engine", "pug");

app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));

const session = require('express-session');
app.use(session({ 
	secret: 'top secret key',
    resave: true,
    saveUninitialized: false,
}));

const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    database: 'COMP3005Final',
    port: '5432',
	user: 'postgres',
	password: 'student',
});

client.connect().then(() => {
	console.log('Connected to PostgreSQL database');
}).catch((err) => {
	console.error('Error connecting to PostgreSQL database', err);
});

const orderByDay = "CASE \
                    WHEN day = 'Sunday' THEN 1 \
                    WHEN day = 'Monday' THEN 2 \
                    WHEN day = 'Tuesday' THEN 3 \
                    WHEN day = 'Wednesday' THEN 4 \
                    WHEN day = 'Thursday' THEN 5 \
                    WHEN day = 'Friday' THEN 6 \
                    WHEN day = 'Saturday' THEN 7 \
                    ELSE 8 \
                    END"

app.get(['/'], async (req, res) => { 
  res.render('../public/home', {});
});

app.get('/login', async (req, res) => { 
    res.render('../public/login', {});
});

app.post('/login', async (req, res) => {

    let username = req.body.username;
    let password = req.body.password;
    let user = req.body.dropdown;
    let table = user.charAt(0).toUpperCase() + user.slice(1) + 's'

    const query = "SELECT * FROM " + table +  " WHERE username=\'" + username + "\' AND password=\'" + password  + "\';";
    //console.log(query);

    client.query(query, (err,result) => {
        //console.log(result.rows);
        
        if (err){
            //console.log("error");
            res.status(401).send("error");
        }
        else{

            if (result.rows.length == 0){
                //console.log("does not exist");
                //res.status(401).send("does not exist");
                res.redirect(`http://localhost:3000/login`);
            }
            else{

                console.log("exists");
                req.session.loggedin = true;
                //req.session.user = user;
                //console.log(result.rows[0].member_id);
                //req.session.id = result.rows[0].member_id;
                req.session.user = result.rows[0];
                req.session.type = user;
                //console.log(user)
                console.log(req.session);
                //res.status(200).send("Logged in");
                res.redirect(`http://localhost:3000/${user}`);
                //res.render(`../public/${user}`, {session : req.session});

            }
        }
    });
    
});

app.get('/signup', async (req, res) => { 
    res.render('../public/signup', {});
});

app.post('/signup', async (req, res) => {

    let fname = req.body.fname;
    let lname = req.body.lname;
    let email = req.body.email;
    let phone = req.body.phone;
    let gender = req.body.gender;
    let username = req.body.username;
    let password = req.body.password;
    let user = req.body.dropdown;
    let table = user.charAt(0).toUpperCase() + user.slice(1) + 's'

    const query = "INSERT INTO " + table + " (fname, lname, email, phone_number, gender, username, password) VALUES ( \'" + fname + "\', \'" + lname + "\', \'" + email + "\', \'" + phone + "\', \'" + gender + "\', \'" + username + "\', \'" + password + "\') RETURNING *;";
    //console.log(query);

    client.query(query, (err,result) => {

        if (err){
            console.log(err);
            console.log("THERE IS ERROR")
        }
        else{
            console.log("inserted");
            req.session.user = result.rows[0];
            req.session.type = user;
            req.session.loggedin = true;
            console.log(req.session);
            res.render(`../public/${user}`, {session : req.session});
        }
    });
    
});

app.get('/member', async (req, res) => { 
    try{
        
        let user = req.session.user.member_id;
        res.redirect(`http://localhost:3000/member/${user}`);
    }
    catch(err){
        res.status(401).send("error");
    }
});

app.get('/trainer', async (req, res) => { 
    try {
        const query = "SELECT * FROM Schedule WHERE trainer_id=$1 ORDER BY " + orderByDay + ", start_time;"
        const scheduleResult = await client.query(query, [req.session.user.trainer_id]);
        console.log("getting schedule")

        console.log("exists");
        console.log(scheduleResult.rows)
        req.session.schedule = scheduleResult.rows

        const query2 = "SELECT s.schedule_id, ARRAY_AGG(s.member_id) as ids, ARRAY_AGG(CONCAT(m.fname, ' ', m.lname)) AS members FROM ScheduledMembers s JOIN Members m on m.member_id = s.member_id WHERE trainer_id=$1 Group By schedule_id";
        const classes = await client.query(query2, [req.session.user.trainer_id]);

        console.log("getting members")
        console.log(classes.rows)
        req.session.classes = classes.rows
        
        res.render('../public/trainer', {session : req.session, schedule : req.session.schedule, classes :  req.session.classes});

    } catch (err) {
        res.status(401).send("error");
    }
    
});

app.get('/admin', async (req, res) => { 
    res.render('../public/admin', {session : req.session});    
});

app.get('/member/editProfile', async (req, res) => { 
    res.render('../public/editProfile', {session : req.session});
});

app.post('/member/editProfile', async (req, res) => {

    // personal info
    let fname = req.body.fname;
    let lname = req.body.lname;
    let email = req.body.email;
    let phone = req.body.phone;
    let gender = req.body.gender;

    // fitness goals
    let goalWeight = req.body.goalWeight;
    let goalCalories = req.body.goalCalories;
    let goalSleep = req.body.goalSleep;

    // health metrics
    let sleep = req.body.sleep;
    let curWeight = req.body.currentWeight;
    let height = req.body.height;
    let calories = req.body.calories;

    // current user
    let user = req.session.user.member_id;

    // update personal info based on input by user
    let setPersonalInfo = [];
    
    if (fname){
        setPersonalInfo.push("fname = \'" + fname + "\'");
    }
    if (lname){
        setPersonalInfo.push("lname = \'" + lname + "\'");
    }
    if (email){
        setPersonalInfo.push("email = \'" + email + "\'");
    }
    if (phone){
        setPersonalInfo.push("phone = \'" + phone + "\'");
    }
    if (gender != "empty"){
        setPersonalInfo.push("gender = \'" + gender + "\'");
    }

    // if the personal info is not empty, update it
    if (setPersonalInfo.length > 0){

        let setString = "";

        setString += setPersonalInfo.join(', ');
        //console.log(setString);

        const pInfoquery = "UPDATE Members SET " + setString + " WHERE member_id= " + user;
        //console.log(pInfoquery);

        client.query(pInfoquery, (err,result) => {

            if (err){
                console.log(err);
                console.log("error updating personal info");
                res.status(401).send("error");
            }
            else{
                console.log("updated personal info");
            }
        });
    }

    // update fitness files based on input by user
    let setFitnessFiles = [];

    if (goalWeight){
        setFitnessFiles.push("goal_weight = " + goalWeight);
    }
    if (goalCalories){
        setFitnessFiles.push("goal_calories = " + goalCalories);
    }
    if (goalSleep){
        setFitnessFiles.push("goal_sleep = " + goalSleep);
    }

    // if the fitness files is not empty, update it
    if (setFitnessFiles.length > 0){

        let setFileString = "";

        setFileString += setFitnessFiles.join(', ');
       //console.log(setFileString);

        const fitnessQuery = "UPDATE FitnessGoals SET " + setFileString + " WHERE member_id= " + user;
        //console.log(fitnessQuery);

        client.query(fitnessQuery, (err,result) => {

            if (err){
                console.log("error updating fitness files");
                res.status(401).send("error");
            }
            else{
                console.log("updated fitness goals");
            }
        });

    }

    // update heath metrics based on input by user
    let setHealthMetrics = [];

    if (sleep){
        setHealthMetrics.push("hours_slept = " + sleep);
    }
    if (curWeight){
        setHealthMetrics.push("curr_weight = " + curWeight);
    }
    if (height){
        setHealthMetrics.push("height = " + height);
    }
    if (calories){
        setHealthMetrics.push("calories_consummed = " + calories);
    }

    if (setHealthMetrics.length > 0){

        let setMetricsString = "";

        setMetricsString += setHealthMetrics.join(', ');
        //console.log(setMetricsString);

        const fitnessQuery = "UPDATE HealthMetrics SET " + setMetricsString + " WHERE member_id= " + user;
        //console.log(fitnessQuery);

        client.query(fitnessQuery, (err,result) => {

            if (err){
                console.log("error updating health metrics");
                res.status(401).send("error");
            }
            else{
                console.log("updated health metrics");
            }
        });

        try{
            const query2 = "SELECT * FROM FitnessGoals WHERE member_id=" + user;
            const fitnessResults = await client.query(query2);
            //console.log(fitnessResults.rows[0]);

            if (fitnessResults.rows[0].goal_weight == curWeight){
                console.log("achieved goal weight");
                const query3 = "INSERT INTO FitnessAchievements (member_id, achievement) VALUES ( " + user + ", \' Achieved goal weight of " + curWeight + " lb \')";
                const results3 = await client.query(query3);
            }

            if (fitnessResults.rows[0].goal_weight > curWeight){
                console.log("achieved under goal weight");
                const query4 = "INSERT INTO FitnessAchievements (member_id, achievement) VALUES ( " + user + ", \' Achieved under goal weight of " + fitnessResults.rows[0].goal_weight + " lb with current weight of "+ curWeight +" lb\')";
                const results4 = await client.query(query4);
            }

            if (fitnessResults.rows[0].goal_calories == calories){
                console.log("achieved goal calorie intake");
                const query5 = "INSERT INTO FitnessAchievements (member_id, achievement) VALUES ( " + user + ", \' Achieved goal calorie intake of " + calories + " \')";
                const results5 = await client.query(query5);
            }

            if (fitnessResults.rows[0].goal_sleep == sleep){
                console.log("achieved goal sleep");
                const query6 = "INSERT INTO FitnessAchievements (member_id, achievement) VALUES ( " + user + ", \' Achieved goal hours of sleep of " + sleep + " \')";
                const results6 = await client.query(query6);
            }

        }
        catch (err){
            res.status(401).send("error inserting fitness goal into achievements");
        }
    }

    // insert into health statistis
    let setHMvariables = [];
    let setHMData = [];

    if (sleep){
        setHMvariables.push("hours_slept");
        setHMData.push(sleep);
    }
    if (curWeight){
        setHMvariables.push("curr_weight");
        setHMData.push(curWeight);
    }
    if (height){
        setHMvariables.push("height");
        setHMData.push(height);
    }
    if (calories){
        setHMvariables.push("calories_consummed");
        setHMData.push(calories);
    }

    // if the stats are not empty, update it
    if (setHMvariables.length > 0){

        let varString = "";
        let dataString = "";

        varString += setHMvariables.join(', ');
       //console.log(varString);

        dataString += "\'";
        dataString += setHMData.join("\', \'");
        dataString += "\'"
        //console.log(dataString);

        const healthQuery = "INSERT INTO HealthStatistics (member_id, " + varString + " ) VALUES ( \'" + user + "\', " + dataString + ");";
        //console.log(healthQuery);

        client.query(healthQuery, (err,result) => {

            if (err){
                console.log("error updating health stats");
                //res.status(401).send("error");
            }
            else{
                console.log("updated health stats");
            }
        });
    }


    const query = "SELECT * FROM Members WHERE member_id= " + user;

    client.query(query, (err,result) => {
        //console.log(result.rows);
        
        if (err){
            console.log("error findng the user after update");
            res.status(401).send("error");
        }
        else{
            req.session.user = result.rows[0];
            //console.log(user)
            //console.log(req.session);
            res.redirect(`http://localhost:3000/member`);
        }
    });
    
});

app.get('/member/dashboard', async (req, res) => { 

    try{

        let user = req.session.user.member_id;

        let healthstats = {};

        const avgSleep = "SELECT AVG(CAST(hours_slept as FLOAT)) FROM HealthStatistics WHERE member_id= " + user;
        const sleepResults = await client.query(avgSleep);
        healthstats.sleep = sleepResults.rows[0].avg;

        const avgWeight = "SELECT AVG(CAST(curr_weight as FLOAT)) FROM HealthStatistics WHERE member_id= " + user;
        const weightResults = await client.query(avgWeight);
        healthstats.weight = weightResults.rows[0].avg;

        const avgCalories = "SELECT AVG(CAST(calories_consummed as FLOAT)) FROM HealthStatistics WHERE member_id= " + user;
        const caloriesResults = await client.query(avgCalories);
        healthstats.calories = caloriesResults.rows[0].avg;
        
        //console.log(healthstats);

        const routines = "SELECT routine_id, exercise, reps, distance FROM MemberRoutines NATURAL INNER JOIN Exercises WHERE member_id= " + user;
        const routinesResults = await client.query(routines);

        //console.log(routinesResults.rows);

        const allExercises = "SELECT exercise FROM Exercises";
        const allExercisesResults = await client.query(allExercises);

        const achievements = "SELECT * FROM FitnessAchievements WHERE member_id=" + user + " ORDER BY achievement_date";
        const achievementsResults = await client.query(achievements);

       res.render('../public/memberDashboard', {session : req.session, health : healthstats, routines : routinesResults.rows, exercises : allExercisesResults.rows, achievements : achievementsResults.rows});
    }
    catch(err){
        res.status(401).send("error");
    }
});

app.post('/member/dashboard', async (req, res) => {

    let user = req.session.user.member_id;

    let finishRoutine = req.body.finishButton;
    let discardRoutine = req.body.discardButton;

    let addExercise = req.body.addexercise;
    let setsOrDistance = req.body.setsOrDistance;
    let addexercisebutton = req.body.addexercisebutton;

    if (finishRoutine){
        //console.log(finishRoutine);

        const routines = "SELECT * FROM MemberRoutines NATURAL INNER JOIN Exercises NATURAL INNER JOIN Equipment WHERE routine_id=" + finishRoutine + ";";
        const routinesResults = await client.query(routines);

        //console.log(routinesResults.rows[0]);

        let s = " with ";

        if (routinesResults.rows[0].reps != null){
            s += routinesResults.rows[0].reps + " reps"; 
        }
        else{
            s += "distance " + routinesResults.rows[0].distance + "km"; 
        }

        let achievement = "Finished exercise routine " + routinesResults.rows[0].exercise + s + " using the equipment: " + routinesResults.rows[0].equip_name;
        const addAchievement = "INSERT INTO FitnessAchievements (member_id, achievement) VALUES ( " + user + ", \'" + achievement + "\');";

        console.log(addAchievement);

        client.query(addAchievement, (err,result) => {

            if (err){
                console.log("error adding achievement");
                res.status(401).send("error");
            }
            else{
                console.log("added achievement");
            }
        });


        const removeRoutine = "DELETE FROM MemberRoutines WHERE routine_id= " + finishRoutine + ";";

        client.query(removeRoutine, (err,result) => {

            if (err){
                console.log("error removing routine from finished");
                res.status(401).send("error");
            }
            else{
                console.log("removed routine from finished");
                res.redirect(`http://localhost:3000/member/dashboard`);
            }
        });

    }

    if (discardRoutine){
        //console.log(discardRoutine);

        const removeRoutine = "DELETE FROM MemberRoutines WHERE routine_id= " + discardRoutine;

        client.query(removeRoutine, (err,result) => {

            if (err){
                console.log("error removing routine from discard");
                res.status(401).send("error");
            }
            else{
                console.log("removed routine from discard");
                res.redirect(`http://localhost:3000/member/dashboard`);
            }
        });

    }

    if (addexercisebutton == "pressed"){
        //console.log("add button pressed");
        //console.log("exercise_id= " + addExercise);

        let s = "";

        if (addExercise == 1 || addExercise == 2 || addExercise == 5 ){
            s = "reps";
        }
        else{
            s = "distance";
        }

        const add = "INSERT INTO MemberRoutines (member_id, exercise_id, " + s + ") VALUES ( " + user + ", " + addExercise + ", " + setsOrDistance + " );";

        //console.log(add);

        client.query(add, (err,result) => {

            if (err){
                console.log("error adding routine");
                res.status(401).send("error");
            }
            else{
                console.log("added routine");
                res.redirect(`http://localhost:3000/member/dashboard`);
            }
        });

    }

});

app.get('/member/schedule', async (req, res) => { 

    let user = req.session.user.member_id;

    try {
        const query = "SELECT * FROM ScheduledMembers sc JOIN Trainers t ON sc.trainer_id = t.trainer_id JOIN Schedule s ON sc.schedule_id = s.schedule_id WHERE sc.member_id=" + user;
        const scheduleResult = await client.query(query);
        console.log(scheduleResult.rows);
        
        res.render('../public/memberScheduling', {session : req.session, schedule : scheduleResult.rows});

    } catch (err) {
        res.status(401).send("error");
    }
    
});

app.get('/member/editSchedule/:schedId', async (req, res) => { 

    let id = req.params.schedId;
    //console.log(id)

    try {
        const reschedule = "SELECT * FROM Schedule WHERE schedule_id=$1";
        const rescheduleResults = await client.query(reschedule, [id]);
        console.log(rescheduleResults.rows[0]);

        const availabilityReshedule = "SELECT * FROM TrainerAvailability ORDER BY " + orderByDay + ", start_time;"
        const schedule = await client.query(availabilityReshedule);

        //const query2 = "SELECT s.schedule_id, ARRAY_AGG(s.member_id) as ids, ARRAY_AGG(CONCAT(m.fname, ' ', m.lname)) AS members FROM ScheduledMembers s JOIN Members m on m.member_id = s.member_id WHERE schedule_id=$1 Group By schedule_id";
        //const theClass = await client.query(query2, [id]);

        //console.log(theClass.rows[0])

        //const query3 = "SELECT room_num from Rooms WHERE availability = true ORDER BY room_num ASC";
        //const rooms = await client.query(query3);

        //console.log(rooms.rows)


        res.render('../public/m_editSchedule', {session : req.session});

        
    } catch (err) {
        res.status(401).send("error");
    }
});


app.post('/member/editSchedule/:schedId', async (req, res) => { 
    let id = req.params.schedId;

    let day = req.body.day;
    let start_time = req.body.start_hour + ':' + req.body.start_min;
    let end_time = req.body.end_hour + ':' + req.body.end_min;

    console.log(id)
    console.log(req.body)

    /*
    try {
        if (req.body.hasOwnProperty("deleteBox")) {  
            console.log("deleting")
            const query = "delete from ScheduledMembers where schedule_id =$1";
            await client.query(query, [id]);

            const query2 = "delete from Schedule where schedule_id =$1";
            await client.query(query2, [id]);

        } else {
            let room_num = null
            if (req.body.hasOwnProperty("room_num")) { 
                room_num = req.body.room_num 

                const getOldRoom = "SELECT room_num from Schedule WHERE schedule_id=$1";
                const rooms = await client.query(getOldRoom, [id]);

                const oldRoomAvailability = "UPDATE rooms SET availability = true WHERE room_num=$1"
                await client.query(oldRoomAvailability, [rooms.rows[0].room_num])
                
                const newRoomAvailability = "UPDATE rooms SET availability = false WHERE room_num=$1"
                await client.query(newRoomAvailability, [room_num])
            }

            console.log("not deleting")
            const query3 = "UPDATE schedule SET day =$1, start_time =$2, end_time=$3, room_num=$4 WHERE schedule_id =$5";
            await client.query(query3, [day, start_time, end_time, room_num, id])
        }

        
        if (req.session.type == 'trainer') {
            res.redirect(`http://localhost:3000/trainer`);
        } else {
            res.redirect(`http://localhost:3000/scheduleManagement`);
        }
        
        
    } catch (err) {
        res.status(401).send("error");
    }
    */
});

app.get('/member/:memberId', async (req, res) => { 
    let id = req.params.memberId;
    console.log(id)

    try {
        const query = "SELECT * FROM Members WHERE member_id=$1";
        const member = await client.query(query, [id]);
        console.log("getting member")

        console.log("exists");
        console.log(member.rows[0])

        const query2 = "SELECT * FROM FitnessGoals WHERE member_id=$1";
        const fitnessResults = await client.query(query2, [id]);

        const query3 = "SELECT * FROM HealthMetrics WHERE member_id=$1";
        const healthResults = await client.query(query3, [id]);
        
        res.render('../public/member', {session : req.session, member : member.rows[0], fitness : fitnessResults.rows[0], health : healthResults.rows[0]});

    } catch (err) {
        res.status(401).send("error");
    }

});


app.get('/addSession', async (req, res) => { 
    try {
        const query = "SELECT * FROM Trainers;";
        let trainers = await client.query(query);

        res.render('../public/addSession', {session : req.session, trainers : trainers.rows});
        
    } catch (err) {
        res.status(401).send("error");
    }
    
});

app.post('/addSession', async (req, res) => {

    let day = req.body.day;
    let start_time = req.body.start_hour + ':' + req.body.start_min;
    let end_time = req.body.end_hour + ':' + req.body.end_min;
    let sessType = req.body.sessType;
    let discard = req.body.discardBtn
    let id = 0;

    if (req.session.type == 'trainer') {
        id = req.session.user.trainer_id
    } else {
        id = parseInt(req.body.trainer)
    }
    
    try {
        if (!discard) {
            console.log(req.body)
            console.log(id)
            const query = "INSERT INTO SCHEDULE (trainer_id, day, start_time, end_time, availability, session_type) VALUES ( \'" + id + "\', \'" + day + "\', \'" + start_time + "\', \'" + end_time + "\', \'true\', \'" + sessType + "\') RETURNING *;";
            let result = await client.query(query);

            let sched = result.rows[0]
            console.log(sched)
            
            const query2 = "INSERT INTO ScheduledMembers (schedule_id, trainer_id) VALUES ( \'" + sched.schedule_id + "\', \'" + id + "\');";
            await client.query(query2);
        }

        if (req.session.type == 'trainer') {
            res.redirect(`http://localhost:3000/trainer`);
        } else {
            res.redirect(`http://localhost:3000/scheduleManagement`);
        }

        
        
    } catch (err) {
        console.log(err)
        res.status(401).send("error");
    }
    
});

app.get('/editSession/:schedId', async (req, res) => { 
    let id = req.params.schedId;
    console.log(id)

    try {
        const query = "SELECT * FROM Schedule WHERE schedule_id=$1";
        const session = await client.query(query, [id]);
        console.log("getting session")

        console.log("exists");
        console.log(session.rows[0])

        const query2 = "SELECT s.schedule_id, ARRAY_AGG(s.member_id) as ids, ARRAY_AGG(CONCAT(m.fname, ' ', m.lname)) AS members FROM ScheduledMembers s JOIN Members m on m.member_id = s.member_id WHERE schedule_id=$1 Group By schedule_id";
        const theClass = await client.query(query2, [id]);

        console.log(theClass.rows[0])

        const query3 = "SELECT room_num from Rooms WHERE availability = true ORDER BY room_num ASC";
        const rooms = await client.query(query3);

        console.log(rooms.rows)


        res.render('../public/editSession', {session : req.session, schedule : session.rows[0], theClass: theClass.rows[0], rooms : rooms.rows});

        
    } catch (err) {
        res.status(401).send("error");
    }

});

app.post('/editSession/:schedId', async (req, res) => { 
    let id = req.params.schedId;
    let day = req.body.day;
    let start_time = req.body.start_hour + ':' + req.body.start_min;
    let end_time = req.body.end_hour + ':' + req.body.end_min;
    let discard = req.body.discardBtn
    console.log(id)
    console.log(req.body)

    try {
        if (req.body.hasOwnProperty("deleteBox")) {  
            console.log("deleting")
            const query = "delete from ScheduledMembers where schedule_id =$1";
            await client.query(query, [id]);

            const query2 = "delete from Schedule where schedule_id =$1";
            await client.query(query2, [id]);

        } else if (!discard) {
            let room_num = null
            if (req.body.hasOwnProperty("room_num")) { 
                room_num = req.body.room_num 

                const getOldRoom = "SELECT room_num from Schedule WHERE schedule_id=$1";
                const rooms = await client.query(getOldRoom, [id]);

                const oldRoomAvailability = "UPDATE rooms SET availability = true WHERE room_num=$1"
                await client.query(oldRoomAvailability, [rooms.rows[0].room_num])
                
                const newRoomAvailability = "UPDATE rooms SET availability = false WHERE room_num=$1"
                await client.query(newRoomAvailability, [room_num])
            }

            console.log("not deleting")
            const query3 = "UPDATE schedule SET day =$1, start_time =$2, end_time=$3, room_num=$4 WHERE schedule_id =$5";
            await client.query(query3, [day, start_time, end_time, room_num, id])
        }

        
        if (req.session.type == 'trainer') {
            res.redirect(`http://localhost:3000/trainer`);
        } else {
            res.redirect(`http://localhost:3000/scheduleManagement`);
        }
        
        
    } catch (err) {
        res.status(401).send("error");
    }

});

app.get('/scheduleManagement', async (req, res) => { 
    try {
        const query = "SELECT * FROM Schedule ORDER BY " + orderByDay + ", start_time;"
        const scheduleResult = await client.query(query);
        console.log("getting schedule")

        console.log("exists");
        console.log(scheduleResult.rows)
        req.session.schedule = scheduleResult.rows

        const query2 = "SELECT s.schedule_id, ARRAY_AGG(s.member_id) as ids, ARRAY_AGG(CONCAT(m.fname, ' ', m.lname)) AS members FROM ScheduledMembers s JOIN Members m on m.member_id = s.member_id Group By schedule_id";
        const classes = await client.query(query2);

        const query3 = "SELECT s.schedule_id, ARRAY_AGG(s.trainer_id) as ids, ARRAY_AGG(CONCAT(t.fname, ' ', t.lname)) AS trainers FROM ScheduledMembers s JOIN Trainers t on t.trainer_id = s.trainer_id Group By schedule_id";
        const trainers = await client.query(query3);

        console.log("getting members")
        console.log(classes.rows)
        req.session.classes = classes.rows
        
        res.render('../public/scheduleManagement', {session : req.session, schedule : req.session.schedule, classes :  req.session.classes, trainers : trainers.rows});

    } catch (err) {
        console.log(err)

        res.status(401).send("error");
    }
    
});

app.get('/trainerAvailability', async (req, res) => { 
    let id = req.params.schedId;
    console.log(id)

    try {
        const query = "SELECT * FROM TrainerAvailability WHERE trainer_id=$1 ORDER BY " + orderByDay + ", start_time;"
        const schedule = await client.query(query, [req.session.user.trainer_id]);
        console.log("getting schedule")

        console.log("exists");
        console.log(schedule.rows)

        res.render('../public/trainerAvailability', {session : req.session, schedule : schedule.rows});

        
    } catch (err) {
        res.status(401).send("error");
    }

});

app.get('/admin/maintenance', async (req, res) => { 
    try {
        const maintenance = "SELECT * FROM Maintenance NATURAL INNER JOIN Equipment ORDER BY maintenance_id;"
        const maintenanceResult = await client.query(maintenance);
        //console.log(maintenanceResult.rows)
        
        res.render('../public/a_maintenance', {session : req.session, maintenance : maintenanceResult.rows});

    } catch (err) {
        res.status(401).send("error");
    }
    
});

app.post('/admin/maintenance', async (req, res) => { 
    try {
        let newTime = req.body.update;
        let button = req.body.updatebutton;
        
        if (button){
            //console.log(button, newTime[button-1]);

            const query = "UPDATE Maintenance SET last_checkup = \'" + newTime[button-1] + "\' WHERE maintenance_id =" + button + ";";
            let test = await client.query(query);                
            //console.log(query);

            res.redirect(`http://localhost:3000/admin/maintenance`);
                
        }
    } catch (err) {
        res.status(401).send("error updating checkup");
    }
    
});

app.get('/allAvailabilities', async (req, res) => { 
    let id = req.params.schedId;
    console.log(id)

    try {
        const query = "SELECT * FROM TrainerAvailability ORDER BY " + orderByDay + ", start_time;"
        const schedule = await client.query(query);
        console.log("getting schedule")

        console.log("exists");
        console.log(schedule.rows)

        const query2 = "SELECT * FROM Trainers";
        const trainers = await client.query(query2);

        console.log(trainers.rows)

        res.render('../public/allAvailabilities', {session : req.session, schedule : schedule.rows, trainers : trainers.rows});

        
    } catch (err) {
        res.status(401).send("error");
    }

});

app.get('/editAvailability/:availabilityId', async (req, res) => { 
    let id = req.params.availabilityId;
    console.log(id)

    try {
        const query = "SELECT * FROM TrainerAvailability WHERE availability_id=$1 ORDER BY " + orderByDay + ", start_time"

        const schedule = await client.query(query, [id]);
        console.log("getting availability")

        console.log("exists");
        console.log(schedule.rows)

        res.render('../public/editAvailability', {session : req.session, schedule : schedule.rows[0] });

    } catch (err) {
        res.status(401).send("error");
    }

});

app.post('/editAvailability/:availabilityId', async (req, res) => { 
    let id = req.params.availabilityId;
    let start_time = req.body.start_hour;
    let end_time = req.body.end_hour;
    console.log(id)
    console.log(req.body)

    try {   
        const query = "UPDATE trainerAvailability SET start_time =$1, end_time=$2 WHERE availability_id =$3";
        await client.query(query, [start_time, end_time, id])

        res.redirect(`http://localhost:3000/trainerAvailability`);
        
    } catch (err) {
        res.status(401).send("error");
    }

});

app.get('/billing/:memberId', async (req, res) => { 
    let id = req.params.memberId
    
    try {
        const getMember = "SELECT * FROM Members";
        const members = await client.query(getMember);

        console.log(req.params)
        
        let currMember;
        if (id == 0) {
            currMember = members.rows[0]
                        
        } else {
            const getMember = "SELECT * FROM Members WHERE member_id =$1";
            const member = await client.query(getMember, [id]);
            currMember = member.rows[0]
        }
           
        console.log("getting member")
        console.log("exists");
        console.log(currMember)

        //join tables
        const getMemberFees = "SELECT *, s.schedule_id AS schedule_id, m.member_id AS member_id FROM Schedule s \
                                JOIN ScheduledMembers m on s.schedule_id = m.schedule_id \
                                LEFT JOIN billing b on s.schedule_id = b.schedule_id AND m.member_id = b.member_id \
                                JOIN trainers t ON t.trainer_id = s.trainer_id \
                                JOIN prices p on s.session_type = p.session_type \
                                WHERE m.member_id =$1 ORDER BY b.bill_id DESC, " + orderByDay;
        
        const memberFees = await client.query(getMemberFees, [currMember.member_id]);

        const getTotal = "SELECT m.member_id, SUM(b.fee) AS total\
                            FROM scheduledmembers m\
                            JOIN schedule s ON s.schedule_id = m.schedule_id\
                            LEFT JOIN billing b ON s.schedule_id = b.schedule_id AND m.member_id = b.member_id\
                            JOIN prices p ON s.session_type = p.session_type\
                            WHERE m.member_id =$1 AND (b.paid is null OR b.paid = false)\
                            GROUP BY m.member_id;"

        const total = await client.query(getTotal, [currMember.member_id]);

        console.log("getting member fee")
        console.log(memberFees.rows)

        console.log(total.rows[0])
        
        res.render('../public/billing', {session : req.session, members : members.rows, currMember : currMember, memberFees : memberFees.rows, totalSum : total.rows[0]});

    } catch (err) {
        console.log(err)

        res.status(401).send("error");
    }
    
});

app.post('/billing', async (req, res) => { 
    let newId = req.body.newMember
    let create = req.body.create
    
    try {
        if(create){
            console.log(req.body)
            let schedId = create.split(":")[0]
            let price = create.split(":")[1]
            console.log(schedId, price)

            const query = "INSERT INTO Billing (member_id, schedule_id, fee) VALUES ($1, $2, $3)"
            await client.query(query, [newId, schedId, price]);
        }

        res.redirect(`http://localhost:3000/billing/${newId}`);
    } catch (err) {
        console.log(err)

        res.status(401).send("error");
    }
    
});

app.get('/updateBill/:billingId', async (req, res) => { 
    let id = req.params.billingId
    
    try { 
        //join tables
        const getMemberFees = "SELECT *, m.fname AS fname, m.lname AS lname, t.fname AS trainer_fname, t.lname AS trainer_lname\
                                FROM billing b \
                                JOIN schedule s ON b.schedule_id = s.schedule_id\
                                JOIN scheduledMembers sm ON sm.schedule_id = s.schedule_id\
                                JOIN members m ON sm.member_id = m.member_id\
                                JOIN trainers t ON s.schedule_id = t.trainer_id\
                                WHERE bill_id =$1;"
        
        const memberFees = await client.query(getMemberFees, [id]);

        console.log("getting member fee")
        console.log(memberFees.rows)
        
        res.render('../public/updateBilling', {session : req.session, memberFees : memberFees.rows[0]});

    } catch (err) {
        console.log(err)

        res.status(401).send("error");
    }
    
});

app.post('/updateBill/:ids', async (req, res) => { 
    let ids = req.params.ids;
    let memberId = ids.split(":")[0]
    let billingId = ids.split(":")[1]
    let fee = req.body.fee;
    let discard = req.body.discardBtn
    console.log(ids)
    console.log(req.body)

    try {
        if (req.body.hasOwnProperty("deleteBox")) {  
            console.log("deleting")
            const query = "delete from Billing where bill_id =$1 Returning *";
            await client.query(query, [billingId]);

        } else if (!discard && fee != '') {
            console.log("not deleting")
            const query3 = "UPDATE Billing SET fee =$1 WHERE bill_id =$2 Returning *";
            const bill = await client.query(query3, [parseFloat(fee), billingId])
            console.log(bill)
            
        }

        
        res.redirect(`http://localhost:3000/billing/${memberId}`);
    
    } catch (err) {
        res.status(401).send("error");
    }

});


app.listen(port);
console.log(`Server is listening at http://localhost:${port}`);