// imports the express package into this JavaScript file
const express = require('express');
// import the bcrypt-nodejs package
const bcrypt = require('bcrypt-nodejs');
// import the cors package
const cors = require('cors');

// import kenex
const kenex = require('knex');
const { response } = require('express');

// connecting to our database
const db = kenex.knex({
    // our clinet is postgress
    client: 'pg',
    // we need to tell it where the database lives
    connection: {
        // where the database is (this means local host)
        host: process.env.DATABASE_URL,
        ssl: true,
        // // our user is postgres
        // user: 'postgres',
        // // our database password
        // password: '',
        // // the database name
        // database: 'smart-brain'
    }
});


// allows us to run express 
const app = express()

// to convert from json to javascript we have to do
app.use(express.json());

// allows us to be able to run this server to google chrome
app.use(cors());

// this gets the root route (localhost:3000/) and we get the request (req) and response (res)
app.get('/', (req, res) => {
    // once we get the root route we respond (respond)(send) the database of the users
    res.send('it is working');
})

// when we get the signin route we post what is in the function and we get a requatst and a response
app.post('/signin', (req, res) => {
    // we are getting the email and hash from the login table
    db.select('email', 'hash').from('login')
    // where the email is = the email put into the body (what we used to sign in)
      .where('email', '=', req.body.email)
      // and then with this data
      .then(data => {
        // we are comparing if the password that the user entered is equal to the hash
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        // if the user is valid then
        if (isValid) {
            // we are getting all the users
          return db.select('*').from('users')
           // where the email is = the email put into the body (what we used to sign in)
            .where('email', '=', req.body.email)
            // we then get the user
            .then(user => {
              // and we respond with the user
              res.json(user[0])
            })
            // if there is an error then we convert the error and put a text saying unable to get user and we do a 400 error
            .catch(err => res.status(400).json('unable to get user'))
            // elese if is valid = false
        } else {
            // if the user is not valid then we say wrong creditials
          res.status(400).json('wrong credentials')
        }
      })
      // if there is an error then we convert the error and put a text saying wrong credentials and we do a 400 error
      .catch(err => res.status(400).json('wrong credentials'))
  })

// when we get the register route we post what is in the function and we get a requatst and a response (a new user is created)
app.post('/register', (req, res) => {
    // we are using destructing here to request the email, name and password from the body
    const { email, name, password } = req.body;
    // we are hasing the password using bcrypt
    const hash = bcrypt.hashSync(password);
    // transactions make sure if something cannot be added in 1 table it cannot be addeed in the other table
    db.transaction(trx => {
        // we want to insert into the login table the hash and the email using transactions
        trx.insert({
            // we are putting the hash that we got from the body into the hash column 
            hash: hash,
            // we are putting the email that we got from the body into the email column 
            email: email
        })
            // we then put this into the login table
            .into('login')
            // and we are then returning the email (login table email)
            .returning('email')
            // we will now use the login email with the users table
            .then(loginemail => {
                // we are referencing the user database
                return trx('users')
                    // this says that when we instert a new users (e.g. Ann) we want  return all the columns 
                    .returning('*')
                    // we are inserting a new user into the user table in our database
                    .insert({
                        // we are insterting there email
                        email: loginemail[0].email,
                        // we are instring there name
                        name: name,
                        // we are instering the data they joined
                        joined: new Date()
                    })
                    // if we get a response then
                    .then(user => {
                        // we respond with the user that we just curated (returning) we want to make sure that we are returning the object
                        // make sure to always resond
                        res.json(user[0]);
                    })
            })
            // we then say if all of these passed then we want to send all this through
            .then(trx.commit)
            // if there is an error we want to catch the error and rollback the changes
            .catch(trx.rollback)
    })
        // if there is an error then we convert the error and put a text saying unable to register and we do a 400 error
        .catch(err => res.status(400).json('unable to register'))
})

// we are getting the profile id (we can get the id in the req.params property by doing :id)
app.get('/profile/:id', (req, res) => {
    // getting the id from the params on the url 
    const { id } = req.params;
    // get everything from the users table and then we check it against the id we recieve in the params and get that user (the id and id are the same so we can just 
    // destructure it i.e. id: id is the same as {id})
    db.select('*').from('users').where({ id })
        .then(user => {
            // We are saying here if the user exists then 
            if (user.length) {
                // we respond with the user
                res.json(user[0])
                //  if the user does not exist 
            } else {
                res.status(400).json('Not Found')
            }
        })
        // if there is an error we catach the eror and write error getting user
        .catch(err => res.status(400).json('error getting user'))
})


app.put('/image', (req, res) => {
    // getting the id from the body 
    const { id } = req.body;
    // what we are saying here if the id in the users database is = to the id from the body
    db('users').where('id', '=', id)
    // we then want to increment the entries column by 1
    .increment('entries', 1)
    // we then want to return the new entries
    .returning('entries')
    // we then want to get the entries
    .then(entries => {
      // we then want to respond with the new entries 
      res.json(entries[0].entries);
    })
    // if there is an error we catach the eror and write unable to get entries
    .catch(err => res.status(400).json('unable to get entries'))
})

// we are saying here that the server is working on port 3000 and once it has been loading we do something
app.listen(process.env.PORT || 3000, () => {
    // once the app is loaded we cosole.log app is running on port 3000
    console.log(`app is running on port ${process.env.PORT}`);
})
