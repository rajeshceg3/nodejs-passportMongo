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

    // Start the server only after DB connection and setup is complete
    app.listen(3000, () => {
      console.log('Server listening on port 3000');
    });
  }
})

const mongoStore = new MongoDBStore({
  uri: mongoUrl,
  collection: "sessions"
});

// Handle errors
mongoStore.on('error',(error)=>{
  console.error(error);
});

// Link express-session with mongoStore
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

// Initialize passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Routes will use the usersCollection and passport configurations defined within the connect callback
app.get('/login', (req, res) => {
  res.render('login');
});

const redirects = {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
};

app.post('/login',passport.authenticate('local', redirects));

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.render('register', { error: 'Passwords do not match.' });
  }
  usersCollection.findOne({ username: username }, (err, existingUser) => {
    if (err) {
        console.error(err);
        return res.render('register', { error: 'An error occurred. Please try again.' });
    }
    if (existingUser) {
        return res.render('register', { error: 'Username already taken.' });
    }
    const saltRounds = 10; // Or another appropriate number
    bcrypt.genSalt(saltRounds, function(err, salt) {
      if (err) {
        console.error(err);
        return res.redirect('/register'); // Or handle error more gracefully
      }
      bcrypt.hash(password, salt, function(err, hash) {
        if (err) {
          console.error(err);
          return res.redirect('/register'); // Or handle error more gracefully
        }
        // Store hash in your password DB.
        usersCollection.insertOne({ username, password: hash }, (err) => {
          if (err) {
            console.error(err);
            res.redirect('/register');
          } else {
            res.redirect('/login');
          }
        });
      });
    });
  });
});


app.get('/', (req, res) => {
  // Check if the user is authenticated by passport local
  if (req.isAuthenticated()) {
    res.render('home',{ user: req.user.username})    
  } else {
    res.redirect('/login');
  }
});

app.get('/about', (req, res) => {
  // Check if the user is authenticated by passport local
  if (req.isAuthenticated()) {
    res.render('about')    
  } else {
    res.redirect('/login');
  }
});

app.get('/gallery', (req, res) => {
  // Check if the user is authenticated by passport local
  if (req.isAuthenticated()) {
    res.render('gallery')    
  } else {
    res.redirect('/login');
  }
});

app.get('/contact', (req, res) => {
  // Check if the user is authenticated by passport local
  if (req.isAuthenticated()) {
    res.render('contact')    
  } else {
    res.redirect('/login');
  }
});

app.get('/logout',(req,res)=>{
  req.logOut(()=>{
    res.redirect('/login');
  });
})
