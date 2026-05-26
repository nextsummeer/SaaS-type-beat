import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import beats, posts, youtube, analytics, achievements, covers, briefs, artists
from app.workers import convert, analyze, generate, publish

app = FastAPI(title="BeatPost API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(beats.router)
app.include_router(posts.router)
app.include_router(youtube.router)
app.include_router(analytics.router)
app.include_router(achievements.router)
app.include_router(covers.router)
app.include_router(briefs.router)
app.include_router(artists.router)
app.include_router(convert.router)
app.include_router(analyze.router)
app.include_router(generate.router)
app.include_router(publish.router)


@app.get("/health")
async def health():
    return {"ok": True, "version": "0.1.0"}
