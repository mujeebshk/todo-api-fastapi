import os
import requests
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        certs = requests.get(GOOGLE_CERTS_URL).json()
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        public_key = certs.get(kid)
        
        payload = jwt.decode(
            token, 
            public_key, 
            algorithms=["RS256"], 
            audience=FIREBASE_PROJECT_ID, 
            issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}"
        )
        user_email = payload.get("email")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid token: missing email")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(e)}")

    user = db.query(models.User).filter(models.User.email == user_email).first()

    if not user:
        # Auto-register user if they exist in Firebase but not in local DB
        user = models.User(email=user_email, name=payload.get("name", user_email.split('@')[0]))
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=1)

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
