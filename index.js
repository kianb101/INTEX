const express = require('express');
let path = require("path");
const session = require('express-session');

const db = require("knex") ({
  // pass parameters to it
  client: "pg",
  connection: {
    host: process.env.RDS_HOSTNAME || 'localhost', // name of host, on AWS use the one they give 
    user:  process.env.RDS_USERNAME || 'postgres', // name of user w/ permissions on database 
    password: process.env.RDS_PASSWORD || 'admin',
    database:  process.env.RDS_DB_NAME || 'bucket_list', // name of database on postgres
    port:  process.env.RDS_PORT || 5432, // port number for postgres (postgres > properties > connection > port)
    ssl: process.env.DB_SSL_INTEX ? {rejectUnauthorized: false} : false
  }
});

const app = express();
const port =  process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

// ------- ROUTES --------
app.get('/', (req, res) => {
  res.render('pages/index');
})

app.get('/survey', (req, res) => {
    res.render('pages/survey');
})

app.get('/modify', (req, res) => {
  // knex.select().from("USERS").then(user => {
    let user = [
      { id: 1, username: 'superuser', status: 'admin' },
      { id: 2, username: 'cass', status: 'cityworker' }
    ]
    
    if (req.session.role == "admin") {
      res.render('pages/createAccount', { user: user });
    }
    else if (req.session.role == "cityworker") {
      res.render('pages/modifyAccount', { user: user });
    }
    else {
      res.render('pages/index');
    };
  // });
});

app.get('/dashboard', (req, res) => {
  res.render('pages/dashboard');
})

app.get('/results', (req, res) => {
  if (req.session.loggedin) {
    // TEST DATA
    const entries = [
      {
        survey_id: 1,
        date: '10/2/2023',
        time: '12:05:34',
        location: "Provo",
        age: 25,
        gender: "Male",
        rel_status: "Single",
        occ_status: "Employed",
        sm_user: "yes",
        avg_time: 3,
        wop_freq: 4,
        distract_freq: 2,
        restless_freq: 1,
        const_distract: 5,
        worried_freq: 3,
        concen_diff: 4,
        comp_freq: 2,
        comp_feel: 1,
        val_freq: 4,
        dep_freq: 3,
        int_fluc: 2,
        slp_issues: 5,
      },
      {
        survey_id: 2,
        date: '11/3/2023',
        time: '03:09:45',
        location: "Provo",
        age: 30,
        gender: "Female",
        rel_status: "Married",
        occ_status: "Unemployed",
        sm_user: "yes",
        avg_time: 2,
        wop_freq: 3,
        distract_freq: 4,
        restless_freq: 1,
        const_distract: 2,
        worried_freq: 5,
        concen_diff: 3,
        comp_freq: 1,
        comp_feel: 4,
        val_freq: 5,
        dep_freq: 1,
        int_fluc: 3,
        slp_issues: 2,
      },
      {
        survey_id: 3,
        date: '12/04/2023',
        time: '15:54:03',
        location: "Provo",
        age: 22,
        gender: "Non-Binary",
        rel_status: "In a relationship",
        occ_status: "Student",
        sm_user: "yes",
        avg_time: 4,
        wop_freq: 1,
        distract_freq: 5,
        restless_freq: 3,
        const_distract: 4,
        worried_freq: 2,
        concen_diff: 1,
        comp_freq: 5,
        comp_feel: 2,
        val_freq: 3,
        dep_freq: 4,
        int_fluc: 5,
        slp_issues: 1,
      },
    ];
    res.render('pages/surveyResults', { entries: entries });
  }
  else {
    res.render('pages/index');
  }
})

app.get('/login', (req, res) => {
  res.render('pages/login');
})

// ------- DATABASE CALLS --------
app.get('/validateUser', async (req, res) => {
  // TO TEST:
  req.session.loggedin = true;
  req.session.username = "superuser";
  req.session.role = "admin";

  console.log(req.session.loggedin);
  console.log(req.session.username);
  console.log(req.session.role);

  res.send('Session variables set for testing.');

  // IMPLEMENTATION:
  // const usernameToCheck = req.query.username;
  // try {
  //   const user = await db('USERS').where({ username: usernameToCheck }).first();

  //   if (user) {
  //     req.session.loggedin = true;
  //     req.session.username = user.username;
  //     req.session.role = user.status;
  //   } else {
  //     res.render('page/userNotFound');
  //   }
  // } catch (error) {
  //   console.error('Error validating user:', error);
  //   res.status(500).send('Internal Server Error');
  // };

  // then validate password
});

app.post("/addSurvey", (req, res)=> {
  knex("SURVEY_INFO").insert({
    // i don't need to include the survey id here, right?
    date: currentdate(),
    time: currenttime(),
    location: "Provo",
    age: req.body.age,
    gender: req.body.gender,
    rel_status: req.body.relationship,
    occ_status: req.body.work,
    sm_user: req.body.mediaUse,
    avg_time: req.body.time,
    wop_freq: req.body.woPurpose,
    distract_freq: req.body.distracted,
    restless_freq: req.body.restless,
    const_distract: req.body.naturalDistraction,
    worried_freq: req.body.worries,
    concen_diff: req.body.concentration,
    comp_freq: req.body.comparison,
    comp_feel: req.body.comparisonsGeneral,
    val_freq: req.body.validation,
    dep_freq: req.body.depressed,
    int_fluc: req.body.dailyActivity,
    slp_issues: req.body.sleep,
 }).then(entry => {
    res.redirect("/");
 });
  //  TODO: insert org affiliations and social media platforms into apporpriate tables- how should i do that?
});

app.post("/createAccount", (req, res)=> {
  // TODO: first check if username exists
  // If already exists, render page that has error that username already exists, with link back to create page
  knex("USERS").insert({
    username: req.body.username,
    password: req.body.password,
    status: req.body.role
 }).then(entry => {
    res.redirect("/createAccount");
 });
});

app.get("/modifyAccount/:username", (req, res)=> {
  // TODO: add knex framework to connect with db here
});

app.post("/modifyAccount", (req, res)=> {
  // TODO: edit account here
})

app.post("/deleteAccount", (req, res)=> {
  // TODO: connect db here to delete username/password
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});