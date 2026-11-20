import json
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import DATABASE_URL

# Connect args for SQLite to handle multi-threaded async/sync simulator
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBEvent(Base):
    __tablename__ = "events"
    id = Column(String(64), primary_key=True, index=True)
    ts_utc = Column(String(32), index=True)
    ts_local = Column(String(32))
    system = Column(String(64), index=True)
    source_ip = Column(String(64), index=True)
    actor = Column(String(64), index=True)
    actor_type = Column(String(32))
    action = Column(String(64), index=True)
    endpoint = Column(String(256), nullable=True)
    method = Column(String(16), nullable=True)
    records_returned = Column(Integer, default=0)
    status = Column(String(32))
    details = Column(Text, nullable=True)
    is_replayed = Column(Boolean, default=False)
    evidence_id = Column(String(32), nullable=True)
    highlighted = Column(Boolean, default=False)
    metadata_json = Column(Text, default="{}")

class DBIncident(Base):
    __tablename__ = "incidents"
    id = Column(String(64), primary_key=True, index=True)
    incident_key = Column(String(128), index=True)
    title = Column(String(256))
    severity = Column(String(32), index=True)
    rule_score = Column(Integer, default=0)
    confidence = Column(String(32))
    rule_code = Column(String(64), index=True)
    rule_name = Column(String(256))
    explanation = Column(Text)
    system = Column(String(64))
    source_ip = Column(String(64), index=True)
    actor = Column(String(64), index=True)
    event_count = Column(Integer, default=1)
    first_seen = Column(String(32))
    last_seen = Column(String(32))
    evidence_references = Column(Text, default="[]")  # JSON list
    status = Column(String(32), default="open")  # open, acknowledged, investigating, resolved, contained
    containment_status = Column(String(32), default="none")
    assigned_to = Column(String(64), nullable=True)
    correlated_events = Column(Text, default="[]")  # JSON list

class DBContainmentAudit(Base):
    __tablename__ = "containment_audit"
    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(String(32))
    incident_id = Column(String(64), index=True)
    target_type = Column(String(32))
    target_value = Column(String(128))
    action_type = Column(String(32))
    reason = Column(Text)
    status = Column(String(32), default="SIMULATED_ACTIVE")
    operator = Column(String(64))
    explanation = Column(Text)
    notice = Column(String(128), default="SIMULATED — no real system changed.")
    can_rollback = Column(Boolean, default=True)

class DBIntegrationSetting(Base):
    __tablename__ = "integration_settings"
    credential_id = Column(String(64), primary_key=True)
    integration = Column(String(128))
    system = Column(String(64))
    vendor = Column(String(128))
    scope = Column(String(128))
    owner = Column(String(64))
    ip_restriction = Column(Boolean, default=False)
    token_lifetime_days = Column(Integer, nullable=True)
    status = Column(String(32), default="active")
    simulated_blocked = Column(Boolean, default=False)

def init_db():
    Base.metadata.create_all(bind=engine)
    if DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            conn.exec_driver_sql("PRAGMA journal_mode=WAL;")
            conn.exec_driver_sql("PRAGMA synchronous=NORMAL;")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
