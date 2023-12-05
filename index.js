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

// ROUTES
app.get('/', (req, res) => {
  res.render('pages/index');
})

app.get('/survey', (req, res) => {
    res.render('pages/survey');
})

app.get('/modify', (req, res) => {
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
app.get('/validateUser', async (req, res) => {
  // add knex framework to connect with db here
  // if user exists, load session vars with loggedIn = True, store username, and store userRole
  // NOTE: this is setting default values until we can update them with correct ones

  // TO TEST:
  // req.session.loggedin = true;
  // req.session.username = "superuser";
  // req.session.role = "admin";

  // console.log(req.session.loggedin);
  // console.log(req.session.username);
  // console.log(req.session.role);

  // res.send('Session variables set for testing.');
  
  // to actually implement it:
  const usernameToCheck = req.query.username;
  try {
    const user = await db('USERS').where({ username: usernameToCheck }).first();

    if (user) {
      req.session.loggedin = true;
      req.session.username = user.username;
      req.session.role = user.status;
    } else {
      res.render('page/userNotFound');
    }
  } catch (error) {
    console.error('Error validating user:', error);
    res.status(500).send('Internal Server Error');
  };

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
  // add knex framework to connect with db here
  knex("USERS").insert({
    username: req.body.username,
    password: req.body.password,
    status: req.body.role
 }).then(entry => {
    res.redirect("/createAccount");
 });
});

app.post("/modifyAccount/:username", (req, res)=> {
  // add knex framework to connect with db here
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});