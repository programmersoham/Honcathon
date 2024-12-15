// // TODO : 
// // -- Create API Endpoint for Vector Embedding Generation : Done.
// // -- Create API For RAG response : Done.
// // -- Connect with Telegram Webhook
// // -- Image Generation with Telegram Web Hook Using Flux
// // -- Store the Image in CF R2 Bucket


// ┏┓                 
// ┃┃╱╲ In this       
// ┃╱╱╲╲ house        
// ╱╱╭╮╲╲ we love     
// ▔▏┗┛▕▔ & appreciate
// ╱▔▔▔▔▔▔▔▔▔▔╲       
// |   JSON   |       
// ╱╱┏┳┓╭╮┏┳┓╲╲       
// ▔▏┗┻┛┃┃┗┻┛▕




import { instrument } from "@fiberplane/hono-otel";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { Hono } from "hono";
import { users, chunks, documents } from "./db/schema";
import { sql } from "drizzle-orm";
import { OpenAI } from "openai";
import crypto from "crypto";

type Bindings = {
  DATABASE_URL: string;
  AI: Ai;
  OPENAI_API_KEY: string;
  TELEGRAM_BOT_TOKEN : string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text("Honc! 🪿");
});

app.get("/api/users", async (c) => {
  try {
    const sqlClient = neon(c.env.DATABASE_URL);
    const db = drizzle(sqlClient);

    const result = await db.select().from(users);
    return c.json({ users: result });
  } catch (error: any) {
    console.error("Error fetching users:", error.message);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Utility: Chunk the text into smaller parts
function chunkText(text: string, chunkSize = 5): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    chunks.push(sentences.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}

// Utility: Generate embeddings using Cloudflare AI Models
async function generateEmbeddings(textChunks: string[], AI: any): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const chunk of textChunks) {
    const { data } = await AI.run("@cf/baai/bge-base-en-v1.5", {
      text: [chunk],
    });

    if (data && data[0]) {
      embeddings.push(data[0]);
    } else {
      throw new Error(`Failed to generate embedding for chunk: ${chunk}`);
    }
  }
  return embeddings;
}

// API: Vectorize text and store in Neon Postgres
app.post("/api/vectorize", async (c) => {
  try {
    const sqlClient = neon(c.env.DATABASE_URL);
    const db = drizzle(sqlClient);

    const { title, content } = await c.req.json();
    if (!title || !content) {
      return c.json({ error: "Invalid input. Title and content are required." }, 400);
    }

    const documentHash = crypto.createHash("md5").update(content).digest("hex");

    const [doc] = await db
      .insert(documents)
      .values({ title, content, hash: documentHash })
      .returning();

    if (!doc) {
      throw new Error("Failed to save document metadata.");
    }

    const textChunks = chunkText(content);
    const embeddings = await generateEmbeddings(textChunks, c.env.AI);

    const chunkData = textChunks.map((chunk, idx) => ({
      documentId: doc.id,
      chunkNumber: idx,
      text: chunk,
      embedding: embeddings[idx],
      hash: crypto.createHash("md5").update(chunk).digest("hex"),
    }));

    await db.insert(chunks).values(chunkData);

    return c.json({ message: "Text vectorized and stored successfully.", doc });
  } catch (error: any) {
    console.error("Error in vectorize API:", error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API: Chat and retrieve similar chunks
app.post("/api/chat", async (c) => {
  
  try {
    const sqlClient = neon(c.env.DATABASE_URL);
    const db = drizzle(sqlClient);

    const { userMessage } = await c.req.json();
    if (!userMessage) {
      return c.json({ error: "Invalid input. userMessage is required." }, 400);
    }

    // Step 1: Generate the query embedding
    const queryEmbeddingResponse = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: [userMessage],
    });

    const queryEmbedding = queryEmbeddingResponse.data[0];
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      throw new Error("Failed to generate query embedding or invalid response structure.");
    }

    // Convert embedding into a number array
    const queryEmbeddingArray = queryEmbedding.map((v: number) => Number(v));

    // Step 2: Cosine similarity query
    const similarityQuery = sql<number>`
      1 - (embedding <#> ${queryEmbeddingArray}::vector)
    `;

    const similarityCutoff = 0.5; // Adjust threshold
    const topK = 5;
    const queryEmbeddingString = `ARRAY[${queryEmbedding.join(",")}]`;

    // Step 3: Query using Drizzle's query builder
// Query to retrieve relevant chunks
const results = await db.execute(
  sql`
    SELECT id, text, 
           1 - (embedding <#> ${sql.raw(queryEmbeddingString)}::vector) AS similarity
    FROM chunks
    WHERE 1 - (embedding <#> ${sql.raw(queryEmbeddingString)}::vector) > ${similarityCutoff}
    ORDER BY similarity DESC
    LIMIT ${topK};
  `
);
    if (!results || results.rows.length === 0) {
      return c.json({ error: "No relevant chunks found." }, 404);
    }

    // Combine relevant chunks into a single context
    const context = results.rows.map((row) => row.text).join("\n\n");

    // Step 4: Generate a response using OpenAI GPT-4
    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
      fetch: globalThis.fetch,
    });

    const completionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are a helpful AI assistant. Use the context below to answer the user's question. 
If you cannot find an answer, say "I don't know." 

Context:
${context}

User: ${userMessage}
Assistant:
          `,
        },
      ],
      temperature: 0.7,
    });

    const responseText =
      completionResponse.choices?.[0]?.message?.content || "I don't know.";

    // Return the AI-generated response
    return c.json({ response: responseText });
  } catch (error: any) {
    console.error("Error in chat API:", error.message);
    return c.json({ error: error.message }, 500);
  }
});


app.post("/webhook/telegram", async (c) => {
  try {
    const body = await c.req.json();

    // Validate incoming request
    if (!body || !body.message) {
      return c.json({ error: "Invalid Telegram webhook payload" }, 400);
    }

    const userMessage = body.message.text;
    const chatId = body.message.chat.id;

    // Pass the user message to your chat logic
    const chatResponse = await handleChat(userMessage,c.env);

    // Send the response back to Telegram
    const botToken = c.env.TELEGRAM_BOT_TOKEN; // Store this in your environment variables
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: chatResponse,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message to Telegram: ${await response.text()}`);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error handling Telegram webhook:", error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Handle chat logic (reuse your existing logic)
async function handleChat(userMessage: string, env:Bindings): Promise<string> {
  const sqlClient = neon(env.DATABASE_URL);
    const db = drizzle(sqlClient);


  // Step 1: Generate query embedding
  const queryEmbeddingResponse = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [userMessage],
  });

  const queryEmbedding = queryEmbeddingResponse.data[0];
  if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
    throw new Error("Failed to generate query embedding or invalid response structure.");
  }

  // Convert embedding into a number array
  const queryEmbeddingArray = queryEmbedding.map((v: number) => Number(v));

  // Step 2: Cosine similarity query
  const queryEmbeddingString = `ARRAY[${queryEmbedding.join(",")}]`;
  const similarityCutoff = 0.5;
  const topK = 5;

  const results = await db.execute(
    sql`
      SELECT id, text, 
             1 - (embedding <#> ${sql.raw(queryEmbeddingString)}::vector) AS similarity
      FROM chunks
      WHERE 1 - (embedding <#> ${sql.raw(queryEmbeddingString)}::vector) > ${similarityCutoff}
      ORDER BY similarity DESC
      LIMIT ${topK};
    `
  );

  if (!results || results.rows.length === 0) {
    return "I couldn't find any relevant information in the context.";
  }

  // Combine relevant chunks into a single context
  const context = results.rows.map((row) => row.text).join("\n\n");

  // Step 4: Generate response using OpenAI
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    fetch: globalThis.fetch,
  });

  const completionResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `
You are a helpful AI assistant. Use the context below to answer the user's question. 
If you cannot find an answer, say "I don't know." 

Context:
${context}

User: ${userMessage}
Assistant:
        `,
      },
    ],
    temperature: 0.7,
  });

  return completionResponse.choices?.[0]?.message?.content || "I don't know.";
}





export default instrument(app);
