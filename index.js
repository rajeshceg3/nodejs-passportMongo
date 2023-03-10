const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const MongoDBStore = require('connect-mongodb-session')(session);
const MongoClient = require('mongodb').MongoClient;
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
    console.error(err);
  }
  else{
    console.log("Conneced to Mongo server")
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

// Create a hardcoded users collection
const usersCollection = mongoclient.db('db').collection('users');
usersCollection.insertOne({
  username: "foo",
  password: "bar"
})

usersCollection.insertOne({
  username: "john",
  password: "doe"
})

// Define local auth strategy
const localStrategy = new LocalStrategy((username, password, done) => {
  usersCollection.findOne({username: username},(err, user)=>{
  if(err){
    return done(err);
  }
  if(!user){
    return done( null, false);
  }
  if(user.password !== password){
    return done( null, false);
  }
  return done(null, user);
})
});

passport.use(localStrategy);

// Return the single parameter from user object
// which we want to store in req.session
passport.serializeUser((user, done) => {
  done(null, user.username);
});

passport.deserializeUser((username, done) => {
  // Do a db call to look up the user object using id
  // Here, we are hard coding it and call done method with entire user object
  usersCollection.findOne({username:username},(err,user)=>{
    if(err){
      done(err);
    }
    if(user){
      done(null, user);
    }
  })
});

app.get('/login', (req, res) => {
  res.render('login');
});

const redirects = {
  successRedirect: '/',
  failureRedirect: '/login'
};

app.post('/login',passport.authenticate('local', redirects));

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  // Insert new user into MongoDB collection
  usersCollection.insertOne({ username, password }, (err) => {
    if (err) {
      console.error(err);
      res.redirect('/register');
    } else {
      res.redirect('/login');
    }
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


app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
