const express = require("express");
const ejs = require("ejs");
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.get('/' , (req , res) => {
    res.render("home");
})

app.get('/login' , (req , res) => {
    res.render("login");
});

app.get('/signup' , (req , res) => {
    res.render("signup");
});

app.get('/predict' , (req , res) => {
    res.render("predict");
});


app.listen(3000 , () => {
    console.log("SERVER STARTED");
});