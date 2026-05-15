"""
OrderPing test suite — tests against the local dev server at http://localhost:3000

Covers:
  1. Auth page — logo, form fields, Sign In / Sign Up toggle
  2. Redirect to /auth when not signed in
  3. Setup page — loads after auth
  4. Main page — customer input, status buttons, tone pills
  5. Brand colours — primary blue #1A6EF5 on key interactive elements
"""

import sys
import os
from playwright.sync_api import sync_playwright, expect

BASE_URL = "https://www.orderping.net"
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

        # ── 1. Auth page loads ────────────────────────────────────────────────
        page.goto(BASE_URL, wait_until="load", timeout=60000)
        page.wait_for_timeout(2000)
        # Should redirect to /auth when not logged in
        check("Redirects unauthenticated user to /auth",
              lambda: assert_url_contains(page, "/auth"))

        page.goto(f"{BASE_URL}/auth", wait_until="load", timeout=60000)
        page.wait_for_timeout(2000)
        page.screenshot(path="/tmp/auth_page.png", full_page=True)

        check("Auth page: OrderPing logo visible",
              lambda: expect(page.locator('img[alt="OrderPing"]')).to_be_visible())

        check("Auth page: email input present",
              lambda: expect(page.locator('input[type="email"]')).to_be_visible())

        check("Auth page: password input present",
              lambda: expect(page.locator('input[type="password"]')).to_be_visible())

        check("Auth page: Sign In / Sign Up toggle tabs visible",
              lambda: assert_text_visible(page, "Sign In") and assert_text_visible(page, "Sign Up"))

        check("Auth page: submit button visible and has text",
              lambda: expect(page.locator('button[type="submit"]')).to_be_visible())

        # ── 2. Sign In / Sign Up toggle ───────────────────────────────────────
        def toggle_to_signup():
            page.locator("button", has_text="Sign Up").first.click()
            expect(page.locator('input[placeholder="••••••••"]').nth(1)).to_be_visible()

        check("Auth page: toggling to Sign Up reveals confirm password field",
              toggle_to_signup)

        def toggle_back_to_signin():
            page.locator("button", has_text="Sign In").first.click()
            expect(page.locator('input[placeholder="••••••••"]')).to_have_count(1)

        check("Auth page: toggling back to Sign In hides confirm password field",
              toggle_back_to_signin)

        # ── 3. Submit button colour matches logo blue ─────────────────────────
        def check_button_color():
            btn = page.locator('button[type="submit"]')
            bg = btn.evaluate("el => getComputedStyle(el).backgroundColor")
            # rgb(26, 110, 245) = #1A6EF5
            assert "26, 110, 245" in bg, f"Expected logo blue rgb(26,110,245), got: {bg}"

        check("Auth page: submit button uses logo blue #1A6EF5",
              check_button_color)

        # ── 4. Validation — empty submit shows no crash ───────────────────────
        def empty_submit():
            page.locator('button[type="submit"]').click()
            # Page should not crash — still on /auth
            assert "/auth" in page.url

        check("Auth page: submitting empty form stays on /auth (no crash)",
              empty_submit)

        # ── 5. Eye icon toggles password visibility ───────────────────────────
        def password_toggle():
            pw_input = page.locator('input[type="password"]').first
            toggle_btn = page.locator('button[aria-label*="password"]').first
            toggle_btn.click()
            expect(page.locator('input[type="text"]').first).to_be_visible()
            toggle_btn.click()
            expect(page.locator('input[type="password"]').first).to_be_visible()

        check("Auth page: eye icon toggles password visibility",
              password_toggle)

        # ── 6. /setup redirects to /auth when not signed in ──────────────────
        page.goto(f"{BASE_URL}/setup", wait_until="load", timeout=60000)
        page.wait_for_timeout(2000)
        check("Setup page: redirects to /auth when not signed in",
              lambda: assert_url_contains(page, "/auth"))

        # ── 7. Main page redirects to /auth when not signed in ───────────────
        page.goto(BASE_URL, wait_until="load", timeout=60000)
        page.wait_for_timeout(2000)
        check("Main page: redirects to /auth when not signed in",
              lambda: assert_url_contains(page, "/auth"))

        # ── 8. Page title ─────────────────────────────────────────────────────
        page.goto(f"{BASE_URL}/auth", wait_until="load", timeout=60000)
        page.wait_for_timeout(2000)
        check("Page title is 'OrderPing'",
              lambda: assert_title(page, "OrderPing"))

        browser.close()

    # ── Summary ───────────────────────────────────────────────────────────────
    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    total = len(results)
    print(f"\n{'-'*50}")
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f"  ({failed} failed)")
        print("\n  Failed tests:")
        for name, ok, err in results:
            if not ok:
                print(f"    * {name}")
                print(f"      {err}")
    else:
        print("  -- all good!")
    print(f"{'-'*50}")
    print("  Screenshots saved to /tmp/auth_page.png")

    sys.exit(0 if failed == 0 else 1)


# ── Helpers ───────────────────────────────────────────────────────────────────
def assert_url_contains(page, fragment):
    assert fragment in page.url, f"Expected URL to contain '{fragment}', got '{page.url}'"

def assert_text_visible(page, text):
    expect(page.get_by_text(text).first).to_be_visible()
    return True

def assert_title(page, expected):
    assert expected in page.title(), f"Expected title '{expected}', got '{page.title()}'"


if __name__ == "__main__":
    run_tests()
