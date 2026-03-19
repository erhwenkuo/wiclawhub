from pydantic import BaseModel


class DeleteResponse(BaseModel):
    ok: bool


class ErrorResponse(BaseModel):
    detail: str
