##Overview: This project implements a Retrieval Augmentation Generation (RAG) system, where answers are generated only from the content provided by the user. Users can upload documents and ask questions. The system retrieves the answer from the provided content and answers the question. 

##Prerequisites:
  1. Python (Streamlit UI)
  2. Node.js (backend server)
  3. Qdrant account
  4. Groq API key (LLM responses)

##How to create a Qdrant account
  1. Go to the main Qdrant page
  2. Sign up or log in
  3. Create a new cluster
  4. Note down the QDRANT_URL and QDRANT_API_KEY in .env file
  5. Create a collection in Qdrant with Vector Size = 384 and Distance = Cosine

##These details are stored in .env and used in server.js

##How to store data in Qdrant Vector Database - relevant file is [server.js](server.js)
  1. User uploads a file from the UI (app.py)
  2. The file is sent to the backend using
     [ app.post("/upload-file", upload.single("file"), async (req, res) ]
  3. In server.js the uploaded file is accessed using
     [ req.file ]
  4. The file content is converted into text
     [ app.post("/upload-file", upload.single("file"), async (req, res) ]
  5. The text is split into chunks
     [ const text = req.file.buffer.toString("utf8") ]
  6. Chunks are converted into embeddings
     [ const embedding = await getEmbedding(chunks[i]) ]
  7. The embeddings are stored in Qdrant using
     [ await client.upsert(COLLECTION_NAME, { points }) ]

##After this data is stored in Qdrant Vector Database

##How to answer queries from Qdrant Database - relevant file is [server.js](server.js)
  1. User asks a question from UI (app.py)
  2. The query is sent to the backend using
     [ app.post("/ask", async (req, res) ]
  3. The query is accessed in server.js
     [const userQuery = req.body.query]
  4. The query is converted into embeddings
     [const qvec = await getEmbedding(userQuery)]
  5. Qdrant is searched using query embedding
     [const hits = await searchQdrantByVector(qvec, 3)]
  6. The retrieved text chunk is collected as content
     [const context = hits.map(h => h.payload?.text || "").join("\n\n")]
  7. The retrieved text content and query are sent to LLM
  8. The final answer is generated and sent to the UI




