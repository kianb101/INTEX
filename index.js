const express = require('express');
let path = require("path");
const session = require('express-session');
const bodyParser = require('body-parser');
const MemoryStore = require('memorystore')(session);

const knex = require("knex") ({
  // pass parameters to it
  client: "pg",
  connection: {
    host: process.env.RDS_HOSTNAME || 'localhost', // name of host, on AWS use the one they give 
    user:  process.env.RDS_USERNAME || 'postgres', // name of user w/ permissions on database 
    password: process.env.RDS_PASSWORD || 'admin',
    database:  process.env.RDS_DB_NAME || 'ebdb', // name of database on postgres
    port:  process.env.RDS_PORT || 5432, // port number for postgres (postgres > properties > connection > port)
    ssl: process.env.DB_SSL_INTEX ? {rejectUnauthorized: false} : false
  }
});

const app = express();
const port =  process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true,
  store: new MemoryStore()
}));

// ------- ROUTES --------
app.get('/', (req, res) => {
  res.render('pages/index', { loggedin: req.session.loggedin });
})

app.get('/survey', (req, res) => {
    res.render('pages/survey', { loggedin: req.session.loggedin });
})

app.get('/dashboard', (req, res) => {
  res.render('pages/dashboard', { loggedin: req.session.loggedin });
})

app.get('/report', async (req, res) => {
  try {
    const entries = await knex
      .from('survey_info')
      .select('survey_id', 'date', 'time', 'location', 'age', 'gender', 'rel_status', 'occ_status', 'sm_user', 'avg_time', 'wop_freq', 'distract_freq', 'restless_freq', 'const_distract', 'worried_freq', 'concen_diff', 'comp_freq', 'comp_feel', 'val_freq', 'dep_freq', 'int_fluc', 'slp_issues');

    // Format the date in each entry to a simpler format
    entries.forEach(entry => {
      const dateObj = new Date(entry.date);
      entry.date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    });

    for (const entry of entries) {
      const orgNums = await knex('ind_org')
        .select('num_org')
        .where('survey_id', entry.survey_id);

      const orgNumbers = orgNums.map(({ num_org }) => num_org);

      const orgNames = await knex('org_info')
        .select('type_org')
        .whereIn('num_org', orgNumbers)
        .pluck('type_org');

      const platData = await knex('ind_plat')
        .join('plat_info', 'ind_plat.num_plat', 'plat_info.num_plat')
        .select('plat_info.platform')
        .where('ind_plat.survey_id', entry.survey_id);

      entry.organizations = orgNames; // Attach organization data to each entry
      entry.platforms = platData.map(data => data.platform); // Attach platform data to each entry
    }

    res.render('pages/surveyResults', { loggedin: req.session.loggedin, entries: entries });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/search', async(req, res) => {
  let surveyID = req.query.searchID;
  let result = knex.from('survey_info').select('survey_id', 'date', 'time', 'location', 'age', 'gender', 'rel_status', 'occ_status', 'sm_user', 'avg_time', 'wop_freq', 'distract_freq', 'restless_freq', 'const_distract', 'worried_freq', 'concen_dif', 'comp_freq', 'comp_feel', 'val_freq', 'dep_freq', 'int_fluc', 'slp_issues').where({ survey_id: surveyID });
  res.render('pages/surveyResults', { loggedin: req.session.loggedin, entries: result });
});

app.get('/login', (req, res) => {
  let loggedIn = req.session.loggedin;
  if (loggedIn) {
    res.render('pages/login', { msg: "success", loggedin: req.session.loggedin });
  }
  else {
    res.render('pages/login', { msg: "", loggedin: req.session.loggedin });
  }  
})

app.get('/logout', (req, res) => {
  delete req.session.username;
  delete req.session.password;
  delete req.session.role;
  delete req.session.loggedin;
  res.render('pages/login', { msg: "logout", loggedin: req.session.loggedin });
})

// ------- DATABASE CALLS --------
app.post('/validateUser', async (req, res) => {
  // // TO TEST:
  // req.session.loggedin = true;
  // req.session.username = "person";
  // req.session.role = "admin";

  // console.log(req.session.loggedin);
  // console.log(req.session.username);
  // console.log(req.session.role);

  // res.send('Session variables set for testing.');

  // IMPLEMENTATION:
  const usernameToCheck = req.body.username ? req.body.username : '';
  const passwordToCheck = req.body.password ? req.body.password : '';
  try {
    if (usernameToCheck && passwordToCheck) {
      const user = await knex.from('users').select('username', 'status').where({ username: usernameToCheck, password: passwordToCheck }).first();
      console.log(user);

      if (user) {
        req.session.loggedin = true;
        req.session.username = user.username;
        req.session.role = user.status;
        res.redirect('/createAccount');
      } else {
        res.render('pages/login', { msg: "error", loggedin: req.session.loggedin });
      }
    }
  } catch (error) {
    console.error('Error validating user:', error);
    res.status(500).send('Internal Server Error');
  };
});

app.post("/addSurvey", async (req, res) => {
  const currentDate = new Date().toISOString().split('T')[0]; // Get current date
  const currentTime = new Date().toLocaleTimeString(); // Get current time

  try {
    const surveyEntry = {
      date: currentDate,
      time: currentTime,
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
      // Include other surveyEntry fields from your form
    };
        const organizationValues = req.body.organization || [];
        const platformValues = req.body.platform || [];
        console.log("request: ", req.body)
        // Array to store organization IDs
        const orgIds = [];
    
        // Loop through the organization array and find the num_org for each value
        for (const org of organizationValues) {
          const [{ num_org }] = await knex('org_info')
            .select('num_org')
            .where('type_org', org);
    
          if (num_org) {
            orgIds.push(num_org);
          }
        }
    
        // Array to store platform IDs
        const platformIds = [];
    
        // Loop through the platform array and find the num_plat for each value
        for (const platform of platformValues) {
          const [{ num_plat }] = await knex('plat_info')
            .select('num_plat')
            .where('platform', platform);
    
          if (num_plat) {
            platformIds.push(num_plat);
          }
        }
    
        await knex.transaction(async (trx) => {
          // Insert surveyEntry into survey_info table
          const [surveyIDpg] = await trx('survey_info').insert(surveyEntry).returning('survey_id');
          const entries =  Object.entries(surveyIDpg);
          let surveynum = 0
          // goes through the json object returned from postgres and isolates the survey_id value, returning it to surveynum
          entries.forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
            surveynum = value;
          });

          let surveyId = surveynum
          // Loop through each selected organization and insert into ind_org table
          for (const org of organizationValues) {
            // Find num_org based on the type_org from org_info table
            const [{ num_org }] = await trx('org_info').select('num_org').where('type_org', org);
    
            // Insert num_org and survey_id into ind_org table
            await trx('ind_org').insert({ num_org, survey_id: surveyId });
          }
    
          // Loop through each selected platform and insert into ind_plat table
          for (const platform of platformValues) {
            // Find num_plat based on the platform from plat_info table
            const [{ num_plat }] = await trx('plat_info').select('num_plat').where('platform', platform);
    
            // Insert num_plat and survey_id into ind_plat table
            await trx('ind_plat').insert({ num_plat, survey_id: surveyId });
          }
    
          // Commit the transaction
          await trx.commit();
        });
    
        res.status(200).send('Survey added successfully!');
      } catch (error) {
        console.error('Error adding survey:', error);
        res.status(500).send('Error adding survey');
      }
    });

app.get("/createAccount", async (req, res) => {
  let role = req.session.role;

  if (role == "admin") {
    if (req.query.msg == 'success') {
      // let users = await knex.from("users").select('username', 'password', 'status');
      let users = req.session
      res.render('pages/createAccount', { user: users, msg: "success", loggedin: req.session.loggedin });
    }
    else {
      let users = await knex.from("users").select('username', 'password', 'status');
      res.render('pages/createAccount', { user: users, msg: "", loggedin: req.session.loggedin });
    }
  }
  else if (role == "cityworker") {
    let user = await knex.from("users").select('username', 'password', 'status').where({ username: req.session.username });
    res.render('pages/modifyAccount', { user: user, loggedin: req.session.loggedin });
  }
  else {
    res.redirect('/');
  };
});

app.post("/createAccount", async (req, res)=> {
  const usernameToCheck = req.body.username ? req.body.username : '';
  const passwordOne = req.body.password ? req.body.password : '';
  const passwordTwo = req.body.newPassword ? req.body.newPassword : '';
  let user = await knex.from('users').where({ username: usernameToCheck }).first();
  let users = await knex.from('users').select('username', 'password', 'status');

  if (user) {
    res.render('pages/createAccount', { user: users, msg: 'error', loggedin: req.session.loggedin });
  }
  else if (passwordOne != passwordTwo) {
    res.render('pages/createAccount', { user: users, msg: 'password', loggedin: req.session.loggedin })
  }
  else {
    knex.from("users").insert({
      username: req.body.username,
      password: req.body.password,
      status: req.body.role
    }).then(entry => {
      // res.render('pages/createAccount', { user: users, msg: 'success' });
      res.redirect('/createAccount?msg=success');
    }).catch(error => {
      console.error(error);
    });
  };
});

app.get("/editAccount/:username", (req, res) => {
  knex.from("users").select("username", "password").where("username", req.params.username).then(user => {
    res.render("pages/editAccount", { user: user, loggedin: req.session.loggedin });
  }).catch(err => {
    console.log(err);
    res.status(500).json({ err });
  });
});
app.get("/editAccountWorker/:username", (req, res) => {
  knex.from("users").select("username", "password").where("username", req.params.username).then(user => {
    res.render("pages/editAccountWorker", { user: user, loggedin: req.session.loggedin });
  }).catch(err => {
    console.log(err);
    res.status(500).json({ err });
  });
});

app.post("/editAccountUsername", async (req, res) => {
  try {
    const currentUsername = req.body.username;
    const newUsername = req.body.newUsername;

    // Update the username in the database
    await knex.from("users").where("username", currentUsername).update({
      username: newUsername,
    });

    // Redirect back to the createAccount page after the update
    res.redirect("/createAccount?success=true");
  } catch (error) {
    console.error(error);
    res.status(500).send("Invalid Username. (Username already taken)");
  }
});

app.post("/editAccountPassword", async (req, res) => {
  try {
    const currentUsername = req.body.username;
    const newPassword = req.body.newPassword;

    // Update the username in the database
    await knex.from("users").where("username", currentUsername).update({
      password: newPassword,
    });

    // Redirect back to the createAccount page after the update
    res.redirect("/createAccount?success=true");
  } catch (error) {
    console.error(error);
    res.status(500).send("Invalid Password.");
  }
});


app.post("/modifyAccount", (req, res)=> {
  // TODO: edit account here
});

app.post("/deleteAccount", (req, res)=> {
  knex("users").where("username",req.body.username).del().then( user => {
    res.redirect("/createAccount");
 }).catch( err => {
    console.log(err);
    res.status(500).json({err});
 });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});