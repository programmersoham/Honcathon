import { instrument } from "@fiberplane/hono-otel";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { Hono } from "hono";
import { users,chunks,documents } from "./db/schema";
import { uuid as drizzleUuid } from "drizzle-orm/pg-core";

import crypto from "crypto";


type Bindings = {
  DATABASE_URL: string;
  AI : String;
};
// const app = new Hono<{ Bindings: Env }>();

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text("Honc! 🪿");
});

app.get("/api/users", async (c) => {
  const sql = neon(c.env.DATABASE_URL);
  const db = drizzle(sql);

  return c.json({
    users: await db.select().from(users),
  });
});


// TODO : 
// -- Create API Endpoint for Vector Embedding Generation
// -- Create API For RAG response
// -- Connect with Telegram Webhook
// -- Image Generation with Telegram Web Hook Using Flux
// -- Store the Image in CF R2 Bucket
// -- Do not forget to turn off cache from CF Dashboard



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
  const sql = neon(c.env.DATABASE_URL);
  const db = drizzle(sql);

  const { title, content } = await c.req.json();
  if (!title || !content) {
    return c.json({ error: "Invalid input. Title and content are required." }, 400);
  }

  // Create a hash of the content to ensure uniqueness
  const documentHash = crypto.createHash("md5").update(content).digest("hex");

  try {
    // Insert document metadata
    const [doc] = await db
      .insert(documents)
      .values({  title, content, hash: documentHash })
      .returning();

    if (!doc) {
      throw new Error("Failed to save document metadata.");
    }

    // Chunk the content and generate embeddings
    const textChunks = chunkText(content);
    const embeddings = await generateEmbeddings(textChunks, c.env.AI);

    // Prepare data for insertion into the chunks table
    const chunkData = textChunks.map((chunk, idx) => ({
      documentId: doc.id,
      chunkNumber: idx,
      text: chunk,
      embedding: embeddings[idx],
      hash: crypto.createHash("md5").update(chunk).digest("hex"),
    }));
    
    
                               

    // Insert chunks into the database
    await db.insert(chunks).values(chunkData);

    return c.json({ message: "Text vectorized and stored successfully.", doc });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default instrument(app);
