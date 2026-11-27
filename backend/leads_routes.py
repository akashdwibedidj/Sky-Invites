"""Public lead capture routes: waitlist, contact, and business enquiries."""

import re
from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import text

from db import BusinessEnquiry, ContactMessage, get_session

router = APIRouter(prefix="/api", tags=["leads"])
limiter = Limiter(key_func=get_remote_address)

_CONTROL_CHARS_SINGLE = re.compile(r"[\x00-\x1f\x7f]")
_CONTROL_CHARS_MULTI = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _leads_daily_key(request: Request) -> str:
    return f"leads_daily:{get_remote_address(request)}"


def _clean_single(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = _CONTROL_CHARS_SINGLE.sub("", value).strip()
    return cleaned or None


def _clean_multi(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = _CONTROL_CHARS_MULTI.sub("", value).strip()
    return cleaned or None


class WaitlistPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr = Field(..., max_length=254)
    whatsapp: Optional[str] = Field(default=None, max_length=32)
    eventType: str = Field(..., min_length=1, max_length=64)
    website: Optional[str] = Field(default=None, max_length=200)

    @field_validator("name", "eventType", mode="before")
    @classmethod
    def sanitize_required(cls, v: str) -> str:
        cleaned = _clean_single(v)
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("whatsapp", mode="before")
    @classmethod
    def sanitize_optional(cls, v: Optional[str]) -> Optional[str]:
        return _clean_single(v)


class ContactPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr = Field(..., max_length=254)
    reason: Optional[str] = Field(default=None, max_length=120)
    subject: Optional[str] = Field(default=None, max_length=200)
    message: str = Field(..., min_length=1, max_length=4000)
    website: Optional[str] = Field(default=None, max_length=200)

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        cleaned = _clean_single(v)
        if not cleaned:
            raise ValueError("Name cannot be empty")
        return cleaned

    @field_validator("reason", "subject", mode="before")
    @classmethod
    def sanitize_optional(cls, v: Optional[str]) -> Optional[str]:
        return _clean_single(v)

    @field_validator("message", mode="before")
    @classmethod
    def sanitize_message(cls, v: str) -> str:
        cleaned = _clean_multi(v)
        if not cleaned:
            raise ValueError("Message cannot be empty")
        return cleaned


class BusinessEnquiryPayload(BaseModel):
    businessName: str = Field(..., min_length=1, max_length=200)
    contactName: str = Field(..., min_length=1, max_length=200)
    workEmail: EmailStr = Field(..., max_length=254)
    whatsapp: Optional[str] = Field(default=None, max_length=32)
    businessType: str = Field(..., min_length=1, max_length=100)
    monthlyVolume: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1, max_length=4000)
    website: Optional[str] = Field(default=None, max_length=200)

    @field_validator("businessName", "contactName", "businessType", "monthlyVolume", mode="before")
    @classmethod
    def sanitize_required(cls, v: str) -> str:
        cleaned = _clean_single(v)
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("whatsapp", mode="before")
    @classmethod
    def sanitize_optional(cls, v: Optional[str]) -> Optional[str]:
        return _clean_single(v)

    @field_validator("message", mode="before")
    @classmethod
    def sanitize_message(cls, v: str) -> str:
        cleaned = _clean_multi(v)
        if not cleaned:
            raise ValueError("Message cannot be empty")
        return cleaned


_WAITLIST_SUCCESS = {
    "success": True,
    "message": "You are on the list. We will write to you with your early-member code when video invitations open.",
}
_CONTACT_SUCCESS = {
    "success": True,
    "message": "Thank you for writing in. We have received your message and will reply shortly.",
}
_BUSINESS_SUCCESS = {
    "success": True,
    "message": "Thank you. Our team will write back within one business day.",
}


@router.post("/waitlist")
@limiter.limit("5/minute")
@limiter.limit("30/day", key_func=_leads_daily_key)
def join_waitlist(request: Request, payload: WaitlistPayload):
    if _clean_single(payload.website):
        return _WAITLIST_SUCCESS

    normalized_email = str(payload.email).strip().lower()
    with get_session() as db:
        db.execute(
            text(
                "INSERT INTO waitlist (name, email, whatsapp, event_type) "
                "VALUES (:name, :email, :whatsapp, :event_type) "
                "ON CONFLICT (LOWER(email)) DO NOTHING"
            ),
            {
                "name": payload.name,
                "email": normalized_email,
                "whatsapp": payload.whatsapp,
                "event_type": payload.eventType,
            },
        )
    return _WAITLIST_SUCCESS


@router.post("/contact")
@limiter.limit("3/minute")
@limiter.limit("30/day", key_func=_leads_daily_key)
def send_contact_message(request: Request, payload: ContactPayload):
    if _clean_single(payload.website):
        return _CONTACT_SUCCESS

    normalized_email = str(payload.email).strip().lower()
    with get_session() as db:
        db.add(
            ContactMessage(
                name=payload.name,
                email=normalized_email,
                reason=payload.reason,
                subject=payload.subject,
                message=payload.message,
            )
        )
    return _CONTACT_SUCCESS


@router.post("/business/enquiry")
@limiter.limit("5/minute")
@limiter.limit("30/day", key_func=_leads_daily_key)
def send_business_enquiry(request: Request, payload: BusinessEnquiryPayload):
    if _clean_single(payload.website):
        return _BUSINESS_SUCCESS

    normalized_email = str(payload.workEmail).strip().lower()
    with get_session() as db:
        db.add(
            BusinessEnquiry(
                business_name=payload.businessName,
                contact_name=payload.contactName,
                email=normalized_email,
                whatsapp=payload.whatsapp,
                business_type=payload.businessType,
                volume_per_month=payload.monthlyVolume,
                message=payload.message,
            )
        )
    return _BUSINESS_SUCCESS
