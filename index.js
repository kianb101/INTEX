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
      ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
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

// ROUTES
app.get('/', (req, res) => {
  res.render('pages/index');
})

app.get('/survey', (req, res) => {
    res.render('pages/survey');
})

app.get('/modify', (req, res) => {
  console.log("User role:", req.session.role)
  // if user role = admin, show this view
  if (req.session.role == "admin") {
    res.render('pages/createAccount');
  }
  else if (req.session.role == "cityworker") {
    res.render('pages/modifyAccount');
  }
  else {
    res.render('pages/index');
  };
})

app.get('/dashboard', (req, res) => {
  res.render('pages/dashboard');
})

app.get('/results', (req, res) => {
  if (req.session.loggedin) {
    res.render('pages/surveyResults');
  }
})

app.get('/login', (req, res) => {
  res.render('pages/login');
})

// interacting with DB
app.get('/validateUser', (req, res) => {
  // add knex framework to connect with db here
  // if user exists, load session vars with loggedIn = True, store username, and store userRole
  // NOTE: this is setting default values until we can update them with correct ones
  req.session.loggedin = true;
  req.session.username = "superuser";
  req.session.role = "admin";
})

app.post("/addSurvey", (req, res)=> {
  knex("survey_results").insert({
    date: currentdate(),
    time: currenttime(),
    age: req.body.age,
    gender: req.body.gender,
    relationship_status: req.body.relationship,
    occupation_status: req.body.work,
    affiliated_org: req.body.organization,
    social_media_use: req.body.mediaUse,
    platform: req.body.platform,
    time_spent: req.body.time,
    without_purpose: req.body.woPurpose,
    distracted: req.body.distracted,
    restless: req.body.restless,
    naturaly_distraction: req.body.naturalDistraction,
    worries: req.body.worries,
    concentration: req.body.concentration,
    comparison: req.body.comparison,
    comparisons_general: req.body.comparisonsGeneral,
    validation: req.body.validation,
    depressed: req.body.depressed,
    daily_activity: req.body.dailyActivity,
    sleep_issues: req.body.sleep,
 }).then(entry => {
    res.redirect("/");
 });
});

app.post("/createAccount", (req, res)=> {
  // add knex framework to connect with db here
});

app.post("/modifyAccount/:username", (req, res)=> {
  // add knex framework to connect with db here
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
