"""
Data Store Module
Handles saving lead data as JSON output files that the Node.js server can ingest into Supabase.
"""

import os
import json
from datetime import datetime


class DataStore:
    """Stores scraped lead data to JSON files for ingestion by the Node.js backend."""

    def __init__(self, output_dir: str = ""):
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "output"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    def save_places(self, places: list, workspace_id: str, search_config_id: str) -> str:
        """
        Save initial places data to a JSON file.

        Args:
            places: List of place dicts from the API
            workspace_id: Workspace UUID
            search_config_id: Search config UUID

        Returns:
            Path to the saved file
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"places_{search_config_id[:8]}_{timestamp}.json"
        filepath = os.path.join(self.output_dir, filename)

        data = {
            "type": "places",
            "workspace_id": workspace_id,
            "search_config_id": search_config_id,
            "timestamp": datetime.now().isoformat(),
            "total": len(places),
            "places": places
        }

        with open(filepath, "w") as f:
            json.dump(data, f, indent=2, default=str)

        print(f"[data_store] Saved {len(places)} places to {filepath}")
        return filepath

    def update_lead_enrichment(self, search_config_id: str, row_index: int, info: dict):
        """
        Record an enriched lead's data to the enrichment output file.

        Args:
            search_config_id: Search config UUID
            row_index: Index of the lead in the places array
            info: Enrichment data dict
        """
        # Append to an enrichment results file
        filename = f"enrichment_{search_config_id[:8]}.jsonl"
        filepath = os.path.join(self.output_dir, filename)

        record = {
            "search_config_id": search_config_id,
            "row_index": row_index,
            "timestamp": datetime.now().isoformat(),
            "data": info
        }

        with open(filepath, "a") as f:
            f.write(json.dumps(record, default=str) + "\n")

    def read_enrichment_results(self, search_config_id: str) -> dict:
        """
        Read all enrichment results for a search config.

        Args:
            search_config_id: Search config UUID

        Returns:
            dict mapping row_index -> enrichment data
        """
        filename = f"enrichment_{search_config_id[:8]}.jsonl"
        filepath = os.path.join(self.output_dir, filename)

        results = {}
        if os.path.exists(filepath):
            with open(filepath) as f:
                for line in f:
                    line = line.strip()
                    if line:
                        record = json.loads(line)
                        results[record["row_index"]] = record["data"]

        return results

    def read_places(self, search_config_id: str, timestamp: str = "") -> dict | None:
        """
        Read the places output file for a search config.

        Args:
            search_config_id: Search config UUID
            timestamp: Optional timestamp to find specific file

        Returns:
            dict with places data or None
        """
        import glob
        pattern = os.path.join(self.output_dir, f"places_{search_config_id[:8]}*.json")
        files = sorted(glob.glob(pattern), reverse=True)

        if not files:
            return None

        with open(files[0]) as f:
            return json.load(f)