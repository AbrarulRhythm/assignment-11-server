const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 3000;

// Middleeare
app.use(cors());
app.use(express.json());

const verifyJWTToken = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
    }

    const token = authorization.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }

        req.token_email = decoded.email;

        next();
    });
}

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
        const applicationRequestCollection = db.collection('applicationRequest');

        // :::::::::::::::::::::::::::::: - JWT Related APIS - ::::::::::::::::::::::::::::::
        app.post('/getToken', (req, res) => {
            const loggedUser = req.body;
            const token = jwt.sign(loggedUser, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.send({ token: token });
        });

        // Middle ware admin before allowing admin activity
        // must be use after verifyJWTToken middle ware
        const verifyAdmin = async (req, res, next) => {
            const email = req.token_email;
            const query = { email };
            const user = await usersCollection.findOne(query);

            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden accress' });
            }

            next();
        }

        // :::::::::::::::::::::::::::::: - User Related APIS - ::::::::::::::::::::::::::::::
        // Get API (all users)
        app.get('/users', verifyJWTToken, async (req, res) => {
            const cursor = usersCollection.find().sort({ createdAt: -1 });
            const result = await cursor.toArray();
            res.send(result);
        });

        // Get API for single user
        app.get('/users/:id', verifyJWTToken, async (req, res) => {
            const id = req.params.id;

            // Get form current user (verifyJWTToken)
            const currentUserEmail = req.token_email;

            const loggedInUser = await usersCollection.findOne({ email: currentUserEmail });
            const isAdmin = loggedInUser && loggedInUser.role === 'admin';
            const currentUserId = loggedInUser && loggedInUser._id.toString();

            if (isAdmin) {
                const query = { _id: new ObjectId(id) };
                const result = await usersCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: 'User not found' });
                }

                return res.send(result);
            }

            // non admin
            if (currentUserId === id) {
                const query = { _id: new ObjectId(id) };
                const result = await usersCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: 'User not found' });
                }

                return res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden: You can only view your own profile.' });
            }
        });

        // Get API for user role
        app.get('/users/:email/role', verifyJWTToken, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ role: user?.role || 'student' });
        });

        // Get API for user ID
        app.get('/users/:email/id', verifyJWTToken, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ id: user?._id || null });
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

        // Patch API
        app.patch('/users/:id/update', verifyJWTToken, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            data.updatedAt = new Date();

            const query = { _id: new ObjectId(id) };

            const updatedDoc = {
                $set: data
            }

            const result = await usersCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        // Patch API for update user role
        app.patch('/users/:id/update/role', verifyJWTToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const roleInfo = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: roleInfo.role
                }
            }
            const result = await usersCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        // Delete API
        app.delete('/users/:id/delete', verifyJWTToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        // :::::::::::::::::::::::::::::: - Tuition Related APIS - ::::::::::::::::::::::::::::::
        // GET API
        app.get('/tuitions', verifyJWTToken, async (req, res) => {
            const query = {};
            const { limit = 0, skip = 0, email, status, searchText } = req.query;

            if (email) {
                query.email = email;
            }

            if (status) {
                const statusArray = status
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);

                if (statusArray.length === 1) {
                    query.status = status;
                } else if (statusArray.length > 1) {
                    query.status = { $in: statusArray };
                }
            }

            if (searchText) {
                query.$or = [
                    { subject: { $regex: searchText, $options: 'i' } },
                    { name: { $regex: searchText, $options: 'i' } }
                ]
            }

            const cursor = tuitionsCollection.find(query).sort({ createdAt: -1 }).limit(Number(limit)).skip(Number(skip));
            const result = await cursor.toArray();
            res.send(result);
        });

        // Get API for latest tuitions
        app.get('/latest-tuitions', async (req, res) => {
            const query = {};
            const { status } = req.query;

            if (status) {
                query.status = 'approved'
            }

            const cursor = tuitionsCollection.find(query).sort({ createdAt: -1 }).limit(8);
            const result = await cursor.toArray();
            res.send(result);
        });

        // Get API form single tuition
        app.get('/tuitions/:id', async (req, res) => {
            const query = {};
            const id = req.params.id;
            const { status } = req.query;

            if (status) {
                query.status = 'approved'
            }

            query._id = new ObjectId(id);

            const result = await tuitionsCollection.findOne(query);
            res.send(result);
        });

        // Post API
        app.post('/tuitions', verifyJWTToken, async (req, res) => {
            const tuition = req.body;
            tuition.status = 'pending';
            tuition.createdAt = new Date();

            const result = await tuitionsCollection.insertOne(tuition);
            res.send(result);
        });

        // Patch API
        app.patch('/tuitions/:id/update', verifyJWTToken, async (req, res) => {
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

        // Patch API for update tuition status
        app.patch('/tuitions/:id/status/update', verifyJWTToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const statusInfo = req.body;

            const query = { _id: new ObjectId(id) };

            const updatedDoc = {
                $set: {
                    status: statusInfo.status
                }
            }
            const result = await tuitionsCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        // Delete API
        app.delete('/tuitions/:id/delete', verifyJWTToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await tuitionsCollection.deleteOne(query);
            res.send(result);
        });

        // :::::::::::::::::::::::::::::: - Tutor Request Related APIS - ::::::::::::::::::::::::::::::
        // Get API
        app.get('/tutor-request', verifyJWTToken, async (req, res) => {
            let query = {};
            const { email } = req.query;

            if (email) {
                query = {
                    $or: [
                        { studentEmail: email },
                        { tutorEmail: email }
                    ]
                }
            }

            const cursor = applicationRequestCollection.find(query).sort({ appliedAt: -1 });
            const result = await cursor.toArray();
            res.send(result);
        });

        // Post API
        app.post('/tutor-request/', verifyJWTToken, async (req, res) => {
            const requestData = req.body;
            requestData.status = 'pending';
            requestData.appliedAt = new Date();

            const result = await applicationRequestCollection.insertOne(requestData);
            res.send(result);
        });

        // Patch API
        app.patch('/tutor-request/:id/update', verifyJWTToken, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            data.updatedAt = new Date();

            const query = { _id: new ObjectId(id) };

            const updatedDoc = {
                $set: data
            }

            const result = await applicationRequestCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        // Delete API
        app.delete('/tutor-request/:id/delete', verifyJWTToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await applicationRequestCollection.deleteOne(query);
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