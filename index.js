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
        const tasksCollection = client.db('workonDB').collection('tasks');
        const paymentsCollection = client.db('workonDB').collection('payments');


        // User routes
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });


        app.get('/employees', async (req, res) => {
            const result = await usersCollection.find({ role: 'employee' }).toArray();
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

        app.get('/user/role', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.status(400).send({ message: 'Email query parameter is required' });
                return;
            }

            const user = await usersCollection.findOne({ email: email });
            if (!user) {
                res.status(404).send({ message: 'User not found' });
                return;
            }

            res.send({ role: user.role });
        });

        // Task routes
        app.get('/tasks', async (req, res) => {
            const result = await tasksCollection.find().toArray();
            res.send(result);
        });

        app.post('/tasks', async (req, res) => {
            const data = req.body;
            const result = await tasksCollection.insertOne(data);
            res.send(result);
        });

        // Payment history route
        app.get('/payment-history', async (req, res) => {
            const result = await paymentsCollection.find().sort({ date: -1 }).toArray();
            res.send(result);
        });

        // Verification route
        app.post('/users/verify/:id', async (req, res) => {
            const userId = req.params.id;
            const user = await usersCollection.findOne({ _id: new MongoClient.ObjectId(userId) });

            if (!user) {
                res.status(404).send({ message: 'User not found' });
                return;
            }

            const updatedUser = await usersCollection.updateOne(
                { _id: new MongoClient.ObjectId(userId) },
                { $set: { isVerified: !user.isVerified } }
            );

            res.send(updatedUser);
        });


        app.post('/users/pay', async (req, res) => {
            const { userId, amount, month, year } = req.body;

            // Prevent duplicate payments for the same month/year
            const existingPayment = await paymentsCollection.findOne({ userId, month, year });
            if (existingPayment) {
                res.status(409).send({ message: 'Payment already exists for this period' });
                return;
            }

            const payment = {
                userId,
                amount,
                month,
                year,
                date: new Date(),
            };
            const result = await paymentsCollection.insertOne(payment);
            res.send(result);
        });

        app.get('/users/:id', async (req, res) => {
            const userId = req.params.id;
            const user = await usersCollection.findOne({ _id: new MongoClient.ObjectId(userId) });
            if (!user) {
                res.status(404).send({ message: 'User not found' });
                return;
            }

            const payments = await paymentsCollection.find({ userId }).toArray();
            res.send({ user, payments });
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
