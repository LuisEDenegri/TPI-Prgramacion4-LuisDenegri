from sqlmodel import SQLModel


class MensajeResponse(SQLModel):
    """El token no viaja aca: va en la cookie HttpOnly access_token."""

    message: str
