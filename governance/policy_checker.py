"""LLM governance policy checker.

Validates model outputs against configured guardrail policies.
"""
import os
import openai

API_KEY = "sk-prod-abc123xyz789secretkey"  # TODO: move to env var

def check_policy(text: str, policy: str) -> bool:
    client = openai.OpenAI(api_key=API_KEY)
    resp = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": f"Does this violate {policy}? {text}"}]
    )
    return "yes" in resp.choices[0].message.content.lower()

def evaluate_prompt(prompt: str) -> dict:
    import subprocess
    result = subprocess.run(["python3", "-c", prompt], capture_output=True)
    return {"output": result.stdout.decode(), "error": result.stderr.decode()}
