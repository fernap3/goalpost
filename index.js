'use strict';

var dotenv = require('dotenv');
var express = require('express');
var bodyParser = require('body-parser');
var plaid = require('plaid');
const expressHandlebars = require("express-handlebars");
const path = require("path");
const moment = require("moment");
const session = require("express-session");

dotenv.config();

// We store the access_token in memory - in production, store it in a secure
// persistent data store
var ACCESS_TOKEN = process.env.ACCESS_TOKEN;
var PUBLIC_TOKEN = null;
var ITEM_ID = process.env.ITEM_ID;

// Initialize the Plaid client
var client = new plaid.Client(
	process.env.PLAID_CLIENT_ID,
	process.env.PLAID_SECRET,
	process.env.PLAID_PUBLIC_KEY,
	plaid.environments[process.env.PLAID_ENV]
);

var app = express();
app.use(express.static('.'));

app.use(session({
	//store: new RedisStore(redisOptions),
	secret: process.env.SESSION_COOKIE_SECRET,
	proxy: app.settings.env === "production",
	resave: false,
	saveUninitialized: false,
	rolling: true,
	cookie: { secure: app.settings.env === "production", maxAge: 2628000000 }
}));

app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());

if (app.settings.env === "production")
	{
		// Redirect http to https in production only
		app.use((req, res, next) => {
			if (req.header("x-forwarded-proto") !== "https")
				res.redirect(`https://${req.header("host")}${req.url}`);
			else
				next();
		});
	}

app.get('/', requireLogin, async (req, res, next) => {
	const expressHandlebars = require("express-handlebars");
	const handlebars = expressHandlebars.create();

	const html = await handlebars.render(path.join(__dirname, "index.handlebars"), {
		PLAID_PUBLIC_KEY: process.env.PLAID_PUBLIC_KEY,
		PLAID_ENV: process.env.PLAID_ENV
	});

	res.send(html);
});

// Public page with login inputs
app.get("/", async (req, res, next) => {
	const expressHandlebars = require("express-handlebars");
	const handlebars = expressHandlebars.create();

	const html = await handlebars.render(path.join(__dirname, "login.handlebars"), {
	});

	res.send(html);
});

app.post('/login', function (req, res, next) {
	console.log(req.body.email, req.body.password);

	if (req.body.email === process.env.USER_EMAIL && req.body.password === process.env.USER_PASSWORD)
	{
		req.session.userId = process.env.USER_EMAIL;
	}

	res.redirect("/");
});


app.post('/get_access_token', requireLogin, function (req, res, next) {
	PUBLIC_TOKEN = req.body.public_token;
	client.exchangePublicToken(PUBLIC_TOKEN, function (error, tokenResponse) {
		if (error != null) {
			var msg = 'Could not exchange public_token!';
			console.log(msg + '\n' + JSON.stringify(error));
			return res.json({
				error: msg
			});
		}
		ACCESS_TOKEN = tokenResponse.access_token;
		ITEM_ID = tokenResponse.item_id;
		console.log('Access Token: ' + ACCESS_TOKEN);
		console.log('Item ID: ' + ITEM_ID);
		res.json({
			'error': false
		});
	});
});

app.get('/accounts', requireLogin, function (req, res, next) {
	// Retrieve high-level account information and account and routing numbers
	// for each account associated with the Item.
	client.getAuth(ACCESS_TOKEN, function (error, authResponse) {
		if (error != null) {
			var msg = 'Unable to pull accounts from the Plaid API.';
			console.log(msg + '\n' + JSON.stringify(error));
			return res.json({
				error: msg
			});
		}

		console.log(authResponse.accounts);
		res.json({
			error: false,
			accounts: authResponse.accounts,
			numbers: authResponse.numbers,
		});
	});
});

app.post('/item', requireLogin, function (request, response, next) {
	// Pull the Item - this includes information about available products,
	// billed products, webhook information, and more.
	client.getItem(ACCESS_TOKEN, function (error, itemResponse) {
		if (error != null) {
			console.log(JSON.stringify(error));
			return response.json({
				error: error
			});
		}

		// Also pull information about the institution
		client.getInstitutionById(itemResponse.item.institution_id, function (err, instRes) {
			if (err != null) {
				var msg = 'Unable to pull institution information from the Plaid API.';
				console.log(msg + '\n' + JSON.stringify(error));
				return response.json({
					error: msg
				});
			} else {
				response.json({
					item: itemResponse.item,
					institution: instRes.institution,
				});
			}
		});
	});
});

app.get('/transactions', requireLogin, function (req, res, next) {
	// Pull transactions for the Item for the last 30 days
	var startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
	var endDate = moment().format('YYYY-MM-DD');
	client.getTransactions(ACCESS_TOKEN, startDate, endDate, {
		count: 250,
		offset: 0
	}, (error, transactionsResponse) => {
		if (error != null) {
			console.log(JSON.stringify(error));
			return res.json({
				error: error
			});
		}
		console.log('pulled ' + transactionsResponse.transactions.length + ' transactions');
		res.json(transactionsResponse);
	});
});

var server = app.listen(process.env.PORT || 5000, function () {
	console.log('goalpost server listening on port ' + process.env.PORT || 5000);
});

/** Middleware to redirect the user to the home page if they are not logged in */
function requireLogin(req, res, next)
{
	if (!req.session.userId)
	{
		res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
		next("route");
	}
	else
		next();
}
