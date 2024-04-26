//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const axios = require('axios');
const WEATHER_API_KEY=process.env.WEATHER_API_KEY;

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    resave : false,
    saveUninitialized : false,
    secret : process.env.PASSPORT_KEY,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery" ,false);

const connectDB = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
  
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
};

const userSchema = new mongoose.Schema({
    email : {type:String, unique:true},
    username : {type:String, unique:true},
    name : String,
    pincode : String,
    password : String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User" , userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get('/' , (req , res) => {
    res.render("home");
});

app.get('/auth/login' , (req , res) => {
    res.render("login");
});

app.get('/login' , (req , res) => {
    res.redirect('/auth/login');
});


app.get('/auth/signup' , (req , res) => {
    res.render("signup");
});

app.post("/auth/login", passport.authenticate("local",{
    successRedirect: "/",
    failureRedirect: "/auth/login?wrongCredential=1"
  }), function(req, res){
});

app.post("/auth/signup" , function(req,res){
    console.log(req.body);
    User.register({username : req.body.username , name : req.body.name , email : req.body.email , pincode : req.body.pincode} , req.body.password , function(err,user){
        if (err){
            console.log(err);
        } else {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/");
            });
        }
    });
});

app.get('/predict' , (req , res) => {
    if(req.isAuthenticated()){
        res.render("predict");
    } else {
        res.redirect('/login')
    }
});

app.get('/weather' , (req,res) => {
    const axios = require('axios');
    const location = req.body.location;

    // Test with postman
    //Make GET request to localhost:3000/weather with location parameter
    //for example : location = "Mumbai"
    axios.get(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}=${location}&aqi=no`)
        .then(response => {
            res.json(response.data);
            console.log('Response:', response.data);
        })
        .catch(error => {
            console.error('Error:', error);
        });

})


connectDB().then(() => {
    console.log("EPICS DB CONNETED SUCCESFULLY");
    app.listen(3000, () => {
        console.log("EPICS Server STARTED");
    })
});