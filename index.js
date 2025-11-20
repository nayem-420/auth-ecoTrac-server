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
    

    const db = client.db("ecoTracdb");

    // Collections
    const challengesCollection = db.collection("challenges");
    const userActivitiesCollection = db.collection("userActivities");
    const joinedChallengesCollection = db.collection("joinedChallenges");
    const tipsCollection = db.collection("tips");

    /**
     * GET: All Challenges
     */
    app.get("/challenges", async (req, res) => {
      const result = await challengesCollection.find().toArray();
      res.send(result);
    });

    /**
     * GET: Challenge Details
     */
    app.get("/challenges/:id", async (req, res) => {
      const id = req.params.id;

      const result = await challengesCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!result) {
        return res
          .status(404)
          .send({ success: false, message: "Challenge not found" });
      }

      res.send(result);
    });

    /**
     * POST: Create New Challenge
     */
    app.post("/challenges", async (req, res) => {
      const result = await challengesCollection.insertOne(req.body);
      res.send({ success: true, result });
    });

    /**
     * PUT: Update Challenge
     */
    app.put("/challenges/:id", async (req, res) => {
      const result = await challengesCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send({ success: true, result });
    });

    /**
     * DELETE: Delete Challenge
     */
    app.delete("/challenges/:id", async (req, res) => {
      const result = await challengesCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send({ success: true, result });
    });

    /**
     * POST: Join Challenge
     */
    app.post("/challenges/join/:id", async (req, res) => {
      const { email } = req.body;
      const challengeId = new ObjectId(req.params.id);

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
    });

    /**
     * GET: Joined Challenges List (admin/log)
     */
    app.get("/challenges/joinedChallenges", async (req, res) => {
      const result = await joinedChallengesCollection.find().toArray();
      res.send(result);
    });

    /**
     * GET: My Activities (user dashboard)
     */
    app.get("/my-activities", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({
          success: false,
          message: "Email is required",
        });
      }

      // Fetch all activities
      const activities = await userActivitiesCollection
        .find({ email })
        .sort({ joinedAt: -1 })
        .toArray();

      const populatedActivities = await Promise.all(
        activities.map(async (activity) => {
          if (activity.challengeId) {
            const challenge = await challengesCollection.findOne({
              _id: activity.challengeId,
            });
            return { ...activity, challengeDetails: challenge };
          }
          return activity;
        })
      );

      res.send({
        success: true,
        activities: populatedActivities,
      });
    });

    /**
     * POST: Add Tips
     */
    app.post("/api/tips", async (req, res) => {
      try {
        const { title, content, category, email } = req.body;

        const tip = {
          title,
          content,
          category,
          email,
          createdAt: new Date(),
        };

        const tipResult = await tipsCollection.insertOne(tip);

        // Insert into userActivities
        await userActivitiesCollection.insertOne({
          tipId: tipResult.insertedId,
          title,
          category,
          email,
          type: "tip",
          joinedAt: new Date(),
        });

        res.send({ success: true, tipResult });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server Error" });
      }
    });

    /**
     * GET: Tips
     */
    app.get("/api/tips", async (req, res) => {
      const result = await tipsCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();
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
