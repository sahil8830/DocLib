"""Test stream errors without Gemini requests or ChromaDB initialization."""
import importlib.util
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from google.genai.errors import ClientError


class QueryStreamTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.pipeline = SimpleNamespace(stream_query=None)
        spec = importlib.util.spec_from_file_location(
            'isolated_query_route', Path(__file__).parents[1] / 'src/api/routes/query.py'
        )
        self.route = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {
            'src.pipeline.rag_pipeline': SimpleNamespace(RAGPipeline=lambda: self.pipeline),
        }):
            spec.loader.exec_module(self.route)

    async def collect(self):
        req = self.route.QueryRequest(question='Summarize', user_id='user', rewrite=False)
        response = await self.route.stream_query(req)
        return [json.loads(event.removeprefix('data: ').strip()) async for event in response.body_iterator]

    async def test_quota_is_a_visible_stream_error(self):
        async def stream(*args, **kwargs):
            raise ClientError(429, {'error': {'details': [{
                '@type': 'type.googleapis.com/google.rpc.RetryInfo', 'retryDelay': '47s',
            }]}})
            yield
        self.pipeline.stream_query = stream
        events = await self.collect()
        self.assertEqual(events[0]['type'], 'error')
        self.assertIn('47 seconds', events[0]['message'])
        self.assertIn('quota exceeded', events[0]['message'])

    async def test_error_after_partial_answer_is_visible(self):
        async def stream(*args, **kwargs):
            yield 'data: {"type":"token","text":"Partial"}\n\n'
            raise RuntimeError('Internal connection details')
        self.pipeline.stream_query = stream
        events = await self.collect()
        self.assertEqual(events[0]['type'], 'token')
        self.assertEqual(events[1]['type'], 'error')
        self.assertNotIn('Internal connection details', events[1]['message'])

    async def test_success_events_are_preserved(self):
        async def stream(*args, **kwargs):
            self.assertEqual(kwargs['user_id'], 'user')
            yield 'data: {"type":"token","text":"Answer"}\n\n'
            yield 'data: {"type":"done"}\n\n'
        self.pipeline.stream_query = stream
        self.assertEqual([event['type'] for event in await self.collect()], ['token', 'done'])
