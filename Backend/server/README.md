# MediaGuard Express Server

Node.js/Express API layer that sits in front of the Python agent swarm.

## Structure

```
server/
├── app.js                  # Main Express server (port 8000)
├── package.json
├── routes/
│   └── hunt.js             # POST /api/hunt → Spider trigger
├── middleware/
│   ├── validate.js         # Joi validation middleware
│   └── errorHandler.js     # Global error handler
├── schemas/
│   └── Schema.js           # Joi schemas (hunt, ingest, adjudicate, enforce, broker)
└── utils/
    ├── ExpressError.js     # Custom error class
    └── wrapAsync.js        # Async route wrapper
```

## What's Done

✅ ExpressError class (throw new ExpressError(400, "message"))  
✅ wrapAsync utility (auto-forwards errors to global handler)  
✅ Joi validation schemas (huntRequestSchema, ingestRequestSchema, etc.)  
✅ Validation middleware (validateHuntRequest, validateIngestRequest, etc.)  
✅ Global error handler (returns consistent JSON: { success, status, message })  
✅ POST /api/hunt route (reads spider_payload.json, returns threat map)  
✅ Dependencies installed (express, cors, joi, dotenv)

## Run

```bash
cd Backend/server
npm start
```

Server runs on `http://localhost:8000` (same port as the old FastAPI server).

## Next Steps

1. Wire the React frontend to call `POST /api/hunt` with `{ official_video_url: "..." }`
2. Add routes for `/api/ingest`, `/api/adjudicate`, `/api/enforce`, `/api/broker`
3. Connect these routes to the Python agents via `child_process.spawn()`
