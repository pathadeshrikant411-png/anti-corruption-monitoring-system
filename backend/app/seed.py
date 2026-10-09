import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models import Admin, SystemSetting
from app.security import hash_password
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_PUBLIC_APP_URL = "https://company-frays-establish.ngrok-free.dev"

def seed_initial_admin(db: Session = None):
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        # Create tables if not present
        Base.metadata.create_all(bind=engine)

        admin_email = settings.INITIAL_ADMIN_EMAIL.lower().strip()
        existing_admin = db.query(Admin).filter(Admin.email == admin_email).first()

        if not existing_admin:
            hashed_pwd = hash_password(settings.INITIAL_ADMIN_PASSWORD)
            new_admin = Admin(
                name=settings.INITIAL_ADMIN_NAME,
                email=admin_email,
                password_hash=hashed_pwd,
                role="super_admin",
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            db.refresh(new_admin)
            logger.info(f"Initial Admin account created successfully: {admin_email}")
        else:
            logger.info(f"Admin account already exists: {admin_email}")

        # Seed PUBLIC_APP_URL and PUBLIC_BASE_URL settings
        for key_name in ["PUBLIC_APP_URL", "PUBLIC_BASE_URL"]:
            setting = db.query(SystemSetting).filter(SystemSetting.key == key_name).first()
            if not setting:
                new_setting = SystemSetting(
                    key=key_name,
                    value=DEFAULT_PUBLIC_APP_URL,
                    description="Public Web Domain for QR Codes"
                )
                db.add(new_setting)
            else:
                if not setting.value or "localhost" in setting.value or "127.0.0.1" in setting.value or "YOUR-PERMANENT" in setting.value or "10." in setting.value:
                    setting.value = DEFAULT_PUBLIC_APP_URL
        db.commit()
        logger.info(f"Public QR Web Domain seeded to: {DEFAULT_PUBLIC_APP_URL}")

    except Exception as e:
        logger.error(f"Error seeding initial data: {e}")
        db.rollback()
    finally:
        if close_session:
            db.close()

if __name__ == "__main__":
    seed_initial_admin()
