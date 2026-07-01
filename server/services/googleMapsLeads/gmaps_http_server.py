#!/usr/bin/env python3
"""
Hermes Google Maps Lead Generator — Isolated HTTP Microservice
===============================================================
Runs as a standalone Flask/FastAPI service inside its own container.
Replaces the old Node.js spawn()-based bridge with a clean HTTP API.

Endpoints:
  GET  /health              — health check
  POST /api/search          — execute a Maps search
  POST /api/enrich          — enrich business data
  GET  /api/status/<id>     — check task status

Environment Variables:
  SERPER_API_KEY    — required for Google Maps search API
  OPENROUTER_API_KEY— optional, for AI enrichment
  LLM_MODEL         — model override for enrichment
  FLASK_PORT        — port to listen on (default: 8000)
"""

import os
import sys
import json
import uuid
import asyncio
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

# Add the service directory to path
SERVICE_DIR = Path(__file__).parent.absolute()
sys.path.insert(0, str(SERVICE_DIR))

try:
    from flask import Flask, request, jsonify
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask"])
    from flask import Flask, request, jsonify

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("gmaps-http")

# ── Import local modules (same as gmaps_service.py) ──────────────────────────
from src.api_client import GoogleMapsAPIClient
from src.business_enricher import BusinessEnricher
from src.data_store import DataStore

# ── Flask App ────────────────────────────────────────────────────────────────
app = Flask(__name__)

# ── In-memory task store (production would use Redis/DB) ─────────────────────
tasks: dict = {}


# ═══════════════════════════════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════════════════════════════
@app.route("/health", methods=["GET"])
def health():
    """Health probe for Docker healthcheck."""
    api_key_ok = bool(os.environ.get("SERPER_API_KEY"))
    return jsonify({
        "status": "ok",
        "service": "gmaps-microservice",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "serper_api_key": "configured" if api_key_ok else "missing",
        },
    }), 200


# ═══════════════════════════════════════════════════════════════════════════
# Search Endpoint
# ═══════════════════════════════════════════════════════════════════════════
@app.route("/api/search", methods=["POST"])
def search():
    """
    Execute a Google Maps search.
    Body: { "location": "...", "search_query": "...", "num_pages": 1, "callback_url": "..." }
    Returns task_id for status polling.
    """
    data = request.get_json(force=True)
    if not data:
        return jsonify({"success": False, "error": "Request body required"}), 400

    location = data.get("location")
    search_query = data.get("search_query")
    num_pages = data.get("num_pages", 1)
    callback_url = data.get("callback_url", "")
    enrichment_enabled = data.get("enrichment_enabled", False)

    if not location or not search_query:
        return jsonify({"success": False, "error": "location and search_query are required"}), 400

    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        "task_id": task_id,
        "status": "running",
        "progress": 0,
        "location": location,
        "search_query": search_query,
        "num_pages": num_pages,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "result": None,
        "error": None,
    }

    _run_search_in_background(task_id, location, search_query, num_pages, enrichment_enabled, callback_url)

    return jsonify({"success": True, "task_id": task_id, "status": "running"}), 202


# ═══════════════════════════════════════════════════════════════════════════
# Task Status Endpoint
# ═══════════════════════════════════════════════════════════════════════════
@app.route("/api/status/<task_id>", methods=["GET"])
def task_status(task_id: str):
    """Poll task status."""
    task = tasks.get(task_id)
    if not task:
        return jsonify({"success": False, "error": "Task not found"}), 404
    return jsonify({"success": True, "task": task}), 200


# ═══════════════════════════════════════════════════════════════════════════
# Background Search Runner
# ═══════════════════════════════════════════════════════════════════════════
def _run_search_in_background(task_id: str, location: str, search_query: str,
                                num_pages: int, enrichment_enabled: bool,
                                callback_url: str):
    """Execute the search in a background thread."""
    import threading

    def _run():
        try:
            client = GoogleMapsAPIClient()
            enricher = BusinessEnricher() if enrichment_enabled else None

            all_places = []
            for page in range(1, num_pages + 1):
                logger.info(f"[{task_id}] Searching page {page}/{num_pages}: {search_query} in {location}")
                results = asyncio.run(client.search(location, search_query, page=page))

                if not results or "places" not in results:
                    logger.warning(f"[{task_id}] No results on page {page}")
                    continue

                places = results["places"]
                all_places.extend(places)
                tasks[task_id]["progress"] = int((page / num_pages) * 80)

                if enrichment_enabled and enricher and places:
                    logger.info(f"[{task_id}] Enriching {len(places)} businesses from page {page}")
                    enriched = asyncio.run(enricher.enrich_batch(places))
                    all_places[-len(places):] = enriched

            tasks[task_id]["result"] = {
                "total_places": len(all_places),
                "places": all_places,
            }
            tasks[task_id]["status"] = "completed"
            tasks[task_id]["progress"] = 100
            logger.info(f"[{task_id}] Search completed: {len(all_places)} places found")

            # If callback_url provided, POST results there
            if callback_url:
                try:
                    import requests
                    requests.post(callback_url, json={
                        "task_id": task_id,
                        "status": "completed",
                        "result": tasks[task_id]["result"],
                    }, timeout=30, headers={"Content-Type": "application/json"})
                    logger.info(f"[{task_id}] Callback sent to {callback_url}")
                except Exception as cb_err:
                    logger.warning(f"[{task_id}] Callback failed: {cb_err}")

        except Exception as err:
            logger.error(f"[{task_id}] Search failed: {err}")
            tasks[task_id]["status"] = "failed"
            tasks[task_id]["error"] = str(err)

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()


# ═══════════════════════════════════════════════════════════════════════════
# Main Entry Point
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Google Maps Microservice HTTP Server")
    parser.add_argument("--port", type=int, default=int(os.environ.get("FLASK_PORT", 8000)),
                        help="Port to listen on")
    parser.add_argument("--host", type=str, default="0.0.0.0",
                        help="Host to bind to")
    parser.add_argument("--debug", action="store_true", default=False,
                        help="Enable debug mode")
    args = parser.parse_args()

    logger.info(f"Starting Google Maps Microservice on {args.host}:{args.port}")
    logger.info(f"Serper API Key: {'configured' if os.environ.get('SERPER_API_KEY') else 'MISSING'}")

    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)