"""
Business Enricher Module
AI-powered web scraping to extract emails, social media, and contact info from business websites.
Supports OpenRouter (any LLM), OpenAI, and direct extraction.
"""

import os
import json
from typing import Optional

from .web_scraper import (
    scrape_website,
    extract_emails_from_content,
    find_relevant_links,
)


class BusinessInfo:
    """Structured business information from AI analysis."""
    pass


class BusinessEnricher:
    """Enriches business data by scraping websites and using AI analysis."""

    def __init__(self):
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.llm_model = os.getenv("LLM_MODEL", "gpt-4o-mini")

    async def enrich_businesses(self, places: list, store, workspace_id: str, search_config_id: str) -> int:
        """
        Enrich a list of businesses by scraping their websites.

        Args:
            places: List of place dicts from Serper API
            store: DataStore instance for saving results
            workspace_id: Workspace UUID
            search_config_id: Search config UUID

        Returns:
            Number of successfully enriched businesses
        """
        enriched_count = 0

        for idx, place in enumerate(places):
            name = place.get("title", "")
            url = place.get("website", "")
            address = place.get("address", "")

            if not url:
                # Skip businesses without websites
                continue

            try:
                info = await self._enrich_single(name, url, address)
                if info:
                    store.update_lead_enrichment(search_config_id, idx, info)
                    enriched_count += 1
                    print(f"[enricher] ✓ Enriched: {name}")

            except Exception as e:
                print(f"[enricher] Error enriching {name}: {e}")

        return enriched_count

    async def enrich_single_business(self, lead: dict) -> dict:
        """
        Enrich a single business lead.

        Args:
            lead: dict with business_name, website, address keys

        Returns:
            dict with enrichment data
        """
        name = lead.get("business_name", lead.get("title", ""))
        url = lead.get("website", "")
        address = lead.get("address", "")

        if not url:
            return {}

        return await self._enrich_single(name, url, address)

    async def _enrich_single(self, name: str, url: str, address: str) -> dict:
        """Enrich a single business by scraping its website."""
        # Step 1: Scrape the website
        content, links = await scrape_website(url, extract_links=True)
        if not content:
            return {}

        # Step 2: Find relevant links (social media, contact)
        social_links = find_relevant_links(links)

        # Step 3: Extract emails
        emails = extract_emails_from_content(content)

        # Step 4: Use AI to analyze links if API is available
        analyzed = await self._analyze_with_ai(name, url, address, social_links, emails)

        # Step 5: If we have contact link but no email, try scraping contact page
        if (not emails or not analyzed.get("email")) and social_links.get("contact"):
            contact_url = social_links["contact"][0]
            if contact_url != url:
                contact_content, _ = await scrape_website(contact_url, extract_links=False)
                if contact_content:
                    contact_emails = extract_emails_from_content(contact_content)
                    if contact_emails:
                        emails = contact_emails

        # Step 6: Build final result
        result = analyzed if analyzed else {}

        if emails and not result.get("email"):
            result["email"] = " || ".join(emails)

        # Fill in directly extracted data if AI didn't return it
        if social_links.get("facebook") and not result.get("facebook"):
            result["facebook"] = social_links["facebook"][0]
        if social_links.get("twitter") and not result.get("twitter"):
            result["twitter"] = social_links["twitter"][0]
        if social_links.get("instagram") and not result.get("instagram"):
            result["instagram"] = social_links["instagram"][0]
        if social_links.get("linkedin") and not result.get("linkedin"):
            result["linkedin"] = social_links["linkedin"][0]
        if social_links.get("youtube") and not result.get("youtube"):
            result["youtube"] = social_links["youtube"][0]
        if social_links.get("contact") and not result.get("contact_page"):
            result["contact_page"] = social_links["contact"][0]

        return result

    async def _analyze_with_ai(self, name: str, url: str, address: str,
                                social_links: dict, emails: list) -> Optional[dict]:
        """
        Use AI (OpenRouter/OpenAI) to analyze business links and emails.

        Returns structured dict or None if AI is not configured.
        """
        # Check which AI provider is available
        if self.openrouter_key:
            return await self._analyze_via_openrouter(name, url, address, social_links, emails)
        elif self.openai_key:
            return await self._analyze_via_openai(name, url, address, social_links, emails)

        # No AI configured - return basic extraction
        return {
            "email": " || ".join(emails) if emails else "",
            "facebook": social_links.get("facebook", [""])[0] if social_links.get("facebook") else "",
            "twitter": social_links.get("twitter", [""])[0] if social_links.get("twitter") else "",
            "instagram": social_links.get("instagram", [""])[0] if social_links.get("instagram") else "",
            "linkedin": social_links.get("linkedin", [""])[0] if social_links.get("linkedin") else "",
            "youtube": social_links.get("youtube", [""])[0] if social_links.get("youtube") else "",
            "contact_page": social_links.get("contact", [""])[0] if social_links.get("contact") else "",
        }

    async def _analyze_via_openrouter(self, name, url, address, social_links, emails):
        """Use OpenRouter API for AI analysis."""
        try:
            from openai import OpenAI

            client = OpenAI(
                api_key=self.openrouter_key,
                base_url="https://openrouter.ai/api/v1",
            )

            system_prompt = f"""You are an expert at identifying correct business information from scraped web data.
Your task is to analyze potential social media links for a business and determine which ones are most likely the official ones.

## Business Information
- Business Name: {name}
- Business Location: {address}
- Business Website URL: {url}

Provide only the most probable link for each category. If no valid option exists, return empty string."""

            user_message = f"""Analyze these potential links:
Facebook: {social_links.get('facebook', [])}
Twitter: {social_links.get('twitter', [])}
Instagram: {social_links.get('instagram', [])}
LinkedIn: {social_links.get('linkedin', [])}
YouTube: {social_links.get('youtube', [])}
Contact pages: {social_links.get('contact', [])}
Emails found: {emails}

Return a JSON object with these fields: facebook, twitter, instagram, linkedin, youtube, contact_page, email"""

            response = client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=500,
            )

            result = json.loads(response.choices[0].message.content)
            return result

        except Exception as e:
            print(f"[enricher] OpenRouter AI analysis error: {e}")
            return None

    async def _analyze_via_openai(self, name, url, address, social_links, emails):
        """Use OpenAI API for AI analysis."""
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.openai_key)

            system_prompt = f"""You are an expert at identifying correct business information from scraped web data.
Analyze potential social media links and emails for: {name} ({url})

Provide only the most probable link for each category. Return JSON."""

            user_message = f"""Facebook: {social_links.get('facebook', [])}
Twitter: {social_links.get('twitter', [])}
Instagram: {social_links.get('instagram', [])}
LinkedIn: {social_links.get('linkedin', [])}
YouTube: {social_links.get('youtube', [])}
Contact: {social_links.get('contact', [])}
Emails: {emails}

Return JSON: facebook, twitter, instagram, linkedin, youtube, contact_page, email"""

            response = client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )

            result = json.loads(response.choices[0].message.content)
            return result

        except Exception as e:
            print(f"[enricher] OpenAI analysis error: {e}")
            return None