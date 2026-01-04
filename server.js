import dotenv from "dotenv";     //allows to read from env files
import express from "express";     //express for backend
import cors from "cors";     //allows apps to talk to server
import multer from "multer";     //receives uploaded files
import { QdrantClient } from "@qdrant/js-client-rest";     //connects to qdrant
import { pipeline } from "@xenova/transformers";    //connects to ai model converting text into embeddings

dotenv.config();     //read from env files

const app = express();     //creates server
const port = process.env.PORT || 3000;     //assigns port for the server

app.use(cors());     //allows other apps apps to interact with this server
app.use(express.json());     //converts json to js
app.use(express.static("public"));     //access files from public

const upload = multer();     //prepare server to upload files

//connects to qdrant database
const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = "my-collection";

//model that converts text to numbers
const embedder = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2"
);

//converts embeddings into numbers
function embToArray(out) {
  return Array.isArray(out.data) ? out.data.flat() : Array.from(out.data);
}

//converts text to numbers
async function getEmbedding(text) {
  const out = await embedder(text, { pooling: "mean", normalize: true });
  return embToArray(out);
}

//searches text matching with the question
async function searchQdrantByVector(vector, limit = 3) {
  return await client.search(COLLECTION_NAME, { vector, limit });
}

//POST api endpoint called upload-file is created to upload single file into server
app.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const text = req.file.buffer.toString("utf8");     //converts file into readable text
    const chunks = text.match(/[\s\S]{1,500}/g) || [];     //splits chunks into parts
    const points = [];

    //converts text chunks into embeddings to store in qdrant
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i]);
      points.push({
        id: Date.now() + i,
        vector: embedding,
        payload: { text: chunks[i] },
      });
    }

    await client.upsert(COLLECTION_NAME, { points });     //uploads file data into qdrant

    res.json({ message: `Uploaded ${points.length} chunks successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//POST api endpoint called ask is created to send query to server
app.post("/ask", async (req, res) => {
  const userQuery = req.body.query;
  if (!userQuery) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const qvec = await getEmbedding(userQuery);     //covert query into embedding
    const hits = await searchQdrantByVector(qvec, 3);     //search qdrant
    const context = hits.map(h => h.payload?.text || "").join("\n\n");     //collects answers and joins them together

    const messages = [
      {
        role: "system",
        content:
          "You are a strict assistant. Use ONLY the provided context to answer. If the answer is not in the context, respond exactly with: \"I don't have that information in my knowledge base.\"",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion:\n${userQuery}`,
      },
    ];

    const groqResp = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
        }),
      }
    );

    const data = await groqResp.json();

    if (!groqResp.ok) {
      throw new Error(data.error?.message || "Groq API error");
    }

    const answer = data.choices?.[0]?.message?.content || "";

    res.json({ answer, used_context: context });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//starts server 
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
