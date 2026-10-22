#!/usr/bin/env python3
"""
Setup Digital Twins for Smart-Kenish (Team-018) in Eclipse Ditto.
Creates, updates, verifies, or inspects all 24 physical and logical twins idempotently via REST API.
"""

import argparse
import base64
import json
import logging
import os
import sys
import time
import urllib.error
import urllib.request

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("setup_twins")

DITTO_URL = (os.environ.get("DITTO_URL") or "http://localhost:8080").rstrip("/")
DITTO_USER = os.environ.get("DITTO_USER") or "ditto"
DITTO_PASSWORD = os.environ.get("DITTO_PASSWORD") or "ditto"
TWINS_FILE = os.environ.get("TWINS_FILE") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "twins.json")

AUTH = "Basic " + base64.b64encode(f"{DITTO_USER}:{DITTO_PASSWORD}".encode()).decode()


def get_headers():
    return {
        "Authorization": AUTH,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def wait_for_ditto(timeout=60):
    """Wait until Eclipse Ditto gateway and default policy are ready."""
    log.info("Checking Eclipse Ditto readiness at %s...", DITTO_URL)
    policy_url = f"{DITTO_URL}/api/2/policies/default:basic_policy"
    health_url = f"{DITTO_URL}/status/health"
    start = time.time()

    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(policy_url, headers=get_headers())
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status in (200, 204):
                    log.info("✓ Eclipse Ditto and 'default:basic_policy' are READY.")
                    return True
        except urllib.error.HTTPError as exc:
            # Policy not created yet by init job, wait
            if exc.code == 404:
                log.info("Ditto online, waiting for 'default:basic_policy' to be created...")
            elif exc.code in (401, 408, 502, 503, 504):
                log.info("Ditto initializing (HTTP %d), waiting...", exc.code)
        except Exception:
            pass
        time.sleep(2)

    log.info("Ditto preflight check reached timeout (%ds), attempting registration anyway...", timeout)
    return False


def put_policy(policy_id, policy_body):
    """Create or update an ABAC Policy in Eclipse Ditto."""
    req = urllib.request.Request(
        f"{DITTO_URL}/api/2/policies/{policy_id}",
        data=json.dumps(policy_body).encode("utf-8"),
        method="PUT",
        headers=get_headers(),
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status


def put_thing(thing_id, body):
    """Create or replace a Thing in Eclipse Ditto."""
    req = urllib.request.Request(
        f"{DITTO_URL}/api/2/things/{thing_id}",
        data=json.dumps(body).encode("utf-8"),
        method="PUT",
        headers=get_headers(),
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status


def get_thing(thing_id):
    """Fetch a Thing from Eclipse Ditto."""
    req = urllib.request.Request(
        f"{DITTO_URL}/api/2/things/{thing_id}",
        headers=get_headers(),
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def delete_thing(thing_id):
    """Delete a Thing from Eclipse Ditto."""
    req = urllib.request.Request(
        f"{DITTO_URL}/api/2/things/{thing_id}",
        method="DELETE",
        headers=get_headers(),
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status


def verify_twins(twins):
    """Verify that all 24 twins exist in Eclipse Ditto."""
    log.info("Verifying %d twins in Eclipse Ditto at %s...", len(twins), DITTO_URL)
    missing = []
    for thing_id in twins.keys():
        try:
            t = get_thing(thing_id)
            n_feat = len(t.get("features", {}))
            parent = t.get("attributes", {}).get("parent_twin_id") or t.get("attributes", {}).get("_parents", "ROOT")
            log.info("  ✓ [FOUND] %-35s | Parent: %-25s | Features: %d", thing_id, parent, n_feat)
        except Exception as exc:
            log.warning("  ✗ [MISSING] %s: %s", thing_id, exc)
            missing.append(thing_id)

    if not missing:
        log.info("🎉 ALL %d twins successfully verified in Eclipse Ditto!", len(twins))
        return 0
    else:
        log.error("Missing %d/%d twins in Ditto: %s", len(missing), len(twins), missing)
        return 1


def main():
    parser = argparse.ArgumentParser(description="Smart-Kenish Eclipse Ditto Twins Manager")
    parser.add_argument("--verify", action="store_true", help="Verify all twins exist in Ditto without registering")
    parser.add_argument("--delete", action="store_true", help="Delete all 24 twins from Ditto")
    parser.add_argument("--no-wait", action="store_true", help="Skip preflight readiness check")
    args = parser.parse_args()

    if not os.path.exists(TWINS_FILE):
        log.error("Twins definition file not found: %s", TWINS_FILE)
        return 1

    with open(TWINS_FILE, "r", encoding="utf-8") as f:
        twins = json.load(f)

    if args.verify:
        return verify_twins(twins)

    if args.delete:
        log.info("Deleting %d twins from Eclipse Ditto...", len(twins))
        for thing_id in twins.keys():
            try:
                delete_thing(thing_id)
                log.info("✓ Deleted %s", thing_id)
            except Exception as e:
                log.warning("Could not delete %s: %e", thing_id, e)
        return 0

    if not args.no_wait:
        wait_for_ditto(timeout=45)

    policy_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "policies", "abac_mine_policy.json")
    if os.path.exists(policy_file):
        try:
            with open(policy_file, "r") as pf:
                p_data = json.load(pf)
            put_policy("org.openegiz.mine:abac_mine_policy", p_data)
            log.info("✓ Provisioned fine-grained ABAC Policy 'org.openegiz.mine:abac_mine_policy'")
        except Exception as e:
            log.warning("Could not provision ABAC policy (non-fatal): %s", e)

    log.info("Registering %d Smart-Kenish digital twins in Eclipse Ditto at %s", len(twins), DITTO_URL)

    success_count = 0
    for thing_id, body in twins.items():
        for attempt in range(1, 31):
            try:
                status = put_thing(thing_id, body)
                action = "created" if status == 201 else "updated"
                log.info("✓ [%s] %s (HTTP %d)", action.upper(), thing_id, status)
                success_count += 1
                break
            except urllib.error.HTTPError as exc:
                if exc.code in (401, 408, 502, 503, 504) and attempt < 30:
                    log.warning("Ditto busy or authenticating (HTTP %d) on %s, retry %d/30...", exc.code, thing_id, attempt)
                    time.sleep(2)
                    continue
                log.error("✗ HTTP ERROR %d on %s: %s", exc.code, thing_id, exc.read().decode("utf-8", "ignore"))
                return 1
            except (urllib.error.URLError, TimeoutError) as exc:
                if attempt == 30:
                    log.error("✗ FAILED to register %s after 30 attempts: %s", thing_id, exc)
                    return 1
                log.warning("Attempt %d/30 for %s failed (%s), retrying in 2s...", attempt, thing_id, exc)
                time.sleep(2)

    log.info("🎉 SUCCESS: All %d Smart-Kenish digital twins registered in Eclipse Ditto!", success_count)
    return 0


if __name__ == "__main__":
    sys.exit(main())
