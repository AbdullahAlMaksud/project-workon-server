const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sy9sfbb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const db = client.db('workonDB');
        const usersCollection = db.collection('users');
        const tasksCollection = db.collection('tasks');
        const paymentsCollection = db.collection('payments');

        const carousel = db.collection('carousel');
        const feature = db.collection('feature');
        const service = db.collection('service');
        const testimonial = db.collection('testimonial');


        //Simple Get Endpoint
        app.get('/carousel', async (req, res) => {
            const result = await carousel.find().toArray();
            res.send(result)
        })
        app.get('/feature', async (req, res) => {
            const result = await feature.find().toArray();
            res.send(result);
        });
        app.get('/service', async (req, res) => {
            const result = await service.find().toArray();
            res.send(result);
        });
        app.get('/testimonial', async (req, res) => {
            const result = await testimonial.find().toArray();
            res.send(result);
        });
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });
        app.get('/tasks/:userEmail', async (req, res) => {
            const userEmail = req.params.userEmail;
            try {
                const tasks = await tasksCollection.find({ userEmail: userEmail }).sort({ date: -1 }).toArray();
                res.send(tasks);
            } catch (error) {
                console.error('Error fetching tasks:', error);
                res.status(500).send({ message: 'Error fetching tasks' });
            }
        });
        app.get('/payment-history/:email', async (req, res) => {
            const email = req.params.email;
            try {
                const result = await paymentsCollection.find({ userEmail: email }).sort({ date: -1 }).toArray();
                res.send(result);
            } catch (error) {
                console.error('Error fetching payment history:', error);
                res.status(500).send({ message: 'Error fetching payment history' });
            }
        });
        app.get('/all-employee-list', async (req, res) => {
            try {
                const roles = ['employee', 'hr', null];
                const users = await usersCollection.find({ role: { $in: roles }, isVerified: true }).toArray();
                res.send(users);
            } catch (error) {
                console.error('Error fetching employees and HR:', error);
                res.status(500).send({ message: 'Error fetching employees and HR' });
            }
        });

        // POST route to add a task for a specific user
        app.post('/tasks', async (req, res) => {
            const taskData = req.body;
            try {
                const result = await tasksCollection.insertOne(taskData);
                res.status(201).send(result.ops[0]); // Return the inserted task
            } catch (error) {
                console.error('Error adding task:', error);
                res.status(500).send({ message: 'Error adding task' });
            }
        });


        //PATCH route to update data
        app.patch('/employee-update/:id', async (req, res) => {
            const userId = req.params.id;
            const updateData = req.body;
            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: updateData }
                );

                if (result.modifiedCount === 0) {
                    return res.status(404).send({ message: 'User not found or no changes made' });
                }

                res.send({ message: 'User data updated successfully' });
            } catch (error) {
                console.error('Error updating user:', error);
                res.status(500).send({ message: 'Error updating user' });
            }
        });
        // PATCH route to fire employee by ID
        app.patch('/employee/fire/:id', async (req, res) => {
            const userId = req.params.id;
            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(userId) },
                    {
                        $set: {
                            role: null,
                            phoneNumber: null,
                            bank_account_no: null,
                            salary: null,
                            designation: null,
                            status: 'fired',
                        },
                    }
                );

                if (result.modifiedCount === 0) {
                    return res.status(404).json({ message: 'Employee not found' });
                }

                res.status(200).json({ message: 'Employee fired successfully' });
            } catch (error) {
                console.error('Error firing employee:', error);
                res.status(500).json({ message: 'Server error', error });
            }
        });




        ////////////////////////////////////////////////////////////////GET
        app.get('/employees', async (req, res) => {
            const result = await usersCollection.find({ role: 'employee' }).toArray();
            res.send(result);
        });
        app.get('/user/role', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.status(400).send({ message: 'Email query parameter is required' });
                return;
            }
            const user = await usersCollection.findOne({ email });
            if (!user) {
                res.status(404).send({ message: 'User not found' });
                return;
            }
            res.send({ role: user.role });
        });
        app.get('/users/:id', async (req, res) => {
            const userId = req.params.id;
            const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
            if (!user) {
                res.status(404).send({ message: 'User not found' });
                return;
            }

            const payments = await paymentsCollection.find({ userId }).toArray();
            res.send({ user, payments });
        });
        // Endpoint to fetch employee list with verification and payment status
        app.get('/employee-list', async (req, res) => {
            const result = await usersCollection.find({ role: 'employee' }).toArray();
            res.send(result);
        });
        // Endpoint to fetch all employees
        app.get('/employees', async (req, res) => {
            const employees = await usersCollection.find({ role: 'employee' }).toArray();
            res.send(employees);
        });
        // Get work records with filtering
        app.get('/work-records', async (req, res) => {
            const { employeeName, month } = req.query;
            const query = {};

            if (employeeName) {
                const user = await tasksCollection.findOne({ name: employeeName });
                if (user) {
                    query.userEmail = user.email;
                } else {
                    return res.status(404).send({ message: 'Employee not found' });
                }
            }

            if (month) {
                const startDate = new Date(`${month}-01`);
                const endDate = new Date(startDate);
                endDate.setMonth(startDate.getMonth() + 1);
                query.date = { $gte: startDate, $lt: endDate };
            }

            const result = await tasksCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/all-employees-list/:id', async (req, res) => {
            const userId = req.params.id;
            try {
                const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

                if (!user) {
                    return res.status(404).send({ message: 'User not found' });
                }
                res.send(user);
            } catch (error) {
                console.error('Error fetching user:', error);
                res.status(500).send({ message: 'Error fetching user' });
            }
        });
        ///////////////////////////////////////////////////////////////////POST
        // Task Post by Employee Endpoint
        // Verification route
        app.post('/users/verify/:id', async (req, res) => {
            const userId = req.params.id;
            const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

            if (!user) {
                res.status(404).send({ message: 'User not found' });
                return;
            }

            const updatedUser = await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: { isVerified: !user.isVerified } }
            );

            res.send(updatedUser);
        });
        app.post('/users/pay', async (req, res) => {
            const { userId, amount, month, year, userName, userEmail, status } = req.body;

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
                userName,
                userEmail,
                status
            };
            const result = await paymentsCollection.insertOne(payment);
            res.send(result);
        });
        app.post('/users', async (req, res) => {
            const data = req.body;
            const existingUser = await usersCollection.findOne({ email: data.email });
            if (existingUser) {
                res.status(409).send({ message: 'User already exists' });
            } else {
                const result = await usersCollection.insertOne(data);
                res.send(result);
            }
        });
        //////////////////////////////////////////////////////////////////UPDATE
        // Endpoint to update verification status
        app.put('/employee/verify/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    isVerified: true,
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        // Endpoint to update payment status
        app.put('/employee/pay/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    isPaid: true,
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        app.patch('/work-records/:id', async (req, res) => {
            const id = req.params.id;
            const updates = req.body;
            const result = await tasksCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updates }
            );
            res.send(result);
        });
        //For Role Changing by Admin
        app.patch('/users/:id/role', async (req, res) => {
            const userId = req.params.id;
            const { newRole } = req.body;
            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: { role: newRole } }
                );
                if (result.modifiedCount === 0) {
                    return res.status(404).send({ message: 'User not found or role not changed' });
                }
                res.send({ message: 'User role updated successfully' });
            } catch (error) {
                console.error('Error updating user role:', error);
                res.status(500).send({ message: 'Error updating user role' });
            }
        });

        ///////////////////////////////////////////////////////////////////DELETE
        app.delete('/users/:id', async (req, res) => {
            const userId = req.params.id;
            try {
                const result = await usersCollection.deleteOne({ _id: new MongoClient.ObjectId(userId) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'User not found' });
                }

                res.send({ message: 'User deleted successfully' });
            } catch (error) {
                console.error('Error deleting user:', error);
                res.status(500).send({ message: 'Error deleting user' });
            }
        });






        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensure the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// Basic test route
app.get('/', (req, res) => {
    res.send('Workon Server is running....');
});

app.listen(port, () => {
    console.log(`Workon server is running on port ${port}`);
});