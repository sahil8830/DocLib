"""Offline regression tests: no Gemini requests and no real retry sleeps."""
import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

os.environ.setdefault("GEMINI_API_KEY", "offline-test-key")

from google.genai.errors import ClientError
from src.embeddings import embedding_service as embeddings
from src.utils.gemini_errors import retry_delay_seconds


def quota_error(delay="47s"):
    return ClientError(429, {"error": {
        "message": "Quota exceeded",
        "details": [{"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": delay}],
    }})


class EmbeddingQuotaTests(unittest.TestCase):
    def setUp(self):
        self.service = embeddings.GeminiEmbeddingService()
        self.result = SimpleNamespace(embeddings=[SimpleNamespace(values=[0.1, 0.2])])

    def test_retry_info_rounds_up(self):
        self.assertEqual(retry_delay_seconds(quota_error("47.3s")), 48)

    def test_missing_retry_info_defaults_to_one_minute(self):
        self.assertEqual(retry_delay_seconds(ClientError(429, {})), 60)

    def test_retry_after_header(self):
        error = quota_error()
        error.response = SimpleNamespace(headers={"Retry-After": "51"})
        self.assertEqual(retry_delay_seconds(error), 51)

    def test_retries_after_provider_delay(self):
        with patch.object(embeddings._client.models, 'embed_content', side_effect=[quota_error(), self.result]) as api:
            sleep = Mock()
            result = self.service._embed_batch.retry_with(sleep=sleep)(self.service, ["text"])
        self.assertEqual(result, [[0.1, 0.2]])
        self.assertEqual(api.call_count, 2)
        sleep.assert_called_once_with(48)

    def test_exhausted_quota_preserves_original_error(self):
        error = quota_error()
        with patch.object(embeddings._client.models, 'embed_content', side_effect=error) as api:
            with self.assertRaises(ClientError) as caught:
                self.service._embed_batch.retry_with(sleep=Mock())(self.service, ["text"])
        self.assertIs(caught.exception, error)
        self.assertEqual(api.call_count, 2)

    def test_invalid_key_is_not_retried(self):
        with patch.object(embeddings._client.models, 'embed_content', side_effect=ClientError(403, {})) as api:
            with self.assertRaises(ClientError):
                self.service._embed_batch.retry_with(sleep=Mock())(self.service, ["text"])
        self.assertEqual(api.call_count, 1)

    def test_long_quota_delay_does_not_hold_request_open(self):
        with patch.object(embeddings._client.models, 'embed_content', side_effect=quota_error("3600s")) as api:
            with self.assertRaises(ClientError):
                self.service._embed_batch.retry_with(sleep=Mock())(self.service, ["text"])
        self.assertEqual(api.call_count, 1)

    def test_batch_results_stay_in_order(self):
        self.service.batch_size = 2
        with patch.object(self.service, '_embed_batch', side_effect=[[[1], [2]], [[3]]]) as batch:
            self.assertEqual(self.service.embed_texts(["a", "b", "c"]), [[1], [2], [3]])
        self.assertEqual(batch.call_count, 2)
        batch.assert_any_call(["c"], task_type="RETRIEVAL_DOCUMENT")


if __name__ == '__main__':
    unittest.main()
