"""
Drop this helper into the parent app and call log_openrouter_generation()
after every successful OpenRouter API call.

Usage in lesson plan generator:
    from openrouter_logger import log_openrouter_generation
    log_openrouter_generation(response, service="Lesson Plan")

Usage in exam generator:
    log_openrouter_generation(response, service="Exam Generation")

Where `response` is the dict/object returned by the OpenRouter API.
"""

import os
from supabase import create_client

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_PROJECT_URL"],
            os.environ["SUPABASE_ANON_KEY"],
        )
    return _client


def log_openrouter_generation(response: dict, service: str):
    """
    response: the dict returned by OpenRouter (or parsed from the API response).
    Expected fields: id, created, usage.prompt_tokens, usage.completion_tokens,
                     usage.total_tokens, model, provider, x-generation-id, etc.

    Adjust field names below to match the actual response shape in the parent app.
    """
    try:
        usage = response.get("usage", {})
        row = {
            "generation_id":      response.get("id"),
            "created_at":         None,  # Supabase will default to now() if null
            "cost_total":         response.get("cost"),  # if available in response
            "tokens_prompt":      usage.get("prompt_tokens"),
            "tokens_completion":  usage.get("completion_tokens"),
            "tokens_reasoning":   usage.get("reasoning_tokens"),
            "tokens_cached":      usage.get("cached_tokens"),
            "model":              response.get("model"),
            "provider":           None,
            "app_name":           None,
            "api_key_name":       None,
            "generation_time_ms": None,
            "cancelled":          False,
            "finish_reason":      response.get("choices", [{}])[0].get("finish_reason"),
            "service":            service,
        }
        _get_client().table("openrouter_logs").upsert(row).execute()
    except Exception as e:
        # Never let logging crash the main flow
        print(f"[openrouter_logger] Failed to log: {e}")
