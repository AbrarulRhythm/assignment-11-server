const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 3000;

// Middleeare
app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
    console.log(
        `⚡ ${req.method} - ${req.path} from ${req.host} at ⌛ ${new Date().toLocaleString()}`
    );
    next();
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qrthjko.mongodb.net/?appName=Cluster0`;

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
        // await client.connect();

        const db = client.db('e_tuitionBd_db');
        const usersCollection = db.collection('users');
        const tuitionsCollection = db.collection('tuitions');

        // :::::::::::::::::::::::::::::: - User Related APIS - ::::::::::::::::::::::::::::::
        // Get API for user role
        app.get('/users/:email/role', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ role: user?.role || 'student' });
        });

        // Post API
        app.post('/users', async (req, res) => {
            const user = req.body;
            user.createdAt = new Date();

            const email = user.email;
            const userExist = await usersCollection.findOne({ email });

            if (userExist) {
                return res.send({ message: '⚡You already exist. Signed in successfully.' });
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // :::::::::::::::::::::::::::::: - Tuition Related APIS - ::::::::::::::::::::::::::::::
        // GET API
        app.get('/tuitions', async (req, res) => {
            const query = {};
            const { email, status } = req.query;

            if (email) {
                query.email = email;
            }

            if (status) {
                query.status = status;
            }

            const cursor = tuitionsCollection.find(query).sort({ createdAt: -1 });
            const result = await cursor.toArray();
            res.send(result);
        });

        // Post API
        app.post('/tuitions', async (req, res) => {
            const tuition = req.body;
            tuition.status = 'pending';
            tuition.createdAt = new Date();

            const result = await tuitionsCollection.insertOne(tuition);
            res.send(result);
        });

        // Patch API
        app.patch('/tuitions/:id/update', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            data.updatedAt = new Date();

            const query = { _id: new ObjectId(id) };

            const updatedDoc = {
                $set: data
            }

            const result = await tuitionsCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// Basic Routes
app.get('/', (req, res) => {
    res.send({ status: 'ok', message: 'eTuitionBd Server' });
});

// 404
app.all(/.*/, (req, res) => {
    res.status(404).json({
        status: 404,
        error: 'API not found',
    });
});

app.listen(port, () => {
    console.log(`eTuitionBd server is running on port: ${port}`);
});