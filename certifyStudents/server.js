const express = require('express');
const OAuth2 = require('./oauth2').OAuth2;
const config = require('./config');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const exphbs  = require('express-handlebars');
const http = require('http');
const fetch = require('node-fetch');
var request = require('request');
const mongoose = require('mongoose');
const fabricController = require('./api/controllers/fabricController')

const port = 3001;

mongoose.connect('mongodb://localhost/certify', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useFindAndModify', false);

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', function() {
  console.log("We are connected");
});

var studentRouter = require('./api/routes/studentRoutes')
var professorRouter = require('./api/routes/professorRoutes')

const Student = require('./models/student')

// Express configuration
const app = express();
app.use(logger('dev'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: "skjghskdjfhbqigohqdiouk",
    resave: false,
    saveUninitialized: true
}));

var hbs = exphbs.create({});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use('/student', studentRouter);
app.use('/professor', professorRouter);

// Config data from config.js file
const client_id = config.client_id;
const client_secret = config.client_secret;
const idmURL = config.idmURL;
const response_type = config.response_type;
const callbackURL = config.callbackURL;

// Creates oauth library object with the config data
const oa = new OAuth2(client_id,
    client_secret,
    idmURL,
    '/oauth2/authorize',
    '/oauth2/token',
    callbackURL
);

// Handles requests to the main page
app.get('/', function(req, res){

    // If auth_token is not stored in a session cookie it sends a button to redirect to IDM authentication portal 
    if(!req.session.access_token) {
        res.render('login', { title: 'Inicia sesión o regístrate'})
        // res.send("Oauth2 IDM Demo.<br><br><button onclick='window.location.href=\"/auth\"'>Log in with Keyrock Account</button><br><br><button onclick='window.location.href=\"/authJWT\"'>Log in with Keyrock Account and JWT</button>");

    // If auth_token is stored in a session cookie it sends a button to get user info
    } else {
        res.redirect('/user_info');
    }
});

// Handles requests from IDM with the access code
app.get('/dashboard', function(req, res){

    // Using the access code goes again to the IDM to obtain the access_token
    oa.getOAuthAccessToken(req.query.code)
    .then (results => {

        // Stores the access_token in a session cookie
        req.session.access_token = results.access_token;
        
        res.redirect('/user_info');

    });
});

// Redirection to IDM authentication portal
app.get('/auth', function(req, res){
    const path = oa.getAuthorizeUrl(response_type);
    res.redirect(path);
});

// Redirection to IDM authentication portal
app.get('/authJWT', function(req, res){
    const path = oa.getAuthorizeUrlJWT(response_type);
    res.redirect(path);
});

// Ask IDM for user info
app.get('/user_info', async function(req, res){

    const url = config.idmURL + '/user';

    // Using the access token asks the IDM for the user info
    oa.get(url, req.session.access_token)
    .then (response => {
        const user = JSON.parse(response);
        req.session.user = user;
        
        if (user.id == 'admin') {
            console.log('admin');
            res.send(200)
        } else {
            if(user.roles[0].name == 'Student') {
                const newStudent = new Student({
                    _id: req.session.user.id,
                    name: req.session.user.username,
                    email: req.session.user.email
                })
                newStudent.save(function (error) {
                    if (!error || (error.name === 'MongoError' && error.code === 11000)) {
                        console.log(newStudent.email + " ya registrado");
                        res.redirect('/student')
                    }
                })
            } else {
                if(user.roles[0].name == 'Professor') {
                    res.redirect('/professor')
                }
            }
        }
    });
});

// Both users
app.post('/getTokenFromAPI', function(req, res) {

    email = req.body.inputEmail;
    password = req.body.inputPassword;

    request({
        method: 'POST',
        url: 'http://localhost:3000/v1/auth/tokens',
        headers: {
          'Content-Type': 'application/json'
        },
        body: `{  \"name\": \"${email}\",  \"password\": \"${password}\"}`
    }, function (error, response, body) {
        req.session.x_subject_token = response.headers['x-subject-token']
        res.redirect('/')
    });
});

app.get('/verify', function(req, res) {
    res.render('verify', { title: 'Verificar credencial' })
});

// Handles logout requests to remove access_token from the session cookie
app.get('/logout', function(req, res) {
    req.session.access_token = undefined;
    res.redirect('/');
});

app.set('port', port);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListeningServer() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log('Listening on ' + bind);
    //fabricController.start()
}

/**
 * Create HTTP server for app
 */

const server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListeningServer);