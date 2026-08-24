from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from sentence_transformers import SentenceTransformer
import logging

app = FastAPI(title="Embedding Service")
logger = logging.getLogger("uvicorn")

# Load model globally. 'all-MiniLM-L6-v2' maps sentences to a 384 dimensional dense vector space.
# It is extremely fast and suitable for our use-case.
try:
    logger.info("Loading SentenceTransformer model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Error loading model: {e}")
    raise e

class EmbedRequest(BaseModel):
    texts: List[str]

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]

@app.post("/embed", response_model=EmbedResponse)
async def create_embeddings(req: EmbedRequest):
    if not req.texts:
        raise HTTPException(status_code=400, detail="Empty texts array")
    
    try:
        # Generate embeddings
        # .tolist() converts the numpy arrays to standard python lists for JSON serialization
        embeddings = model.encode(req.texts, show_progress_bar=False).tolist()
        return EmbedResponse(embeddings=embeddings)
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error generating embeddings")

@app.get("/health")
async def health():
    return {"status": "ok", "model": "all-MiniLM-L6-v2"}
