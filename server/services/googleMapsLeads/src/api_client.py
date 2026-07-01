"""
Google Maps API Client
Handles Serper.dev Maps API integration and geocoding via OpenStreetMap.
"""

import os
import json
import logging
import requests

logger = logging.getLogger(__name__)


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36"
]


class GoogleMapsAPIClient:
    """Client for interacting with Serper.dev Google Maps API."""

    def __init__(self, api_key: str = ""):
        self.api_key = api_key or os.getenv("SERPER_API_KEY", "")
        self.base_url = "https://google.serper.dev/maps"

    def get_coordinates(self, city: str) -> dict | None:
        """
        Convert a city name to latitude/longitude coordinates using OpenStreetMap Nominatim.

        Args:
            city: Name of the city to geocode

        Returns:
            dict with 'lat' and 'lon' keys, or None on failure
        """
        try:
            response = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": city, "format": "json"},
                headers={"User-Agent": USER_AGENTS[2]},
                timeout=15
            )
            data = response.json()
            if data:
                return {"lat": data[0]["lat"], "lon": data[0]["lon"]}
            return None
        except Exception as e:
            logger.error(f"[api_client] Error getting coordinates: {e}")
            return None

    def search_places(self, query: str, coords: dict, num_pages: int = 1) -> list[dict]:
        """
        Search for places using Serper Maps API.

        Args:
            query: Search query (e.g., "restaurants", "dentists")
            coords: dict with 'lat' and 'lon' keys
            num_pages: Number of pages to request (20 results per page)

        Returns:
            List of place dicts
        """
        lat, lon = coords["lat"], coords["lon"]

        # Build payload for each page
        payload = []
        for page in range(1, num_pages + 1):
            payload.append({
                "q": query,
                "ll": f"@{lat},{lon},13z",
                "page": page
            })

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                data=json.dumps(payload),
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                # Extract places from all pages
                all_places = []
                if isinstance(data, list):
                    for page_data in data:
                        if "places" in page_data:
                            all_places.extend(page_data["places"])
                elif "places" in data:
                    all_places = data["places"]

                # Normalize place data
                normalized = []
                for place in all_places:
                    normalized.append({
                        "title": place.get("title", ""),
                        "address": place.get("address", ""),
                        "website": place.get("website", "") or place.get("url", ""),
                        "phoneNumber": place.get("phoneNumber", ""),
                        "description": place.get("description", ""),
                        "rating": place.get("rating"),
                        "ratingCount": place.get("ratingCount"),
                        "type": place.get("type", ""),
                        "types": place.get("types", []),
                        "priceLevel": place.get("priceLevel", ""),
                        "openingHours": place.get("openingHours", ""),
                        "latitude": place.get("latitude", ""),
                        "longitude": place.get("longitude", ""),
                    })

                return normalized
            else:
                print(f"[api_client] API returned status code {response.status_code}")
                return []

        except Exception as e:
            print(f"[api_client] Error making API request: {e}")
            return []