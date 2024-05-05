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

const dataSchema = new mongoose.Schema({
    state : {type:String, unique:true},
    ph : String,
    rainfall : String,
});

const Data = mongoose.model("Data" , dataSchema);

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
    User.register({username : req.body.username , name : req.body.name , email : req.body.usernamex} , req.body.password , function(err,user){
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

// app.post('/predict' , (req , res) => {
//     if(req.isAuthenticated()){
//         const data = req.body;
    
//         axios.get(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${data.location}&aqi=no`)
//             .then(weatherResponse => {
//                 let ph = 0 ;
//                 let rainfall = 0;
//                 Data.findOne({state : weatherResponse.data.location.region} , (err , foundPost) => {
//                     ph = foundPost.ph;
//                     rainfall = foundPost.rainfall;

//                     console.log(ph);
//                     console.log(rainfall);

//                 })

//                 const inputData = {
//                     "input_features": [parseFloat(data.nitrogen), parseFloat(data.phosphorus), parseFloat(data.potassium), parseFloat(weatherResponse.data.current.temp_c), parseFloat(weatherResponse.data.current.humidity), ph, rainfall]
//                 }
    
//                 // Pass weather data to the ML API
//                 return axios.post('http://127.0.0.1:5000/predict', { inputData });
//             })
//             .then(mlResponse => {
//                 // Send ML API response to the client
//                 res.render('prediction' , {data : mlResponse.data})
//             })
//             .catch(error => {
//                 console.error('Error:', error);
//                 res.render('500')
//             });
    
//     } else {
//         res.redirect('/login')
//     }

// });

app.post('/predict', async (req, res) => {
    try {
        if (req.isAuthenticated()) {
            const data = req.body;

            const weatherResponse = await axios.get(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${data.location}&aqi=no`);

            const foundPost = await Data.findOne({ state: weatherResponse.data.location.region });

            if (!foundPost) {
                console.error('No data found in the database for the state:', weatherResponse.data.location.region);
                return res.render('500');
            }

            const ph = foundPost.ph;
            const rainfall = foundPost.rainfall;

            console.log('ph:', ph);
            console.log('rainfall:', rainfall);

            const inputData = {
                "input_features": [
                    parseFloat(data.nitrogen),
                    parseFloat(data.phosphorus),
                    parseFloat(data.potassium),
                    parseFloat(weatherResponse.data.current.temp_c),
                    parseFloat(weatherResponse.data.current.humidity),
                    ph,
                    rainfall
                ]
            };

            const mlResponse = await axios.post('http://127.0.0.1:5000/predict', { inputData });

            // Send ML API response to the client
            return res.render('prediction', { data: mlResponse.data });
        } else {
            return res.redirect('/login');
        }
    } catch (error) {
        console.error('Error:', error);
        return res.render('500');
    }
});



app.post('/add-data', async (req, res) => {
    try {
      // Extract parameters from URL
      const { state, ph, rainfall } = req.query;
  
      // Create new Data document
      const newData = new Data({
        state,
        ph,
        rainfall
      });
  
      // Save the data to MongoDB
      await newData.save();
  
      res.status(200).send('Data added successfully');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });

connectDB().then(() => {
    console.log("EPICS DB CONNETED SUCCESFULLY");
    app.listen(3000, () => {
        console.log("EPICS Server STARTED");
    })
});