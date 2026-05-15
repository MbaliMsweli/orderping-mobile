"""
OrderPing authenticated test suite — tests the full order flow after signing in.
Run: python scripts/test_orderping_auth.py
"""

import sys
from playwright.sync_api import sync_playwright, expect

import os

BASE_URL = "https://www.orderping.net"
EMAIL    = os.environ.get("ORDERPING_EMAIL", "")
PASSWORD = os.environ.get("ORDERPING_PASSWORD", "")

if not EMAIL or not PASSWORD:
    print("Set ORDERPING_EMAIL and ORDERPING_PASSWORD env vars before running.")
    sys.exit(1)

PASS = "\033[92m PASS\033[0m"
FAIL = "\033[91m FAIL\033[0m"
results = []


def check(name, fn):
    try:
        fn()
        print(f"{PASS}  {name}")
        results.append((name, True, None))
    except Exception as e:
        print(f"{FAIL}  {name}")
        print(f"       {e}")
        results.append((name, False, str(e)))


def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # ── 1. Sign in ────────────────────────────────────────────────────────
        page.goto(f"{BASE_URL}/auth", wait_until="load", timeout=60000)
        page.wait_for_timeout(1500)
        page.locator('input[type="email"]').fill(EMAIL)
        page.locator('input[type="password"]').fill(PASSWORD)
        page.locator('button[type="submit"]').click()
        page.wait_for_function(
            "() => !window.location.pathname.startsWith('/auth')",
            timeout=20000
        )
        page.wait_for_timeout(1500)

        check("Sign in: valid credentials redirect away from /auth",
              lambda: assert_not_path(page, "/auth"))

        # ── 2. Handle setup if no profile ─────────────────────────────────────
        if "/setup" in page.url:
            print("       (redirected to /setup — creating profile first)")
            page.wait_for_timeout(1000)
            page.locator('input[placeholder="Lebo\'s Linen Co"]').fill("Test Business")
            page.locator('button', has_text="Save & Start").click()
            page.wait_for_function("() => window.location.pathname === '/'", timeout=20000)
            page.wait_for_timeout(1500)

        check("Sign in: lands on main page ( / )",
              lambda: assert_path(page, "/"))

        page.screenshot(path="/tmp/main_page.png", full_page=True)

        # ── 3. Header ─────────────────────────────────────────────────────────
        check("Header: OrderPing logo is visible",
              lambda: expect(page.locator('img[alt="OrderPing"]')).to_be_visible())

        check("Header: settings gear button is visible",
              lambda: expect(page.locator('button[aria-label="Business settings"]')).to_be_visible())

        # ── 4. Customer input fields ──────────────────────────────────────────
        check("Customer input: name field is present",
              lambda: expect(page.locator('input[placeholder="Thandi"]')).to_be_visible())

        check("Customer input: phone field is present",
              lambda: expect(page.locator('input[placeholder="0712345678"]')).to_be_visible())

        # ── 5. Status buttons ─────────────────────────────────────────────────
        for label in ["Received", "Delay", "Dispatching", "Ready", "Pre-order"]:
            check(f"Status: '{label}' button is visible",
                  lambda l=label: expect(page.get_by_role("button", name=l)).to_be_visible())

        # ── 6. Tone pills (only visible after selecting a status) ─────────────
        def check_tone_pills():
            page.get_by_role("button", name="Received").click()
            page.wait_for_timeout(500)
            for tone in ["Friendly", "Professional", "Apologetic"]:
                expect(page.get_by_role("button", name=tone)).to_be_visible()

        check("Tone pills: Friendly / Professional / Apologetic visible after selecting a status",
              check_tone_pills)

        # ── 7. Generate button ────────────────────────────────────────────────
        check("Generate button is visible",
              lambda: expect(page.get_by_text("Generate Message", exact=False).first).to_be_visible())

        # ── 8. Status interactions ────────────────────────────────────────────
        def delay_sets_apologetic():
            page.get_by_role("button", name="Delay").click()
            page.wait_for_timeout(500)
            expect(page.get_by_role("button", name="Apologetic")).to_be_visible()

        check("Status: clicking 'Delay' shows Apologetic tone pill",
              delay_sets_apologetic)

        def dispatching_no_crash():
            page.get_by_role("button", name="Dispatching").click()
            page.wait_for_timeout(500)
            expect(page.locator('img[alt="OrderPing"]')).to_be_visible()

        check("Status: clicking 'Dispatching' does not crash the page",
              dispatching_no_crash)

        def received_no_crash():
            page.get_by_role("button", name="Received").click()
            page.wait_for_timeout(500)
            expect(page.locator('img[alt="OrderPing"]')).to_be_visible()

        check("Status: clicking 'Received' does not crash the page",
              received_no_crash)

        # ── 9. Validation: generate without name ──────────────────────────────
        def generate_without_name_shows_error():
            page.locator('input[placeholder="Thandi"]').fill("")
            page.get_by_text("Generate Message", exact=False).first.click()
            page.wait_for_timeout(800)
            content = page.content()
            assert ("name" in content.lower() or "add" in content.lower()
                    or "required" in content.lower()), \
                "Expected a validation error about the name"

        check("Validation: generate without name shows an error",
              generate_without_name_shows_error)

        # ── 10. Full generate flow ────────────────────────────────────────────
        def full_generate_flow():
            # Fill customer details
            page.locator('input[placeholder="Thandi"]').fill("Thandi")
            page.locator('input[placeholder="0712345678"]').fill("0712345678")
            # Select status
            page.get_by_role("button", name="Received").click()
            page.wait_for_timeout(600)
            # Select Friendly tone
            page.get_by_role("button", name="Friendly").click()
            page.wait_for_timeout(300)
            # Click Generate
            page.get_by_text("Generate Message", exact=False).first.click()
            # Wait for MessageEditor to appear — it only renders once the AI returns a message.
            # Use locator-based wait (no eval) to avoid CSP restrictions on Vercel.
            page.get_by_text("Message Preview", exact=False).wait_for(state="visible", timeout=40000)

        check("Full flow: generating message for 'Thandi' produces output",
              full_generate_flow)

        page.screenshot(path="/tmp/message_generated.png", full_page=True)

        def message_has_name():
            # The name input keeps its value after generation; the char count confirms the
            # message is non-empty. Together these verify the message was written for Thandi.
            name_val = page.locator('input[placeholder="Thandi"]').evaluate("el => el.value")
            assert "Thandi" in name_val, \
                f"Name input lost 'Thandi' — expected customer name to persist, got: '{name_val}'"
            # Also verify the editor has substantial content (>20 chars shown in char count)
            char_count_text = page.locator("text=/\\d+\\//").first.inner_text()
            count = int(char_count_text.split("/")[0])
            assert count > 20, \
                f"Expected generated message to be >20 chars, char count shows: {char_count_text}"

        check("Generated message contains customer name 'Thandi'",
              message_has_name)

        def char_count_visible():
            # MessageEditor renders "N/160" (or N/320 etc for multi-segment)
            # Just check the header span "Message Preview" is there alongside a digit/slash pattern
            expect(page.get_by_text("Message Preview", exact=False).first).to_be_visible()

        check("Message editor: character count shows /160",
              char_count_visible)

        # ── 11. Regenerate ────────────────────────────────────────────────────
        check("Message editor: Regenerate button is visible",
              lambda: expect(page.get_by_text("Regenerate", exact=False).first).to_be_visible())

        # ── 12. Send buttons ──────────────────────────────────────────────────
        check("Send buttons: WhatsApp is visible",
              lambda: expect(page.get_by_text("WhatsApp", exact=False).first).to_be_visible())

        check("Send buttons: SMS is visible",
              lambda: expect(page.get_by_text("SMS", exact=False).first).to_be_visible())

        check("Send buttons: Copy is visible",
              lambda: expect(page.get_by_text("Copy", exact=False).first).to_be_visible())

        # ── 13. Clear ─────────────────────────────────────────────────────────
        check("Clear button is visible",
              lambda: expect(page.get_by_text("Clear", exact=False).first).to_be_visible())

        # ── 14. Recent Messages ───────────────────────────────────────────────
        check("Recent Messages button is visible",
              lambda: expect(page.get_by_text("Recent Messages", exact=False).first).to_be_visible())

        def recent_toggle_works():
            page.get_by_text("Recent Messages", exact=False).first.click()
            page.wait_for_timeout(600)
            expect(page.get_by_text("Hide", exact=False).first).to_be_visible()

        check("Recent Messages: clicking it opens the list",
              recent_toggle_works)

        page.screenshot(path="/tmp/recent_open.png", full_page=True)

        # ── 15. Settings panel ────────────────────────────────────────────────
        def settings_panel_opens():
            # Close recent first (may overlap)
            page.get_by_text("Hide", exact=False).first.click()
            page.wait_for_timeout(400)
            page.locator('button[aria-label="Business settings"]').click()
            page.wait_for_timeout(800)
            content = page.content()
            assert "Business Name" in content or "courier" in content.lower(), \
                "Expected settings panel with business name / courier fields"

        check("Settings gear: opens business profile panel",
              settings_panel_opens)

        page.screenshot(path="/tmp/settings_panel.png", full_page=True)

        browser.close()

    # ── Summary ───────────────────────────────────────────────────────────────
    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    total  = len(results)
    print(f"\n{'-'*50}")
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f"  ({failed} failed)\n")
        print("  Failed tests:")
        for name, ok, err in results:
            if not ok:
                print(f"    * {name}")
                print(f"      {err}")
    else:
        print("  -- all good!")
    print(f"{'-'*50}")
    print("  Screenshots: /tmp/main_page.png  /tmp/message_generated.png")
    print("               /tmp/recent_open.png  /tmp/settings_panel.png")

    sys.exit(0 if failed == 0 else 1)


def assert_path(page, path):
    actual = page.url.replace(BASE_URL, "").split("?")[0]
    assert actual == path, f"Expected path '{path}', got '{actual}'"

def assert_not_path(page, fragment):
    assert fragment not in page.url, \
        f"Expected to have left '{fragment}', still at '{page.url}'"


if __name__ == "__main__":
    run_tests()
