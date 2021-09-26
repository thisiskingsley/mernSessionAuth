const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const Product = require('./models/product');
const Farm = require('./models/farm');
const User = require('./models/user');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');

require('dotenv').config();

const db = process.env.MONGO_URI;

mongoose
	.connect(db, {
		useNewUrlParser: true,
		useFindAndModify: false,
		useCreateIndex: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log('MongoDB Connected...'))
	.catch(err => console.log(err));

// prettier-ignore

//Body-Parser Middleware (for parsing <form> data from a POST request.)
app.use(express.urlencoded({extended: true}));
//Body-Parser (for parsing JSON data from a POST request)
app.use(express.json());
//Middleware that allows access to XMLHttpRequests,
//that is otherwise blocked by CORS(Cross-Origin Resource Sharing) policy.
app.use(
	cors({
		// below saves cookies to browser on localhost, make sure to add deployed website to this.
		origin: [/^http:\/\/localhost/],
		credentials: true,
	})
);
//Mongo-Store for Express-Session
const store = MongoStore.create({
	mongoUrl: db,
	touchAfter: 24 * 60 * 60, //only resave the session, if no change has been made, after 24 hours (time is in seconds, not milliseconds)
	crypto: {
		secret: process.env.SESSION_SECRET,
	},
});

//Express-Session & Configuration
const sessionConfig = {
	store, //our mongo session store.
	name: 'session',
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: true,
	cookie: {
		httpOnly: true, //this cookie cannot be accessed through client-side scripting. Just extra security.
		secure: true, //this cookie can only be configured over HTTPS(secure) vs HTTP.
		expires: Date.now() + 1000 * 60 * 60 * 24 * 2, // this cookie expires in a 2 DAYS. Date.now() is in milliseconds.
		maxAge: 1000 * 60 * 60 * 24 * 2, //this cookie can only be 2 DAYS OLD
	},
};
app.use(session(sessionConfig));

//Middleware that checks to see if a user is logged in by
//checking if there's no lastModified property on the session.
const isLoggedIn = (req, res, next) => {
	//There's probably a way better way to do this. But I can't pull req.session.user here for some reason.
	if (req.session.lastModified) {
		return res.status(401).json({ msg: 'AUTHORIZATION DENIED' });
	} else {
		next();
	}
};

//==================================================================
//FARM ROUTES:
//==================================================================

//INDEX ROUTE
app.get('/farms', isLoggedIn, async (req, res, next) => {
	const farms = await Farm.find({});
	res.send(farms);
});

//CREATE ROUTE
app.post('/farms', isLoggedIn, async (req, res) => {
	//Created a new farm
	const { name, city, email } = req.body;

	const newFarm = new Farm({
		name,
		city,
		email,
	});

	await newFarm.save();
	res.send(newFarm);
});

//SHOW ROUTE
app.get('/farms/:id', isLoggedIn, async (req, res) => {
	const { id } = req.params;
	const foundFarm = await Farm.findById(id).populate('products');
	res.send(foundFarm);
});

//CREATE ROUTE FOR ASSOCIATED PRODUCT
app.post('/farms/:id/products/', isLoggedIn, async (req, res) => {
	//Find specific farm
	const { id } = req.params;
	const foundFarm = await Farm.findById(id);
	//Created a new product for a specific farm
	const { productName, price, category } = req.body;

	const newProduct = new Product({
		name: productName,
		price,
		category,
	});

	//Push that new product into that specific Farm model's "products" array (models/farm.js)
	foundFarm.products.push(newProduct);
	//Associate that specific Farm to that new Product model's "farm" field (models/product.js)
	newProduct.farm = foundFarm;
	//save the updated information.
	await foundFarm.save();
	await newProduct.save();
	res.send(foundFarm);
});

//DELETE ROUTE
app.delete('/farms/:id', isLoggedIn, async (req, res) => {
	const deletedFarm = await Farm.findByIdAndDelete(req.params.id);
	res.send(deletedFarm);
});

//==================================================================
//PRODUCT ROUTES:
//==================================================================

//INDEX ROUTE
app.get('/products', isLoggedIn, async (req, res) => {
	const products = await Product.find({});
	res.send(products);
});

//SHOW ROUTE
app.get('/products/:id', isLoggedIn, async (req, res) => {
	const { id } = req.params;
	const foundProduct = await Product.findById(id).populate('farm', 'name');
	res.send(foundProduct);
});

//CREATE ROUTE
app.post('/products', isLoggedIn, async (req, res) => {
	//Created a new product
	const { productName, price, category } = req.body;

	const newProduct = new Product({
		name: productName,
		price,
		category,
	});
	await newProduct.save();
	res.send(newProduct);
});

//UPDATE ROUTE
app.put('/products/:id', isLoggedIn, async (req, res) => {
	const { id } = req.params;
	const { productName, price, category } = req.body;

	const body = {
		name: productName,
		price,
		category,
	};

	const updatedProduct = await Product.findByIdAndUpdate(id, body, {
		new: true,
		runValidators: true,
	});

	res.send(updatedProduct);
});

//DELETE ROUTE
app.delete('/products/:id', isLoggedIn, async (req, res) => {
	const { id } = req.params;
	const deletedProduct = await Product.findByIdAndDelete(id);
	res.send(deletedProduct);
});

//==================================================================
//USER ROUTES:
//==================================================================
// @route: GET
// @description: Fetch all users by Username
// @access: Public
app.get('/users', async (req, res) => {
	const foundUsers = await User.find({});
	const userNames = [];
	foundUsers.forEach(user => userNames.push(user.username));
	res.send(userNames);
});

// @route: POST
// @description: Create a new user
// @access: Public
app.post('/users', async (req, res) => {
	try {
		const { username, password } = req.body;
		const hash = await bcrypt.hash(password, 12);
		const newUser = new User({
			username,
			password: hash,
		});
		await newUser.save();
		req.session.user = { userId: newUser._id, username: newUser.username };
		res.send(req.session.user);
	} catch (err) {
		res.redirect('/register');
		console.log(err.message);
	}
});

// @route: POST
// @description: User Login Authentication
// @access: Public
app.post('/auth', async (req, res) => {
	try {
		const { username, password } = req.body;
		const foundUser = await User.findOne({ username });
		if (!foundUser) {
			throw new Error('No Username Found!');
		}
		const matchedPassword = await bcrypt.compare(password, foundUser.password);
		if (matchedPassword) {
			req.session.user = { userId: foundUser._id, username: foundUser.username };
			res.send(req.session.user);
		} else {
			throw new Error('Invalid Credentials');
		}
	} catch (err) {
		console.log(err);
		res.redirect('/');
	}
});

// @route: GET
// @description: Get specific user data (for LOAD_USER: with every request we make, we want to try to load the user)
// @access: Private
app.get('/auth/user', async (req, res) => {
	if (req.session.user) {
		res.send(req.session.user);
	} else {
		return null;
	}
});

// @route: POST
// @description: Log out User
// @access: Public
app.post('/logout', (req, res) => {
	try {
		req.session.destroy(err => {
			//delete session data from store, using sessionID in cookie
			if (err) throw err;
			res.clearCookie('session'); // clears cookie with the sessionID name "session"
			res.send('Successfully logged out!');
		});
	} catch (err) {
		console.log(err);
	}
});

///==================================================================
//RUN SERVER
//==================================================================

const port = process.env.PORT || 3001;

app.listen(port, () => {
	console.log(`APP IS LISTENING ON PORT ${port}`);
});
