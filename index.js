const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const MongoDBStore = require('connect-mongodb-session')(session);
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
require('dotenv').config();
const secretKey = process.env.SECRET || 'secret-key';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';

const app = express();
app.use(express.urlencoded({extended:false}))

// Set view engine
app.set('view engine', 'ejs');

// Create Monogo client
const mongoclient = new MongoClient(mongoUrl, {useUnifiedTopology: true});
mongoclient.connect((err)=>{
  if(err){
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1); // Exit if DB connection fails
  }
  else{
    console.log("Conneced to Mongo server");

    // Define usersCollection AFTER successful connection
    const usersCollection = mongoclient.db('db').collection('users');

    // Define local auth strategy AFTER usersCollection is defined
    const localStrategy = new LocalStrategy((username, password, done) => {
      usersCollection.findOne({ username: username }, (err, user) => {
        if(err){
          return done(err);
        }
        if(!user){
          return done(null, false, { message: 'Incorrect username.' });
        }
        bcrypt.compare(password, user.password, function(err, result) {
          if (err) { return done(err); }
          if (result) {
            // passwords match
            return done(null, user);
          } else {
            // passwords do not match
            return done(null, false, { message: 'Incorrect password.' });
          }
        });
      })
    });
    passport.use(localStrategy);

    // Serialize and Deserialize User AFTER usersCollection is defined
    passport.serializeUser((user, done) => {
      done(null, user.username);
    });

    passport.deserializeUser((username, done) => {
      usersCollection.findOne({ username: username }, (err, user) => {
        if(err){
          done(err);
        }
        if(user){
          done(null, user);
        }
      })
    });

    // Initialize flash, passport, session INSIDE connect callback
    app.use(flash()); // Initialize flash

    const mongoStore = new MongoDBStore({
      uri: mongoUrl,
      collection: "sessions"
    });

    // Handle errors for mongoStore
    mongoStore.on('error',(error)=>{
      console.error("MongoStore Error:", error);
    });

    app.use(
      session({
        store: mongoStore,
        secret: secretKey,
        resave: false,
        saveUninitialized: false,
        cookie: {
      //  secure: true, // for HTTPS // removed this due to SSL termination
          maxAge: 1000 * 60 * 60 * 1, // 1 hour - input taken in ms
        }
      })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    // Passport strategies, serialize, deserialize also inside (already here in existing code)
    // const localStrategy = new LocalStrategy...
    // passport.use(localStrategy);
    // passport.serializeUser...
    // passport.deserializeUser...

    // === ALL ROUTE DEFINITIONS START HERE ===
    app.get('/login', (req, res) => {
      res.render('login'); // Assuming login.ejs can display flash messages
    });

    const redirects = {
      successRedirect: '/',
      failureRedirect: '/login',
      failureFlash: true
    };

    app.post('/login',passport.authenticate('local', redirects));

    app.get('/register', (req, res) => {
      res.render('register'); // Assuming register.ejs can display flash messages
    });

    app.post('/register', (req, res) => {
      const { username, password, confirmPassword } = req.body;
      if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match.');
        return res.redirect('/register');
      }
      usersCollection.findOne({ username: username }, (err, existingUser) => {
        if (err) {
            console.error(err);
            req.flash('error', 'Database error during registration. Please try again.');
            return res.redirect('/register');
        }
        if (existingUser) {
            req.flash('error', 'Username already taken.');
            return res.redirect('/register');
        }
        const saltRounds = 10; // Or another appropriate number
        bcrypt.genSalt(saltRounds, function(err, salt) {
          if (err) {
            console.error(err);
            req.flash('error', 'Error generating salt. Please try again.');
            return res.redirect('/register');
          }
          bcrypt.hash(password, salt, function(err, hash) {
            if (err) {
              console.error(err);
              req.flash('error', 'Error hashing password. Please try again.');
              return res.redirect('/register');
            }
            usersCollection.insertOne({ username, password: hash }, (err) => {
              if (err) {
                console.error(err);
                req.flash('error', 'Error saving user. Please try again.');
                return res.redirect('/register');
              } else {
                req.flash('success', 'Registration successful! Please login.'); // Optional: success flash
                res.redirect('/login');
              }
            });
          });
        });
      });
    });

    app.get('/', (req, res) => {
      if (req.isAuthenticated()) {
        res.render('home',{ user: req.user.username})
      } else {
        res.redirect('/login');
      }
    });

    app.get('/about', (req, res) => {
      if (req.isAuthenticated()) {
        res.render('about')
      } else {
        res.redirect('/login');
      }
    });

    app.get('/gallery', (req, res) => {
      if (req.isAuthenticated()) {
        res.render('gallery')
      } else {
        res.redirect('/login');
      }
    });

    app.get('/contact', (req, res) => {
      if (req.isAuthenticated()) {
        res.render('contact')
      } else {
        res.redirect('/login');
      }
    });

    app.get('/logout',(req,res)=>{
      req.logOut(()=>{ // req.logout requires a callback in newer passport versions
        res.redirect('/login');
      });
    });

    // Start the server as the last step inside the connect callback
    app.listen(3000, () => {
      console.log('Server listening on port 3000');
    });
  }
})

// Ensure this block is removed as routes are moved inside mongoclient.connect
