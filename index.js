const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xhgpsyg.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("ecoTracdb");

    // Collections
    const challengesCollection = db.collection("challenges");
    const userActivitiesCollection = db.collection("userActivities");
    const joinedChallengesCollection = db.collection("joinedChallenges");
    const tipsCollection = db.collection("tips");

    // -------------------------------------------------
    // GET: All Challenges
    // -------------------------------------------------
    app.get("/challenges", async (req, res) => {
      const result = await challengesCollection.find().toArray();
      res.send(result);
    });

    // -------------------------------------------------
    // GET: Challenge Details
    // -------------------------------------------------
    app.get("/challenges/:id", async (req, res) => {
      const result = await challengesCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // -------------------------------------------------
    // POST: Create New Challenge
    // -------------------------------------------------
    app.post("/challenges", async (req, res) => {
      const result = await challengesCollection.insertOne(req.body);
      res.send({ success: true, result });
    });

    // -------------------------------------------------
    // PUT: Update Challenge
    // -------------------------------------------------
    app.put("/challenges/:id", async (req, res) => {
      const result = await challengesCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send({ success: true, result });
    });

    // -------------------------------------------------
    // DELETE: Delete Challenge
    // -------------------------------------------------
    app.delete("/challenges/:id", async (req, res) => {
      const result = await challengesCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send({ success: true, result });
    });

    // -------------------------------------------------
    // POST: Join Challenge
    // -------------------------------------------------
    app.post("/challenges/join/:id", async (req, res) => {
      const { email } = req.body;
      const challengeId = new ObjectId(req.params.id);

      try {
        // Check if already joined
        const already = await userActivitiesCollection.findOne({
          challengeId,
          email,
        });

        if (already) {
          return res.send({ success: false, message: "Already joined!" });
        }

        // Increase participants
        await challengesCollection.updateOne(
          { _id: challengeId },
          { $inc: { participants: 1 } }
        );

        // Add user activity
        await userActivitiesCollection.insertOne({
          challengeId,
          email,
          joinedAt: new Date(),
        });

        // Optional: Log join event
        await joinedChallengesCollection.insertOne({
          challengeId,
          email,
          joinedAt: new Date(),
        });

        res.send({ success: true, message: "Joined successfully!" });
      } catch (err) {
        console.log(err);
        res.status(500).send({ success: false, message: "Server Error" });
      }
    });

    // -------------------------------------------------
    // GET: Joined Challenges List (admin/log)
    // -------------------------------------------------
    app.get("/challenges/joinedChallenges", async (req, res) => {
      const result = await joinedChallengesCollection.find().toArray();
      res.send(result);
    });

    // -------------------------------------------------
    // GET: My Activities (user dashboard)
    // -------------------------------------------------
    app.get("/my-activities", async (req, res) => {
      const email = req.query.email;

      const joined = await userActivitiesCollection.find({ email }).toArray();

      const ids = joined.map((j) => new ObjectId(j.challengeId));

      const challenges = await challengesCollection
        .find({ _id: { $in: ids } })
        .toArray();

      res.send({ success: true, challenges });
    });

    // -------------------------------------------------
    // POST: Add Tips
    // -------------------------------------------------
    app.post("/api/tips", async (req, res) => {
      const tip = {
        ...req.body,
        createdAt: new Date(),
        upvotes: req.body.upvotes || 0,
      };

      const result = await tipsCollection.insertOne(tip);
      res.send(result);
    });

    // -------------------------------------------------
    // GET: Tips
    // -------------------------------------------------
    app.get("/api/tips", async (req, res) => {
      const result = await tipsCollection.find().toArray();
      res.send(result);
    });

    console.log("MongoDB Connected!");
  } finally {
  }
}

run().catch(console.dir);

// Base Route
app.get("/", (req, res) => {
  res.send("ecoTrac Server Running...");
});

app.listen(port, () => console.log("Server running on port", port));