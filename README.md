# 🪿 **Honky McGooseface** – A Geese-Themed Telegram Chatbot 🦢  

> "Honk once for curiosity, honk twice for AI magic!"  

## 🎉 **About the Project**  
Welcome to **Honky McGooseface** – a wildly *HONC*-stacked Telegram chatbot built for **Hocathon** (yes, it's as fun as it sounds). This project combines the power of modern frameworks and AI to deliver:  
1. **RAG (Retrieval-Augmented Generation) answers** about geese.  
2. **AI-generated images** of geese (anime style included, because why not?).  
3. **Fun facts** about geese that'll make you honk with joy.  

The bot is live and honking at 👉 [**Honky McGooseface Telegram Bot**](https://t.me/Honky_McGooseface_bot) 🪿  

## 🛠️ **Tech Stack – The Mighty HONC**  
**H** – **Hono**: Fast and minimalist web framework for the backend.  
**O** – **Drizzle ORM**: The slickest TypeScript ORM to communicate with Neon DB.   
**N** – **Neon DB**: Serverless Postgres database to store text embeddings and metadata.  
**C** – **Cloudflare Workers**:  
   - **AI Workers** for generating geese images using **Flux Schnell**.  
   - **R2 Storage** for storing and retrieving those majestic goose images.  
   - **Cloudflare Workers** for **deploying the Hono server** seamlessly to the edge.  

**OpenAI GPT-4o Mini**: Used for inferencing and generating goose-related fun facts.   
**Telegram Webhooks**: To interact with users in real-time (no delays, just honks).  
## 🚀 **Features**  

1. **Ask Me About Geese 🪿**  
   - Users can ask any goose-related question, and the bot answers using **RAG** (Retrieval-Augmented Generation) backed by embeddings.  
   - It combines embeddings generated via **Cloudflare AI** and OpenAI's GPT-4o for accurate, goose-approved answers.  

2. **Generate a Goose Image 🖼️**  
   - The bot generates custom goose images in real-time using **Flux Schnell AI**.  
   - Images are stored securely in **R2 Bucket** and returned to users immediately.  
   - Anime-style geese in lakes? Check. Mystical geese under rainbows? Also check.  

3. **Goose Fun Facts 🧠**  
   - Fun and quirky goose facts fetched dynamically using OpenAI's GPT-4o Mini.  
   - Did you know geese fly in a V formation to conserve energy? Well, you'll learn a lot more!  

---

## 🔗 **How to Use**  
1. Head to the bot 👉 [**Honky McGooseface Bot**](https://t.me/Honky_McGooseface_bot).  
2. Send `/start` to see the options:  

## 🔧 **Local Setup Instructions**  
1. Clone the repository:  
   ```bash  
   git clone https://github.com/programmersoham/Honcathon/  
   cd honky-mcgooseface  
   ```  

2. Run the following commands:  
   ```bash  
   npm install  
   npm run dev  
   ```  

3. Set environment variables:  
   Create a `.dev.vars` file in the root directory and add the following: 
   
    
   ```plaintext  
   OPENAI_API_KEY=<your-openai-api-key>  
   TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>  
   DATABASE_URL=<your-neon-db-url>  
   FPX_ENDPOINT=<optional-fiberplane-endpoint> 


This Project is built for honcathon🪿



## 🪿 HONC

This is a project created with the `create-honc-app` template.

Learn more about the HONC stack on the [website](https://honc.dev) or the main [repo](https://github.com/fiberplane/create-honc-app).

### Getting started

Make sure you have Neon set up and configured with your database. Create a .dev.vars file with the `DATABASE_URL` key and value (see: `.dev.vars.example`).

### Project structure

```#
├── src
│   ├── index.ts # Hono app entry point
│   └── db
│       └── schema.ts # Database schema
├── seed.ts # Optional seeding script
├── .dev.vars.example # Example .dev.vars file
├── wrangler.toml # Cloudflare Workers configuration
├── drizzle.config.ts # Drizzle configuration
├── tsconfig.json # TypeScript configuration
└── package.json
```

### Commands

Run the migrations and (optionally) seed the database:

```sh
# this is a convenience script that runs db:generate, db:migrate, and db:seed
npm run db:setup
```

Run the development server:

```sh
npm run dev
```

### Developing

When you iterate on the database schema, you'll need to generate a new migration and apply it:

```sh
npm run db:generate
npm run db:migrate
```

### Deploying

Set your `DATABASE_URL` secret (and any other secrets you need) with wrangler:

```sh
npx wrangler secret put DATABASE_URL
```

Finally, change the name of the project in `wrangler.toml` to something appropriate for your project

```toml
name = "my-neon-project"
```

Deploy with wrangler:

```sh
npm run deploy
```