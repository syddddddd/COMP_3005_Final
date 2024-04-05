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
    console.log(query);

    client.query(query, (err,result) => {
        console.log(result.rows);
        
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
                console.log(user)
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
    res.render('../public/member', {session : req.session});
});

app.get('/trainer', async (req, res) => { 
    try {
        const query = "SELECT * FROM Schedule WHERE trainer_id=$1 ORDER BY time_slot";
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
        
        res.render('../public/trainer', {session : req.session, schedule : req.session.schedule, classes : req.session.classes});

    } catch (err) {
        res.status(401).send("error");
    }
    
});

app.get('/member/editProfile', async (req, res) => { 
    res.render('../public/editProfile', {session : req.session});
});

app.get('/member/:memberid', async (req, res) => { 
    let id = req.params.memberid;
    console.log(id)

    try {
        const query = "SELECT * FROM Members WHERE member_id=$1";
        const member = await client.query(query, [id]);
        console.log("getting member")

        console.log("exists");
        console.log(member.rows[0])
        
        res.render('../public/memberProfile', {session : req.session, member : member.rows[0]});

    } catch (err) {
        res.status(401).send("error");
    }

});



app.get('/addSession', async (req, res) => { 
    res.render('../public/addSession', {session : req.session});
});

app.post('/addSession', async (req, res) => {

    let day = req.body.day;
    let time = req.body.hour + ':' + req.body.min;
    let sessType = req.body.sessType;
    let id = req.session.user.trainer_id
    //console.log("session:")
    //console.log(req.session.user)
    //let table = req.session.type.charAt(0).toUpperCase() + req.session.type.slice(1) + 's'

    const query = "INSERT INTO SCHEDULE (trainer_id, day, time_slot, availability, session_type) VALUES ( \'" + id + "\', \'" + day + "\', \'" + time + "\', \'true\', \'" + sessType + "\') RETURNING *;";
    //console.log(query);

    client.query(query, (err,result) => {

        if (err){
            console.log(err);
            console.log("THERE IS ERROR")
        }
        else{
            console.log("inserted");
            //console.log(result.rows)
            //console.log(req.session.schedule)

            // if (!req.session.hasOwnProperty("schedule")) {  
            //     req.session.schedule = []
            // } 
            
            // req.session.schedule.push(result.rows[0])
            
            //console.log(req.session.schedule)
            res.redirect(`http://localhost:3000/trainer`);
            //res.render(`../public/trainer`, {session : req.session, schedule: req.session.schedule});
        }
    });
    
});


app.listen(port);
console.log(`Server is listening at http://localhost:${port}`);