"""
Web Scraping Utilities
Playwright-based website scraping with email extraction and social link detection.
"""

import re
from urllib.parse import urljoin


# Precompiled email pattern
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


async def scrape_website(url: str, extract_links: bool = False):
    """
    Scrape a website using Playwright. Falls back to requests-based parsing if Playwright fails.

    Args:
        url: Website URL to scrape
        extract_links: Whether to extract all page links

    Returns:
        tuple: (markdown_content, list_of_links) or (None, []) on failure
    """
    try:
        from playwright.async_api import async_playwright
        import os, shutil

        # Resolve a Chromium executable. Prefer Playwright's bundled browser,
        # but fall back to a system Chromium/Brave/Chrome when the Playwright
        # CDN is unreachable and no browser was downloaded.
        def _resolve_chromium():
            env_path = os.getenv("PLAYWRIGHT_CHROMIUM_PATH", "")
            if env_path and os.path.exists(env_path):
                return env_path
            for cand in (
                "chromium", "chromium-browser", "google-chrome",
                "google-chrome-stable", "brave-browser",
                "/opt/brave.com/brave/brave",
            ):
                found = shutil.which(cand) or (cand if os.path.exists(cand) else None)
                if found:
                    return found
            return None

        launch_args = ["--disable-http2", "--no-sandbox", "--disable-dev-shm-usage"]

        async with async_playwright() as p:
            chromium_path = _resolve_chromium()
            try:
                browser = await p.chromium.launch(headless=True, args=launch_args)
            except Exception:
                if not chromium_path:
                    raise
                browser = await p.chromium.launch(
                    headless=True, args=launch_args, executable_path=chromium_path
                )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                locale="en-US",
                ignore_https_errors=True,
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.google.com/"
                }
            )

            page = await context.new_page()
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            html_content = await page.content()

            extracted_links = []
            if extract_links:
                extracted_links = extract_links_from_html(html_content, page.url)

            await browser.close()

            # Convert HTML to plain text
            import html2text
            h = html2text.HTML2Text()
            h.ignore_links = False
            h.ignore_images = True
            h.ignore_tables = True
            markdown_content = h.handle(html_content)
            markdown_content = re.sub(r"\n{3,}", "\n\n", markdown_content).strip()

            return markdown_content, extracted_links

    except Exception as e:
        print(f"[web_scraper] Error scraping {url}: {e}")
        # Fallback: try simple requests + BeautifulSoup
        return await _fallback_scrape(url, extract_links)


async def _fallback_scrape(url: str, extract_links: bool = False):
    """Fallback scraper using requests + BeautifulSoup when Playwright is unavailable."""
    try:
        import requests
        from bs4 import BeautifulSoup

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
        }
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        text = soup.get_text(separator="\n", strip=True)
        text = re.sub(r"\n{3,}", "\n\n", text)

        links = []
        if extract_links:
            for tag in soup.find_all("a", href=True):
                href = tag["href"].strip()
                if href:
                    if href.lower().startswith(("http://", "https://")):
                        links.append(href)
                    else:
                        links.append(urljoin(url, href))

        return text, links
    except Exception as e:
        print(f"[web_scraper] Fallback scrape also failed for {url}: {e}")
        return None, []


def extract_links_from_html(html_content: str, main_url: str = ""):
    """Extract all unique links from HTML content."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_content, "html.parser")
    links = set()
    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        if href:
            if href.lower().startswith(("http://", "https://")):
                links.add(href)
            else:
                full_url = urljoin(main_url, href)
                links.add(full_url)
    return list(links)


def find_relevant_links(urls: list[str]):
    """Extract social media and contact-related links from a list of URLs."""
    patterns = {
        "youtube": re.compile(r"^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/", re.I),
        "twitter": re.compile(r"^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/", re.I),
        "facebook": re.compile(r"^(https?:\/\/)?(www\.)?facebook\.com\/", re.I),
        "instagram": re.compile(r"^(https?:\/\/)?(www\.)?instagram\.com\/", re.I),
        "linkedin": re.compile(r"^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/", re.I),
        "contact": re.compile(r"contact", re.I)
    }

    result = {key: [] for key in patterns}

    for url in urls:
        for key, pattern in patterns.items():
            if key != "contact" and pattern.match(url):
                result[key].append(url)
            elif key == "contact" and pattern.search(url):
                result[key].append(url)
    return result


def extract_emails_from_content(content: str):
    """Extract email addresses from content."""
    emails = set(email.lower() for email in EMAIL_PATTERN.findall(content or ""))
    return list(emails)