/*jshint esversion: 6 */

const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const path = require("path");
const saltRounds = 10;
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
app.use(bodyParser.json());
app.use(express.static("public"));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header(
        "Access-Control-Allow-Methods",
        "PUT, POST, GET, DELETE, OPTIONS"
    );
    next();
});

mongoose.connect(process.env.DB_URL);

const categorySchema = new mongoose.Schema({
    name: String,
});

const itemSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    category: Array,
    img: String,
});

const cartItemSchema = new mongoose.Schema({
    userid: String,
    item: itemSchema,
    quantity: Number,
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    fname: String,
    lname: String,
    cart: [cartItemSchema],
});

const orderSchema = new mongoose.Schema({
    userid: String,
    item: itemSchema,
    quantity: Number,
    status: String,
});

const managerSchema = new mongoose.Schema({
    username: String,
    password: String,
    fname: String,
    lname: String,
});

const superadminSchema = new mongoose.Schema({
    username: String,
    password: String,
    fname: String,
    lname: String,
});

const User = mongoose.model("User", userSchema);
const Manager = mongoose.model("Manager", managerSchema);
const Superadmin = mongoose.model("Superadmin", superadminSchema);
const Category = mongoose.model("Category", categorySchema);
const Item = mongoose.model("Item", itemSchema);
const Order = mongoose.model("Order", orderSchema);
const CartItem = new mongoose.model("CartItem", cartItemSchema);

if (
    process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "staging"
) {
    app.use(express.static("client/build"));
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname + "/client/build/index.html"));
    });
}

let authentication = {
    user: false,
    manager: false,
    superadmin: false,
};

let person = {
    user: null,
    manager: null,
    superadmin: null,
};

app.get("/", function (req, res) {
    res.json({
        success: true,
    });
});

app.get("/auth/:person", function (req, res) {
    let isAuthenticated = null;
    if (req.params.person === "user") {
        isAuthenticated = authentication.user;
    } else if (req.params.person === "manager") {
        isAuthenticated = authentication.manager;
    } else {
        isAuthenticated = authentication.superadmin;
    }
    res.json({
        isAuthenticated: isAuthenticated,
    });
});

app.get("/categories", function (req, res) {
    Category.find({}, function (err, categories) {
        if (err) {
            console.log(err);
        } else {
            res.json({
                categories: categories,
            });
        }
    });
});

app.get("/items", function (req, res) {
    Item.find({}, function (err, items) {
        console.log(items);
        if (err) {
            console.log(err);
        } else {
            res.json({
                items: items,
            });
        }
    });
});

app.get("/item/:id", function (req, res) {
    Item.findById(req.params.id, function (err, item) {
        if (err) {
            console.log(err);
        } else {
            res.json({
                item: item,
            });
        }
    });
});

app.get("/user", function (req, res) {
    if (person.user) {
        User.findById(person.user._id, function (err, user) {
            if (err) {
                console.log(err);
            } else {
                res.json({
                    user: user,
                });
            }
        });
    } else {
        res.json({
            user: null,
        });
    }
});

app.get("/orders", function (req, res) {
    Order.find({ userid: person.user._id }, function (err, orders) {
        if (err) {
            console.log(err);
        } else {
            res.json({
                orders: orders,
            });
        }
    });
});

app.get("/all-orders", function (req, res) {
    Order.find({}, function (err, orders) {
        if (err) {
            console.log(err);
        } else {
            res.json({
                orders: orders,
            });
        }
    });
});

app.post("/approve-order", function (req, res) {
    const id = req.body.id;

    Order.findById(id, function (err, order) {
        order.status = "approved";
        order.save();
    });
});

app.post("/reject-order", function (req, res) {
    const id = req.body.id;

    Order.findById(id, function (err, order) {
        order.status = "rejected";
        order.save();
    });
});

app.post("/place-order", function (req, res) {
    const { item, quantity } = req.body;
    const order = new Order({
        userid: person.user._id,
        item: item,
        quantity: quantity,
        status: "processing",
    });
    console.log(order);
    order.save(function (err) {
        if (err) {
            console.log(err);
        }
    });
});

app.post("/place-orders", function (req, res) {
    const cart = req.body.cart;
    cart.forEach((cartItem) => {
        const order = new Order({
            userid: person.user._id,
            item: cartItem.item,
            quantity: cartItem.quantity,
            status: "processing",
        });
        order.save(function (err) {
            if (err) {
                console.log(err);
            }
        });
    });
    User.findById(person.user._id, function (err, user) {
        if (err) {
            console.log(err);
        } else {
            user.cart = [];
            user.save();
        }
    });
    CartItem.find({ userid: String(person.user._id) }, function (err, items) {
        for (var i = 0; i < items.length; i++) {
            items[i].remove();
        }
    });
});

app.post("/item/:id", function (req, res) {
    res.redirect("/item/" + req.params.id);
});

app.post("/menu/c/:category", function (req, res) {
    res.redirect("/menu/c/" + req.params.category);
});

app.post("/:person/logout", function (req, res) {
    if (req.params.person === "user") {
        authentication.user = false;
        person.user = null;
        res.redirect("/");
    } else if (req.params.person === "manager") {
        authentication.manager = false;
        person.manager = null;
        res.redirect("/manager");
    } else {
        authentication.superadmin = false;
        person.superadmin = null;
        res.redirect("/superadmin");
    }
});

app.post("/:person/login", function (req, res) {
    const { username, password } = req.body;

    if (req.params.person === "user") {
        User.findOne({ username: username }, function (err, user) {
            if (user) {
                bcrypt.compare(password, user.password, function (err, result) {
                    if (result) {
                        authentication.user = result;
                        person.user = user;
                    }
                });
            }
            res.redirect("/home");
        });
    } else if (req.params.person === "manager") {
        Manager.findOne({ username: username }, function (err, manager) {
            if (manager) {
                bcrypt.compare(
                    password,
                    manager.password,
                    function (err, result) {
                        if (result) {
                            authentication.manager = result;
                            person.manager = manager;
                        }
                    }
                );
            }
            res.redirect("/manager");
        });
    } else {
        Superadmin.findOne({ username: username }, function (err, superadmin) {
            if (superadmin) {
                bcrypt.compare(
                    password,
                    superadmin.password,
                    function (err, result) {
                        if (result) {
                            authentication.superadmin = result;
                            person.superadmin = superadmin;
                        }
                    }
                );
            }
            res.redirect("/superadmin");
        });
    }
});

app.post("/:person/signup", function (req, res) {
    const { fname, lname, username, password } = req.body;

    bcrypt.hash(password, saltRounds, function (err, hash) {
        if (req.params.person === "user") {
            const user = new User({
                fname: fname,
                lname: lname,
                username: username,
                password: hash,
            });
            user.save();
            authentication.user = true;
            person.user = user;
            res.redirect("/home");
        } else if (req.params.person === "manager") {
            const manager = new Manager({
                fname: fname,
                lname: lname,
                username: username,
                password: hash,
            });
            manager.save();
            authentication.manager = true;
            person.manager = manager;
            res.redirect("/manager");
        } else {
            const superadmin = new Superadmin({
                fname: fname,
                lname: lname,
                username: username,
                password: hash,
            });
            superadmin.save();
            authentication.superadmin = true;
            person.superadmin = superadmin;
            res.redirect("/superadmin");
        }
    });
});

app.post("/search", function (req, res) {
    const searchString = req.body.search;
    res.redirect("/menu/" + searchString);
});

app.post("/add-item", function (req, res) {
    const { img, name, description, price, category } = req.body;
    if (name !== "") {
        const item = new Item({
            img: img,
            name: name,
            description: description,
            price: price,
            category: ["All"],
        });

        if (category !== "All") {
            item.category.push(category);
        }

        item.save();
        res.json({
            success: true,
        });
    } else {
        res.json({
            success: false,
        });
    }
});

app.post("/add-item-to-cart", function (req, res) {
    const { item, quantity } = req.body;

    const cartItem = new CartItem({
        userid: person.user._id,
        item: item,
        quantity: Number(quantity),
    });

    User.findById(person.user._id, function (err, user) {
        if (err) {
            console.log(err);
        } else {
            let index = -1;
            let id = null;
            for (var i = 0; i < user.cart.length; i++) {
                if (user.cart[i].item.name === cartItem.item.name) {
                    index = i;
                    id = user.cart[i]._id;
                    break;
                }
            }
            if (index === -1) {
                user.cart.push(cartItem);
                cartItem.save();
            } else {
                user.cart[index].quantity += Number(quantity);
                CartItem.findOne({ _id: id }, function (err, cartItem) {
                    if (err) {
                        console.error(err);
                    } else {
                        cartItem.quantity += Number(quantity);
                    }
                    cartItem.save();
                });
            }

            user.save();
        }
    });
});

app.post("/cart/inc", function (req, res) {
    const { id } = req.body;

    const userQuery = {
        _id: person.user._id,
    };

    User.findOne(userQuery).then((item) => {
        const audioIndex = item.cart
            .map((item) => {
                console.log(item._id);
                return String(item._id);
            })
            .indexOf(id);
        item.cart[audioIndex].quantity += 1;
        item.save();
    });

    CartItem.findOne({ _id: id }, function (err, cartItem) {
        if (err) {
            console.error(err);
        } else {
            cartItem.quantity += 1;
        }
        cartItem.save();
    });
});

app.post("/cart/dec", function (req, res) {
    const { id } = req.body;

    const userQuery = {
        _id: person.user._id,
    };

    User.findOne(userQuery).then((item) => {
        const audioIndex = item.cart
            .map((item) => {
                console.log(item._id);
                return String(item._id);
            })
            .indexOf(id);
        if (item.cart[audioIndex].quantity > 1) {
            item.cart[audioIndex].quantity -= 1;
            CartItem.findOne({ _id: id }, function (err, cartItem) {
                if (err) {
                    console.error(err);
                } else {
                    cartItem.quantity -= 1;
                }
                cartItem.save();
            });
        }
        item.save();
    });
});

app.post("/remove-item-from-cart", function (req, res) {
    const id = req.body.id;
    User.findById(person.user._id, function (err, user) {
        if (err) {
            console.log(err);
        } else {
            user.cart = user.cart.filter(function (order) {
                return String(order._id) !== id;
            });
            console.log(user.cart);
            user.save();
        }
    });

    console.log(id);

    CartItem.findOne({ _id: id }, function (err, item) {
        console.log(item);
        item.remove();
    });
});

app.post("/edit-item", function (req, res) {
    const { key, img, name, description, price, category } = req.body;
    if (name !== "") {
        Item.findById(key, function (err, item) {
            if (err) {
                console.log(err);
                res.json({ success: false });
            } else {
                item.name = name;
                item.description = description;
                item.price = price;
                item.img = img;
                if (!item.category.includes(category)) {
                    item.category.push(category);
                }
                item.save();
                res.json({
                    success: true,
                });
            }
        });
    } else {
        res.json({
            success: false,
        });
    }
});

app.post("/add-category", function (req, res) {
    const { name, selectedItems } = req.body;

    if (name !== "") {
        selectedItems.map((item) => {
            Item.findOne({ name: item }, function (err, item) {
                item.category.push(name);
                item.save();
            });
        });

        const category = new Category({
            name: name,
        });
        category.save();
        res.json({
            success: true,
        });
    } else {
        res.json({
            success: false,
        });
    }
});

app.post("/edit-category", function (req, res) {
    const { key, name, selectedItems } = req.body;

    if (name !== "") {
        Category.findById(key, function (err, category) {
            Item.find({}, function (err, items) {
                items.forEach((item) => {
                    if (item.category.includes(category.name)) {
                        item.category = item.category.filter((cat) => {
                            return cat !== category.name;
                        });
                    }
                    if (selectedItems.includes(item.name)) {
                        item.category.push(name);
                    }
                    item.save();
                });
            });
            category.name = name;
            category.save();
        });

        res.json({
            success: true,
        });
    } else {
        res.json({
            success: false,
        });
    }
});

app.post("/delete-items", function (req, res) {
    const selectedItems = req.body.selectedItems;

    selectedItems.map((item) => {
        Item.deleteOne({ name: item }, function (err) {
            if (err) {
                console.log(err);
                res.json({
                    success: false,
                });
            } else {
                res.json({ success: true });
            }
        });
    });
});

app.post("/delete-categories", function (req, res) {
    const selectedCategories = req.body.selectedCategories;

    selectedCategories.map((category) => {
        Category.deleteOne({ name: category }, function (err) {
            if (err) {
                console.log(err);
                res.json({
                    success: false,
                });
            } else {
                res.json({ success: true });
            }
        });
    });
});

app.listen(port, function () {
    console.log(`Server started on port ${port}`);
});
