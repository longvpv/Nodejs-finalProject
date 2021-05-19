var express = require("express");
var router = express.Router();
const fs = require("fs");
const Category = require("../models/category");
const Product = require("../models/product");
const User = require("../models/user");
var mongoose = require("mongoose");
const { format } = require("date-fns");
const jwt = require("jsonwebtoken");
/* GET users listing. */

router.get("/", async function (req, res) {
  let total = {
    products: 100,
    users: 10,
    categories: 4,
  };

  total.products = await Product.countDocuments({});
  total.categories = await Category.countDocuments({});
  total.users = await User.countDocuments({});
  res.json(total);
});

router.post("/editProduct", async (req, res) => {
  const id = req.body._id;
  const checkExist = await Product.findById(id);
  if (
    req.body._id === null ||
    req.body._id === undefined ||
    checkExist === null
  ) {
    res.send({
      statusCode: 404,
      data: "Product do not exist",
    });
    return;
  }
  delete req.body._id;
  await Product.updateOne({ _id: id }, req.body);
  res.json({
    statusCode: 200,
    data: "Update successfully",
  });
});

router.post("/createProduct", async (req, res) => {
  try {
    await Product.validate({ ...req.body });
  } catch (err) {
    res.send({
      statusCode: 404,
      data: `Validate fail, check form ${Object.keys(err.errors)} !`,
    });
  }
  let newId = new mongoose.Types.ObjectId().toHexString();
  await Product.create({ _id: newId, ...req.body });
  res.redirect(`/product/${newId}`);
});

router.post("/seedDatabase", async (req, res) => {
  const usersResult = JSON.parse(fs.readFileSync("./users.json", "utf8")).body;
  await User.insertMany(usersResult);
  const categoryResult = JSON.parse(
    fs.readFileSync("./categories.json", "utf8")
  ).body;
  await Category.insertMany(categoryResult);
  const productResult = JSON.parse(
    fs.readFileSync("./product.json", "utf8")
  ).body;
  await Product.insertMany(productResult);
  res.send({
    statusCode: 200,
    data: "Seed successfully",
  });
});

router.delete("/clearDatabase", async (req, res) => {
  await User.remove({});
  await Category.remove({});
  await Product.remove({});
  res.send({
    statusCode: 200,
    data: "Clean Database successfully",
  });
});

router.post("/users", async (req, res) => {
  res.json(req.params);
});

//====================================================

router.get("/userlist", async (req, res) => {
  let allUser = [];
  if (req.query.searchText) {
    const text = req.query.searchText;
    allUser = await User.find({
      $or: [
        { firstName: { $regex: text, $options: "i" } },
        { lastName: { $regex: text, $options: "i" } },
      ],
    });
    console.log(allUser);
  } else {
    allUser = await User.find({});
  }
  const users = allUser.map((item) => {
    let date = format(new Date(item.dob), "MM/dd/yyyy");
    return { ...item._doc, dob: date };
  });
  res.json(users);
});

//===========================================================

router.get("/categories", async (req, res) => {
  const result = await Category.find({});
  res.json(result);
});

// PRODUCT ------------------------------

router.get("/products", async (req, res) => {
  const result = await Product.find({
    name: { $regex: req.query.data_keyword || "", $options: "i" },
  }).limit(parseInt(req.query.data_length) || 2);
  return res.json(result);
});

router.get("/product/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);

  res.json(product);
});

// LOGIN ===========================================================

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserLogin.create({ email, password });
    const token = createToken(user._id, user.email);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ user: user._id });
  } catch (err) {
    console.log(err);
    const errors = handleError(err);
    res.status(400).json({ errors });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserLogin.login(email, password);
    const token = createToken(user._id, user.email);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    return res.status(200).json({ user: user._id });
  } catch (err) {
    const errors = handleError(err);
    res.status(400).json({ errors });
  }
});

//===========================================================

//===========================================================

module.exports = router;
