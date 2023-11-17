const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware //
app.use(cors());
app.use(express.json());


// mongodb //
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wslenxe.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collections // 
    const menuCollections = client.db('bistroRestaurantDB').collection('menu');

    const reviewsCollections = client.db('bistroRestaurantDB').collection('reviews');
    
    const cartCollection = client.db('bistroRestaurantDB').collection('carts');
    // collections // 

    // crud //
    // read data for menu //
    app.get('/menu', async(req, res) => {
        const menuData = menuCollections.find();
        const result = await menuData.toArray();
        res.send(result);
    })
    // read data for reviews // 
    app.get('/reviews', async(req, res) => {
        const reviewsData = reviewsCollections.find();
        const result = await reviewsData.toArray();
        res.send(result);
    })

    app.post('/api/v1/createCarts', async (req, res) => {
       const cartItem = req.body;
       const result = await cartCollection.insertOne(cartItem);
       res.send(result);
    })

    app.get('/api/v1/carts', async(req, res) => {
      const email = req.query.email;
      const query = {email : email};
      const cursor = cartCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.delete('/api/v1/cancelCarts/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })
    // crud //



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// mongodb //



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Bistro restaurant app listening on port ${port}`)
})