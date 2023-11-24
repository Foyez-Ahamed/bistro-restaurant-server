const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
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
    const userCollections = client.db('bistroRestaurantDB').collection('users');
    
    const menuCollections = client.db('bistroRestaurantDB').collection('menu');

    const reviewsCollections = client.db('bistroRestaurantDB').collection('reviews');
    
    const cartCollection = client.db('bistroRestaurantDB').collection('carts');

    const paymentCollection = client.db('bistroRestaurantDB').collection('payments');
    // collections // 

    // crud //

    // jwt related api //

    // jwt middleware //
    const verifyToken = (req, res, next) => {
      // console.log('Inside verify', req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message : 'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
          return res.status(401).send({message : 'unauthorized access'})
        }
        req.decoded = decoded;
        next();
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {email : email};
      const user = await userCollections.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send('forbidden access');
      }
      next();
    }

    app.post('/api/v1/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '4h'});
      res.send({token});
    })
    // jwt related api //


    // users related api //
    app.get('/api/v1/getUsers', verifyToken, verifyAdmin, async(req, res) => {
      const users = userCollections.find();
      const result = await users.toArray();
      res.send(result);
    })

    app.get('/api/v1/user/admin/:email', verifyToken, async(req, res) => {
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = {email : email}
      const user = await userCollections.findOne(query)
      let admin = false;
      if(user) {
        admin = user?.role === 'admin'
      }
      res.send({admin});
    })
    
    app.post('/api/v1/createUser', async(req, res) => {
      const users = req.body;
      // insert email if user does not exist //
      // make it different way , one way is (email unique/ upsert/ simple checking)
      const query = {email : users.email};
      const existingUser = await userCollections.findOne(query);
      if(existingUser){
        return res.send({message : 'user already exist', insertedId : null});
      }
      const result = await userCollections.insertOne(users);
      res.send(result);
    })

    app.patch('/api/v1/updateUserAdmin/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updateAdmin = {
        $set: {
          role : 'admin'
        }
      }
      const result = await userCollections.updateOne(filter, updateAdmin);
      res.send(result);
    })

    app.delete('/api/v1/deleteUser/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await userCollections.deleteOne(query);
      res.send(result);
    })
    // users related api // 



    // read data for menu //
    app.get('/menu', async(req, res) => {
        const menuData = menuCollections.find();
        const result = await menuData.toArray();
        res.send(result);
    })

    app.get('/api/v1/getSingleMenu/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id : (id)};
      const result = await menuCollections.findOne(query);
      res.send(result);
    })

   app.post('/api/v1/createMenu', verifyToken, verifyAdmin, async(req, res) => {
    const menuItem = req.body;
    const result = await menuCollections.insertOne(menuItem);
    res.send(result);
   })

   app.patch('/api/v1/updateMenu/:id', async(req, res) => {
     const menu = req.body;
     const id = req.params.id;
     const filter = {_id : (id)};
     const updateMenu = {
      $set : {
        name : menu.name,
        category : menu.category,
        price : menu.price,
        recipe : menu.recipe,
        image : menu.image
      }
     }

     const result = await menuCollections.updateOne(filter, updateMenu);
     res.send(result);

   })
   
   app.delete('/api/v1/removeMenu/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await menuCollections.deleteOne(query);
      res.send(result);
   })

    // read data for reviews // 
    app.get('/reviews', async(req, res) => {
        const reviewsData = reviewsCollections.find();
        const result = await reviewsData.toArray();
        res.send(result);
    })

    // user cart related api //
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

    // stripe payment related api // 
    app.post('/api/v1/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })

    // payment related api //
    app.post('/api/v1/payments', async(req, res) => {
      const payment = req.body;

      const paymentResult = await paymentCollection.insertOne(payment);

      // console.log('payment info', payment);

      // for delete cartIds // 
      const query = {_id : {
        $in : payment.cartIds.map(id => new ObjectId(id))
      }}

      const deleteResult = await cartCollection.deleteOne(query);


      res.send({paymentResult, deleteResult});
    })

    app.get('/api/v1/createPayments/:email', verifyToken, async(req, res) => {
      const query = { email : req.params.email };
      if( req.params.email !== req.decoded.email ){
        return res.status(403).send({message : 'forbidden access'});
      }

      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    // stats or analytics //

    app.get('/api/v1/adminStats', verifyToken, verifyAdmin, async(req, res) => {
      const users = await userCollections.estimatedDocumentCount();
      const menuItems = await menuCollections.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      // this is not the best way //
      // const payments = await paymentCollection.find().toArray();

      // const revenue = payments.reduce( (total, payment) => total + payment.price , 0);

      const result = await paymentCollection.aggregate([
        {
          $group : {
            _id : null, 
            totalRevenue : {
              $sum : '$price'
            }
          }
        }
      ]).toArray()

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({
        users,
        menuItems,
        orders,
        revenue
      })
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