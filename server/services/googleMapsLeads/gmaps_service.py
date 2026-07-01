#!/usr/bin/env python3
"""
Google Maps Lead Generator - Microservice
Integrated service for HERMES platform.
Provides Serper Maps API search + AI-powered web scraping enrichment.
"""

import os
import sys
import json
import asyncio
import argparse
from dotenv import load_dotenv

# Load env from parent server directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

# Import local modules (adapted from original repo)
from src.api_client import GoogleMapsAPIClient
from src.business_enricher import BusinessEnricher
from src.data_store import DataStore


async def run_search(args: dict) -> dict:
    """
    Run the full search + enrichment pipeline.
    
    Args:
        args: dict with keys:
            - location (str): e.g. "Toronto"
            - search_query (str): e.g. "Realtors"
            - num_pages (int): pages (20 results each)
            - search_config_id (str): UUID for tracking in DB
            - workspace_id (str): workspace UUID
            - enrichment_enabled (bool): whether to run AI enrichment
    
    Returns:
        dict with results summary
    """
    location = args["location"]
    search_query = args["search_query"]
    num_pages = args.get("num_pages", 1)
    search_config_id = args.get("search_config_id", "")
    workspace_id = args.get("workspace_id", "")
    enrichment_enabled = args.get("enrichment_enabled", True)
    
    print(f"[gmaps_service] Starting search: '{search_query}' in '{location}' ({num_pages} pages)")
    
    # Step 1: Initialize API client
    api_key = os.getenv("SERPER_API_KEY", "")
    if not api_key:
        return {
            "success": False,
            "error": "SERPER_API_KEY not configured",
            "search_config_id": search_config_id
        }
    
    client = GoogleMapsAPIClient(api_key=api_key)
    
    # Step 2: Get coordinates
    coords = client.get_coordinates(location)
    if not coords:
        return {
            "success": False,
            "error": f"Could not geocode location: {location}",
            "search_config_id": search_config_id
        }
    
    # Step 3: Search places
    places = client.search_places(search_query, coords, num_pages)
    if not places:
        return {
            "success": False,
            "error": f"No places found for '{search_query}' in '{location}'",
            "search_config_id": search_config_id
        }
    
    print(f"[gmaps_service] Found {len(places)} businesses")
    
    # Step 4: Store initial results
    store = DataStore()
    store.save_places(places, workspace_id, search_config_id)
    
    results_summary = {
        "success": True,
        "search_config_id": search_config_id,
        "total_found": len(places),
        "total_enriched": 0,
        "places": places
    }
    
    # Step 5: Enrichment (if enabled)
    if enrichment_enabled:
        enricher = BusinessEnricher()
        try:
            enriched = await enricher.enrich_businesses(places, store, workspace_id, search_config_id)
            results_summary["total_enriched"] = enriched
            print(f"[gmaps_service] Enriched {enriched} businesses")
        except Exception as e:
            print(f"[gmaps_service] Enrichment error: {e}")
            results_summary["enrichment_error"] = str(e)
    
    return results_summary


async def run_enrichment(args: dict) -> dict:
    """
    Run enrichment only on existing leads that haven't been enriched.
    
    Args:
        args: dict with keys:
            - workspace_id (str)
            - search_config_id (str)
            - leads (list): list of lead dicts with business_name, website, address
    
    Returns:
        dict with enrichment results
    """
    workspace_id = args.get("workspace_id", "")
    search_config_id = args.get("search_config_id", "")
    leads = args.get("leads", [])
    
    if not leads:
        return {"success": False, "error": "No leads provided", "enriched_count": 0}
    
    store = DataStore()
    enricher = BusinessEnricher()
    
    enriched_count = 0
    for lead in leads:
        try:
            info = await enricher.enrich_single_business(lead)
            if info:
                store.update_lead_enrichment(search_config_id, lead.get("row_index", 0), info)
                enriched_count += 1
        except Exception as e:
            print(f"[gmaps_service] Error enriching {lead.get('business_name', 'unknown')}: {e}")
    
    return {
        "success": True,
        "search_config_id": search_config_id,
        "enriched_count": enriched_count,
        "total": len(leads)
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Google Maps Lead Generator Service")
    parser.add_argument("--action", type=str, required=True, choices=["search", "enrich"])
    parser.add_argument("--params", type=str, required=True, help="JSON-encoded parameters")
    parser.add_argument("--output", type=str, default="", help="Output file path for results JSON")
    
    opts = parser.parse_args()
    params = json.loads(opts.params)
    
    if opts.action == "search":
        result = asyncio.run(run_search(params))
    elif opts.action == "enrich":
        result = asyncio.run(run_enrichment(params))
    
    # Output as JSON
    output = json.dumps(result, default=str)
    
    if opts.output:
        with open(opts.output, "w") as f:
            f.write(output)
        print(f"[gmaps_service] Results written to {opts.output}")
    else:
        print(output)