const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://ecoTracdbUser:VzK4LyL9KDLL4Lm7@cluster0.xhgpsyg.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("ecoTracdb");
    const challengesCollection = db.collection("challenges");

    app.get("/challenges", async (req, res) => {
      const result = await challengesCollection.find().toArray();
      res.send(result);
    });

    app.get("/challenges/:id", async (req, res) => {
      const { id } = req.params;

      const result = await challengesCollection.findOne({ _id: id });

      res.send({
        success: true,
        result,
      });
    });

    app.post("/challenges/join/:id", async (req, res) => {
      const userEmail = req.body.email;
      const challengeId = req.params.id;

      const joinData = {
        email: userEmail,
        challengeId,
        joinedAt: new Date(),
      };

      const result = await db
        .collection("joinedChallenges")
        .insertOne(joinData);

      res.send({
        success: true,
        message: "Joined successfully!",
        result,
      });
    });

    // app.post("/challenges", async (req, res) => {
    //   const data = req.body;
    //   const result = await challengesCollection.insertOne(data);
    //   res.send({
    //     success: true,
    //     result,
    //   });
    // });

    app.get("/my-activities", async (req, res) => {
      const email = req.query.email;

      const joined = await db
        .collection("joinedChallenges")
        .find({ email })
        .toArray();

      // challenge details get
      const ids = joined.map((j) => new ObjectId(j.challengeId));

      const challenges = await db
        .collection("challenges")
        .find({ _id: { $in: ids } })
        .toArray();

      res.send({
        success: true,
        challenges,
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
