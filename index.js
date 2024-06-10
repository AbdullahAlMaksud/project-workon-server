const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sy9sfbb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        const usersCollection = client.db('workonDB').collection('users');

        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const data = req.body;

            // Check if a user with the same email already exists
            const existingUser = await usersCollection.findOne({ email: data.email });

            if (existingUser) {
                res.status(409).send({ message: 'User already exists' });
            } else {
                const result = await usersCollection.insertOne(data);
                console.log(result);
                res.send(result);
            }
        });

        // Connect the client to the server (optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// Basic test route
app.get('/', (req, res, next) => {
    res.send('Workon Server is running....');
});

app.listen(port, () => {
    console.log(`Workon server is running on port ${port}`);
});
