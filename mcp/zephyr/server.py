# /// script
# dependencies = ["fastmcp>=2.0", "httpx"]
# ///
"""Zephyr Scale MCP server for Jira Server/DC — reads test cases and steps via ATM REST API."""
import os
import json
import httpx
from fastmcp import FastMCP

mcp = FastMCP("zephyr-scale")

JIRA_URL = os.environ["JIRA_URL"].rstrip("/")
TOKEN = os.environ["ZEPHYR_TOKEN"]


def _headers() -> dict:
    return {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}


@mcp.tool()
async def zephyr_get_test_case(key: str) -> str:
    """Get a Zephyr Scale test case by key (e.g. NE-T1488).
    Returns name, objective, precondition, status, priority, labels, steps, and custom fields."""
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{JIRA_URL}/rest/atm/1.0/testcase/{key}",
            headers=_headers(),
            timeout=30,
        )
        r.raise_for_status()
        return json.dumps(r.json(), indent=2, ensure_ascii=False)


@mcp.tool()
async def zephyr_create_test_case(
    project_key: str,
    name: str,
    objective: str | None = None,
    precondition: str | None = None,
    status: str = "Draft",
    priority: str = "Normal",
    folder: str | None = None,
    labels: list[str] | None = None,
    steps: list[dict] | None = None,
) -> str:
    """Create a new Zephyr Scale test case.

    project_key — e.g. "NE"
    name        — test case name
    objective   — what the test verifies
    precondition — required state before the test starts
    status      — Draft (default) | Approved | Deprecated
    priority    — Low | Normal (default) | High
    folder      — folder path, e.g. "/NetSuite/P2P"
    labels      — list of label strings
    steps       — list of step dicts, each with:
                    description    (required)
                    expectedResult (required)
                    testData       (optional)

    Returns the created test case including its generated key (e.g. NE-T1500)."""
    payload: dict = {
        "projectKey": project_key,
        "name": name,
        "status": status,
        "priority": priority,
    }
    if objective:
        payload["objective"] = objective
    if precondition:
        payload["precondition"] = precondition
    if folder:
        payload["folder"] = folder
    if labels:
        payload["labels"] = labels
    if steps:
        payload["testScript"] = {
            "type": "STEP_BY_STEP",
            "steps": [
                {
                    "description": s.get("description", ""),
                    "expectedResult": s.get("expectedResult", ""),
                    **({"testData": s["testData"]} if s.get("testData") else {}),
                }
                for s in steps
            ],
        }

    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{JIRA_URL}/rest/atm/1.0/testcase",
            headers={**_headers(), "Content-Type": "application/json"},
            content=json.dumps(payload, ensure_ascii=False),
            timeout=30,
        )
        r.raise_for_status()
        return json.dumps(r.json(), indent=2, ensure_ascii=False)


@mcp.tool()
async def zephyr_update_test_case(
    key: str,
    name: str | None = None,
    objective: str | None = None,
    precondition: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    labels: list[str] | None = None,
) -> str:
    """Update metadata of a Zephyr Scale test case (e.g. NE-T1488).
    Only the fields you pass will be changed — omit a field to leave it unchanged.
    status values: Draft, Approved, Deprecated.
    priority values: Low, Normal, High."""
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{JIRA_URL}/rest/atm/1.0/testcase/{key}",
            headers=_headers(),
            timeout=30,
        )
        r.raise_for_status()
        payload = r.json()

        if name is not None:
            payload["name"] = name
        if objective is not None:
            payload["objective"] = objective
        if precondition is not None:
            payload["precondition"] = precondition
        if status is not None:
            payload["status"] = status
        if priority is not None:
            payload["priority"] = priority
        if labels is not None:
            payload["labels"] = labels

        w = await c.put(
            f"{JIRA_URL}/rest/atm/1.0/testcase/{key}",
            headers={**_headers(), "Content-Type": "application/json"},
            content=json.dumps(payload, ensure_ascii=False),
            timeout=30,
        )
        w.raise_for_status()
        return json.dumps(w.json(), indent=2, ensure_ascii=False)


@mcp.tool()
async def zephyr_update_test_steps(
    key: str,
    steps: list[dict],
) -> str:
    """Replace all test steps of a Zephyr Scale test case (e.g. NE-T1488).
    Each step is a dict with keys:
      description  (required) — what the tester does
      expectedResult (required) — what should happen
      testData     (optional) — input data for the step
    Example:
      [
        {"description": "Log in as Employee", "expectedResult": "Main page shown"},
        {"description": "Click Requisition", "expectedResult": "Form opens", "testData": "TEST PR"}
      ]
    Replaces ALL existing steps — include every step you want to keep."""
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{JIRA_URL}/rest/atm/1.0/testcase/{key}",
            headers=_headers(),
            timeout=30,
        )
        r.raise_for_status()
        payload = r.json()

        payload["testScript"] = {
            "type": "STEP_BY_STEP",
            "steps": [
                {
                    "description": s.get("description", ""),
                    "expectedResult": s.get("expectedResult", ""),
                    **({"testData": s["testData"]} if s.get("testData") else {}),
                }
                for s in steps
            ],
        }

        w = await c.put(
            f"{JIRA_URL}/rest/atm/1.0/testcase/{key}",
            headers={**_headers(), "Content-Type": "application/json"},
            content=json.dumps(payload, ensure_ascii=False),
            timeout=30,
        )
        w.raise_for_status()
        return json.dumps(w.json(), indent=2, ensure_ascii=False)


@mcp.tool()
async def zephyr_embed_image_in_step(
    key: str,
    step_index: int,
    image_path: str,
    position: str = "after",
) -> str:
    """Upload a local image and embed it in a test step description.

    key        — test case key (e.g. NE-T1488)
    step_index — 0-based index of the step to update
    image_path — absolute path to the image file (PNG, JPG, GIF, …)
    position   — where to insert the image: "after" (default) or "before" the step text

    Uploads the file to Zephyr, gets the attachment ID, then updates the step
    description with <img src="../rest/tests/1.0/attachment/image/{id}" />."""
    import mimetypes
    from pathlib import Path

    p = Path(image_path)
    if not p.exists():
        raise ValueError(f"File not found: {image_path}")

    mime, _ = mimetypes.guess_type(str(p))
    mime = mime or "application/octet-stream"

    async with httpx.AsyncClient() as c:
        with open(p, "rb") as f:
            upload = await c.post(
                f"{JIRA_URL}/rest/atm/1.0/testcase/{key}/attachments",
                headers={"Authorization": f"Bearer {TOKEN}"},
                files={"file": (p.name, f, mime)},
                timeout=60,
            )
        upload.raise_for_status()
        data = upload.json()
        attachment_id = (data[0] if isinstance(data, list) else data)["id"]
        img_tag = f'<img src="../rest/tests/1.0/attachment/image/{attachment_id}" class="fr-fic fr-dii" />'

        r = await c.get(
            f"{JIRA_URL}/rest/atm/1.0/testcase/{key}",
            headers=_headers(),
            timeout=30,
        )
        r.raise_for_status()
        payload = r.json()

        steps = payload["testScript"]["steps"]
        if step_index >= len(steps):
            raise ValueError(
                f"step_index {step_index} out of range — test case has {len(steps)} steps (0-based)"
            )

        desc = steps[step_index].get("description", "")
        steps[step_index]["description"] = (
            img_tag + "<br />" + desc if position == "before" else desc + "<br />" + img_tag
        )

        w = await c.put(
            f"{JIRA_URL}/rest/atm/1.0/testcase/{key}",
            headers={**_headers(), "Content-Type": "application/json"},
            content=json.dumps(payload, ensure_ascii=False),
            timeout=30,
        )
        w.raise_for_status()
        updated_step = w.json()["testScript"]["steps"][step_index]
        return json.dumps(
            {"attachmentId": attachment_id, "imgTag": img_tag, "updatedStep": updated_step},
            indent=2,
            ensure_ascii=False,
        )


@mcp.tool()
async def zephyr_create_test_run(
    project_key: str,
    name: str,
    test_case_keys: list[str],
) -> str:
    """Create a new Zephyr Scale Test Run and add test cases to it.

    project_key    — e.g. "NE"
    name           — display name (e.g. "Sprint 12 — P2P Regression")
    test_case_keys — list of test case keys to include (e.g. ["NE-T1488", "NE-T1490"])

    Returns the created test run including its key (e.g. NE-R42),
    which is required for zephyr_update_test_result."""
    payload = {
        "projectKey": project_key,
        "name": name,
        "items": [{"testCaseKey": k} for k in test_case_keys],
    }
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{JIRA_URL}/rest/atm/1.0/testrun",
            headers={**_headers(), "Content-Type": "application/json"},
            content=json.dumps(payload, ensure_ascii=False),
            timeout=30,
        )
        r.raise_for_status()
        return json.dumps(r.json(), indent=2, ensure_ascii=False)


@mcp.tool()
async def zephyr_update_test_result(
    run_key: str,
    test_case_key: str,
    status: str,
    step_statuses: list[str] | None = None,
    comment: str | None = None,
) -> str:
    """Set Pass / Fail / Blocked for a test case in a test run.

    run_key       — test run key returned by zephyr_create_test_run (e.g. NE-R42)
    test_case_key — test case key (e.g. NE-T1488)
    status        — overall result: Pass | Fail | Blocked | In Progress | Not Executed
    step_statuses — optional per-step statuses in order (same values as status)
                    e.g. ["Pass", "Pass", "Fail", "Not Executed"]
                    omit to leave step statuses unchanged
    comment       — optional comment attached to the result

    Returns the updated test result."""
    result: dict = {"testCaseKey": test_case_key, "status": status}
    if comment:
        result["comment"] = comment
    if step_statuses:
        result["scriptResults"] = [
            {"index": i, "status": s} for i, s in enumerate(step_statuses)
        ]
    async with httpx.AsyncClient() as c:
        r = await c.put(
            f"{JIRA_URL}/rest/atm/1.0/testrun/{run_key}/testresults",
            headers={**_headers(), "Content-Type": "application/json"},
            content=json.dumps([result], ensure_ascii=False),
            timeout=30,
        )
        r.raise_for_status()
        return json.dumps(r.json(), indent=2, ensure_ascii=False)


@mcp.tool()
async def zephyr_search_test_cases(query: str, max_results: int = 20) -> str:
    """Search Zephyr Scale test cases using Zephyr Query Language (ZQL).
    Example queries:
      projectKey = "NE"
      projectKey = "NE" AND name ~ "Requisition"
      projectKey = "NE" AND status = "Approved"
    Returns a list of matching test cases with keys, names, and status."""
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{JIRA_URL}/rest/atm/1.0/testcase/search",
            params={"query": query, "maxResults": max_results, "startAt": 0},
            headers=_headers(),
            timeout=30,
        )
        r.raise_for_status()
        return json.dumps(r.json(), indent=2, ensure_ascii=False)


if __name__ == "__main__":
    mcp.run()
