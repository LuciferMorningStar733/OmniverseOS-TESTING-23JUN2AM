"""Checkpoint API tests use an isolated in-memory database, never production."""
from uuid import uuid4
from datetime import datetime, timedelta, timezone
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from core.auth import get_current_user
from routers import execution

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(execution, 'db', AsyncMongoMockClient()['execution_test'])
    app = FastAPI()
    app.include_router(execution.router)
    app.dependency_overrides[get_current_user] = lambda: {'id': 'owner'}
    return TestClient(app)


def create(client, task_id=None):
    task_id = task_id or str(uuid4())
    response = client.post('/execution/tasks', json={'id': task_id, 'intent': 'Build a game token=very-secret'})
    assert response.status_code == 200
    return task_id, response.json()


def test_owner_isolation_and_redaction(client):
    task_id, doc = create(client)
    assert 'very-secret' not in doc['intent']
    assert doc['evidence_kind'] == 'client_checkpoint_not_independent_verification'
    client.app.dependency_overrides[get_current_user] = lambda: {'id': 'other'}
    assert client.get(f'/execution/tasks/{task_id}').status_code == 404
    assert client.patch(f'/execution/tasks/{task_id}', json={'revision': 0, 'stage': 'blocked'}).status_code == 404


def test_idempotent_creation_does_not_reset_budget(client):
    task_id, _ = create(client)
    assert client.patch(f'/execution/tasks/{task_id}', json={'revision': 0, 'stage': 'generating', 'attempt': 2}).status_code == 200
    _, doc = create(client, task_id)
    assert doc['attempt'] == 2
    assert doc['revision'] == 1


def test_stale_writes_and_attempt_reset_rejected(client):
    task_id, _ = create(client)
    body = {'revision': 0, 'stage': 'generating', 'attempt': 2}
    assert client.patch(f'/execution/tasks/{task_id}', json=body).status_code == 200
    assert client.patch(f'/execution/tasks/{task_id}', json=body).status_code == 409
    body.update(revision=1, attempt=0)
    assert client.patch(f'/execution/tasks/{task_id}', json=body).status_code == 409


def test_cannot_claim_independent_verified_success(client):
    task_id, _ = create(client)
    assert client.patch(f'/execution/tasks/{task_id}', json={'revision': 0, 'stage': 'verified'}).status_code == 422


def test_project_checkpoint_survives_client_reconnect(client):
    task_id, _ = create(client)
    body = {'revision': 0, 'stage': 'needs_verification', 'attempt': 1, 'project': f'cortex-project-{task_id}-0'}
    response = client.patch(f'/execution/tasks/{task_id}', json=body)
    assert response.status_code == 200
    doc = client.get(f'/execution/tasks/{task_id}').json()
    assert doc['project'] == body['project']
    assert len(doc['events']) == 1


def test_unsafe_project_scope_and_attempt_limit(client):
    task_id, _ = create(client)
    assert client.patch(f'/execution/tasks/{task_id}', json={'revision': 0, 'stage': 'saving', 'project': '../secrets'}).status_code == 422
    assert client.patch(f'/execution/tasks/{task_id}', json={'revision': 0, 'stage': 'generating', 'attempt': 4}).status_code == 422

def test_unauthenticated_access_denied(client):
    client.app.dependency_overrides.clear()
    assert client.get(f'/execution/tasks/{uuid4()}').status_code == 401


def test_expired_task_cannot_be_resumed(client):
    import asyncio
    task_id, _ = create(client)
    asyncio.run(execution.db.execution_tasks.update_one({'id': task_id}, {'$set': {'expires_at': datetime.now(timezone.utc) - timedelta(days=1)}}))
    assert client.get(f'/execution/tasks/{task_id}').status_code == 404
