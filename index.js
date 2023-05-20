const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.djzcyyl.mongodb.net/`;
const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, }});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorized access" });
}
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });};

async function run() {
  try {
    const toysCollection = client.db("funkoFanfare").collection("products");

    app.post("/jwt", (req, res) => {
      const token = jwt.sign(req.body, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "30d",});
      res.send({ token });
    });

    app.get("/toys", async (req, res) => {
      let { page, limit, } = req.query;
      if (!page) page = 1;
      if (!limit) limit = 20;
      limit = parseInt(limit);
      const skip = (page - 1) * 20;
      const products = await toysCollection.find().skip(skip).limit(limit).toArray();
      res.send(products);
    });

    app.get("/toys/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await toysCollection.findOne(query);
      res.send(result);
    });

    app.get("/toys/toy-name/:text", async (req, res) => {
      const text = req.params.text;
      const result = await toysCollection.find({ $or: [{ toyName: { $regex: text, $options: "i" } }]}).toArray();
      res.send(result);
    });
    
    app.get("/toys/category/:text", async (req, res) => {
      const text = req.params.text;
      const result = await toysCollection.find({ $or: [{ category: { $regex: text, $options: "i" } }]}).toArray();
      res.send(result);
    });

    app.get("/added-toys", verifyJWT, async (req, res) => {
      const sortOrder = req.query.sort;
      let sortOption = {};
      if (sortOrder === "asc") { sortOption = { Price: 1 }}
      else if (sortOrder === "desc") { sortOption = { Price: -1 }}
      let query = {};
      if (req.query?.email) { query = { sellerEmail: req.query.email }}
      const result = await toysCollection.find(query).sort(sortOption).toArray();
      res.send(result);
    });

    app.post("/add-toys", async (req, res) => {
      const newProduct = req.body;
      const result = await toysCollection.insertOne(newProduct);
      res.send(result);
    }); 

    app.put("/added-toys/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedProduct = req.body;
      const product = {
        $set: {
          toyName: updatedProduct.toyName,
          img: updatedProduct.img,
          sellerName: updatedProduct.sellerName,
          sellerEmail: updatedProduct.sellerEmail,
          category: updatedProduct.category,
          Price: updatedProduct.Price,
          Rating: updatedProduct.Rating,
          quantity: updatedProduct.quantity,
          description: updatedProduct.description,
          brand: updatedProduct.brand,
          color: updatedProduct.color,
          weight: updatedProduct.weight,
          material: updatedProduct.material,
        },
      };
      const result = await toysCollection.updateOne(filter,product,options);
      res.send(result);
    });

    app.delete("/added-toys/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await toysCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {}
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
