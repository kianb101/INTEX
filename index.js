const express = require('express');
let path = require("path");
const session = require('express-session');
const bodyParser = require('body-parser');

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
	saveUninitialized: true
}));

// ------- ROUTES --------
app.get('/', (req, res) => {
  res.render('pages/index');
})

app.get('/survey', (req, res) => {
    res.render('pages/survey');
})

app.get('/manage', (req, res) => {
    // FOR TESTING:
    // let users = [
    //   { id: 1, username: 'superuser', status: 'admin' },
    //   { id: 2, username: 'person', status: 'cityworker' }
    // ]

    // let user = [
    // { id: 2, username: 'person', status: 'cityworker' }
    // ]
    
    if (req.session.role == "admin") {
      let users = knex.select().from("users");
      req.session.users = users;
      res.render('pages/createAccount', { user: users, error: false, success: false });
    }
    else if (req.session.role == "cityworker") {
      let user = knex.select().from("users").where({ username: req.session.username });
      req.session.user = user;
      res.render('pages/modifyAccount', { user: user });
    }
    else {
      res.render('pages/index');
    };
});

app.get('/dashboard', (req, res) => {
  res.render('pages/dashboard');
})

app.get('/results', (req, res) => {
  if (req.session.loggedin) {
    // TODO: come back to this page and figure out what to show...
    let entries = knex.select().from("survey_info")
    // TEST DATA
    // const entries = [
    //   {
    //     survey_id: 1,
    //     date: '10/2/2023',
    //     time: '12:05:34',
    //     location: "Provo",
    //     age: 25,
    //     gender: "Male",
    //     rel_status: "Single",
    //     occ_status: "Employed",
    //     sm_user: "yes",
    //     avg_time: 3,
    //     wop_freq: 4,
    //     distract_freq: 2,
    //     restless_freq: 1,
    //     const_distract: 5,
    //     worried_freq: 3,
    //     concen_diff: 4,
    //     comp_freq: 2,
    //     comp_feel: 1,
    //     val_freq: 4,
    //     dep_freq: 3,
    //     int_fluc: 2,
    //     slp_issues: 5,
    //   },
    //   {
    //     survey_id: 2,
    //     date: '11/3/2023',
    //     time: '03:09:45',
    //     location: "Provo",
    //     age: 30,
    //     gender: "Female",
    //     rel_status: "Married",
    //     occ_status: "Unemployed",
    //     sm_user: "yes",
    //     avg_time: 2,
    //     wop_freq: 3,
    //     distract_freq: 4,
    //     restless_freq: 1,
    //     const_distract: 2,
    //     worried_freq: 5,
    //     concen_diff: 3,
    //     comp_freq: 1,
    //     comp_feel: 4,
    //     val_freq: 5,
    //     dep_freq: 1,
    //     int_fluc: 3,
    //     slp_issues: 2,
    //   },
    //   {
    //     survey_id: 3,
    //     date: '12/04/2023',
    //     time: '15:54:03',
    //     location: "Provo",
    //     age: 22,
    //     gender: "Non-Binary",
    //     rel_status: "In a relationship",
    //     occ_status: "Student",
    //     sm_user: "yes",
    //     avg_time: 4,
    //     wop_freq: 1,
    //     distract_freq: 5,
    //     restless_freq: 3,
    //     const_distract: 4,
    //     worried_freq: 2,
    //     concen_diff: 1,
    //     comp_freq: 5,
    //     comp_feel: 2,
    //     val_freq: 3,
    //     dep_freq: 4,
    //     int_fluc: 5,
    //     slp_issues: 1,
    //   },
    // ];
    res.render('pages/surveyResults', { entries: entries });
  }
  else {
    res.render('pages/index');
  }
})

app.get('/login', (req, res) => {
  res.render('pages/login', { error: false });
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
  console.log("Request body", req.body);
  // TODO: request body is being returned emtpy
  const usernameToCheck = req.body.username ? req.body.username : '';
  const passwordToCheck = req.body.password ? req.body.password : '';
  try {
    if (usernameToCheck && passwordToCheck) {
      const user = await knex('users').where({ username: usernameToCheck, password: passwordToCheck }).first();
      console.log(user);

      if (user) {
        req.session.loggedin = true;
        req.session.username = user.username;
        req.session.role = user.status;
        res.redirect('/dashboard');
      } else {
        res.render('pages/login', { error: true });
      }
    }
  } catch (error) {
    console.error('Error validating user:', error);
    res.status(500).send('Internal Server Error');
  };

  // TO TEST
  // res.render('pages/login', { error: true });
});

// app.post("/addSurvey", (req, res)=> {
//   knex("survey_info").insert({
//     date: currentdate(),
//     time: currenttime(),
//     location: "Provo",
//     age: req.body.age,
//     gender: req.body.gender,
//     rel_status: req.body.relationship,
//     occ_status: req.body.work,
//     sm_user: req.body.mediaUse,
//     avg_time: req.body.time,
//     wop_freq: req.body.woPurpose,
//     distract_freq: req.body.distracted,
//     restless_freq: req.body.restless,
//     const_distract: req.body.naturalDistraction,
//     worried_freq: req.body.worries,
//     concen_diff: req.body.concentration,
//     comp_freq: req.body.comparison,
//     comp_feel: req.body.comparisonsGeneral,
//     val_freq: req.body.validation,
//     dep_freq: req.body.depressed,
//     int_fluc: req.body.dailyActivity,
//     slp_issues: req.body.sleep,
//  }).then(entry => {
//     res.redirect("/");
//  });
//   //  TODO: insert org affiliations and social media platforms into appropriate tables- how should i do that?

// });

const currentDate = new Date().toISOString().split('T')[0]; // Get current date
const currentTime = new Date().toLocaleTimeString(); // Get current time

app.post("/addSurvey", async (req, res) => {
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

          entries.forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
            console.log(value);
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
    

console.log(currentDate);
console.log(currentTime);
// app.post("/addSurvey", async (req, res) => {
//   try {
//     const valueToCompare = req.body.platform; // The value you want to compare
//     const surveyEntry = {
//       date: currentDate,
//       time: currentTime,
//       location: "Provo",
//       age: req.body.age,
//       gender: req.body.gender,
//       rel_status: req.body.relationship,
//       occ_status: req.body.work,
//       sm_user: req.body.mediaUse,
//       avg_time: req.body.time,
//       wop_freq: req.body.woPurpose,
//       distract_freq: req.body.distracted,
//       restless_freq: req.body.restless,
//       const_distract: req.body.naturalDistraction,
//       worried_freq: req.body.worries,
//       concen_diff: req.body.concentration,
//       comp_freq: req.body.comparison,
//       comp_feel: req.body.comparisonsGeneral,
//       val_freq: req.body.validation,
//       dep_freq: req.body.depressed,
//       int_fluc: req.body.dailyActivity,
//       slp_issues: req.body.sleep,
//     };
//     console.log(surveyEntry)
//     await knex.transaction(async (trx) => {
//       const result = await trx
//         .select('platform', 'num_plat')
//         .from('plat_info')
//         .where('platform', valueToCompare)
//         .first();
//       console.log(result);
//       let valueToInsert = null;
//       if (result) {
//         valueToInsert = result.num_plat;
//       } else {
//         // If no match found, fetch default value from "plat_info" table
//         const defaultResult = await trx
//           .select('num_plat')
//           .from('plat_info')
//           .first();
//         valueToInsert = defaultResult.num_plat;
//       }
//       console.log(valueToInsert);
      
//       await trx('survey_info').insert({
//         ...surveyEntry,
//         num_plat: valueToInsert,
//         // Other columns to insert
//       });
//     });
//     res.redirect("/");
//   } catch (error) {
//     console.error('Error inserting data:', error);
//     res.status(500).send('Error inserting data');
//   }
// });


app.post("/createAccount", async (req, res)=> {
  // TODO: first check if username exists
  // If already exists, render page that has error that username already exists, with link back to create page
  const usernameToCheck = req.query.username;
  const user = await knex('users').select().where({ username: usernameToCheck }).first();
  if (user) {
    res.render("pages/createAccount", { user: req.session.users, error: true, success: false })
  }
  else {
    knex("users").insert({
      username: req.body.username,
      password: req.body.password,
      status: req.body.role
    }).then(entry => {
      res.redirect("pages/createAccount", { user: req.session.users, error: false, success: true });
    }).catch(error => {
      console.error(error);
    });
  };
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