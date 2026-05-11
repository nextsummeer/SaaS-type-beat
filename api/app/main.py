import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import beats
from app.workers import convert

app = FastAPI(title="BeatPost API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(beats.router)
app.include_router(convert.router)


@app.get("/health")
async def health():
    return {"ok": True, "version": "0.1.0"}
