'use strict';

var dotenv = require('dotenv');
var express = require('express');
var bodyParser = require('body-parser');
var plaid = require('plaid');
const expressHandlebars = require("express-handlebars");
const path = require("path");
const moment = require("moment");

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

app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());

app.get('/', async (req, res, next) => {
	const expressHandlebars = require("express-handlebars");
	const handlebars = expressHandlebars.create();

	const html = await handlebars.render(path.join(__dirname, "index.handlebars"), {
		PLAID_PUBLIC_KEY: process.env.PLAID_PUBLIC_KEY,
		PLAID_ENV: process.env.PLAID_ENV
	});

	res.send(html);
});

app.post('/get_access_token', function (request, response, next) {
	PUBLIC_TOKEN = request.body.public_token;
	client.exchangePublicToken(PUBLIC_TOKEN, function (error, tokenResponse) {
		if (error != null) {
			var msg = 'Could not exchange public_token!';
			console.log(msg + '\n' + JSON.stringify(error));
			return response.json({
				error: msg
			});
		}
		ACCESS_TOKEN = tokenResponse.access_token;
		ITEM_ID = tokenResponse.item_id;
		console.log('Access Token: ' + ACCESS_TOKEN);
		console.log('Item ID: ' + ITEM_ID);
		response.json({
			'error': false
		});
	});
});

app.get('/accounts', function (request, response, next) {
	// Retrieve high-level account information and account and routing numbers
	// for each account associated with the Item.
	client.getAuth(ACCESS_TOKEN, function (error, authResponse) {
		if (error != null) {
			var msg = 'Unable to pull accounts from the Plaid API.';
			console.log(msg + '\n' + JSON.stringify(error));
			return response.json({
				error: msg
			});
		}

		console.log(authResponse.accounts);
		response.json({
			error: false,
			accounts: authResponse.accounts,
			numbers: authResponse.numbers,
		});
	});
});

app.post('/item', function (request, response, next) {
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

app.get('/transactions', function (req, res, next) {
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
