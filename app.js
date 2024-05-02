//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require('connect-mongo')(session);
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
    cookie: {
        expires: 2000000
    },
    store: new MongoStore({ mongooseConnection: mongoose.connection })

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
    password : String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User" , userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get('/' , (req , res) => {
    if(req.isAuthenticated()){
        res.render("home" , {auth : true});
        } else {
            res.render("home" , {auth : false});
            }
});

app.get("/logout", function (req, res) {
    req.logout(function () {
        res.redirect('/');
     });
});

app.get('/auth/login' , (req , res) => {
    if(req.isAuthenticated()){
        res.redirect('/')
    } else {
        res.render('login');
    }
});

app.get('/login' , (req , res) => {
    if(req.isAuthenticated()){
        res.redirect('/')
    } else {
        res.redirect('/auth/login');
    }
});


app.get('/auth/signup' , (req , res) => {
    if(req.isAuthenticated()){
        res.redirect('/')
    } else {
        res.render('signup');
    }
});

app.post("/auth/login", passport.authenticate("local",{
    successRedirect: "/",
    failureRedirect: "/auth/login?wrongCredential=1"
  }), function(req, res){
});

app.post("/auth/signup" , function(req,res){
    User.register({username : req.body.username , name : req.body.name , email : req.body.email} , req.body.password , function(err,user){
        if (err){
            console.log(err);
            res.render('500')

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

app.post('/predict' , (req , res) => {
    if(req.isAuthenticated()){
        const data = req.body;
    
        axios.get(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${data.location}&aqi=no`)
            .then(weatherResponse => {
                // Extract relevant weather data
                const ph = 23.20202;
                const rainfall = 19.23922;
                const inputData = {
                    "input_features": [parseFloat(data.nitrogen), parseFloat(data.phosphorus), parseFloat(data.potassium), parseFloat(weatherResponse.data.current.temp_c), parseFloat(weatherResponse.data.current.humidity), ph, rainfall]
                }
    
                // Pass weather data to the ML API
                return axios.post('http://127.0.0.1:5000/predict', { inputData });
            })
            .then(mlResponse => {
                // Send ML API response to the client
                res.render('prediction' , {data : mlResponse.data})
            })
            .catch(error => {
                console.error('Error:', error);
                res.render('500')
            });
    
    } else {
        res.redirect('/login')
    }

});


connectDB().then(() => {
    console.log("EPICS DB CONNETED SUCCESFULLY");
    app.listen(3000, () => {
        console.log("EPICS Server STARTED");
    })
});