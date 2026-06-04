import os
import uuid
from datetime import datetime, timedelta, date
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from pydantic import BaseModel, ConfigDict
import openpyxl
from io import BytesIO

# --- Config ---
SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
UPLOAD_DIR = "./data/uploads"
DB_DIR = "./data"
DB_PATH = f"{DB_DIR}/portal.db"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DB_DIR, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")

# Порядок старшинства должностей (чем меньше число, тем выше должность)
POSITION_HIERARCHY = {
    "директор": 1,
    "технический директор": 2,
    "заместитель директора": 3,
    "руководитель": 4,
    "главный": 5,
    "ведущий": 6,
    "специалист": 7,
	"инженер": 7,
    "младший": 8,
    "помощник": 9
}

def get_position_weight(position: str) -> int:
    if not position: return 999
    pos_lower = position.lower()
    # Проверяем точное совпадение или вхождение ключевого слова
    for key, weight in POSITION_HIERARCHY.items():
        if key in pos_lower:
            return weight
    return 999 # Если должность не найдена в списке, она будет в конце

# --- DB Setup ---
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class EmployeeDB(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    photo_url = Column(String, nullable=True)
    full_name = Column(String, index=True, nullable=False)
    position = Column(String, nullable=False)
    department = Column(String, index=True, nullable=False)
    email = Column(String, nullable=False)
    phone_personal = Column(String, nullable=False)
    phone_work = Column(String, nullable=False)
    birth_date = Column(String, nullable=False)
    location = Column(String, nullable=False)
    deputy_id = Column(Integer, nullable=True)

class AdminDB(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

Base.metadata.create_all(bind=engine)

# --- Pydantic Models ---
class EmployeeOut(BaseModel):
    id: int
    photo_url: Optional[str] = None
    full_name: str
    position: str
    department: str
    email: str
    phone_personal: str
    phone_work: str
    birth_date: str
    location: str
    deputy_id: Optional[int] = None
    deputy_name: Optional[str] = None
    days_until_birthday: Optional[int] = None  # 🆕 Поле для именинников
    model_config = ConfigDict(from_attributes=True, extra="ignore")

class EmployeeCreate(BaseModel):
    full_name: str
    position: str
    department: str
    email: str
    phone_personal: str
    phone_work: str
    birth_date: str
    location: str
    photo_url: Optional[str] = None
    deputy_id: Optional[int] = None
    model_config = ConfigDict(extra="ignore")

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone_personal: Optional[str] = None
    phone_work: Optional[str] = None
    birth_date: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    deputy_id: Optional[int] = None
    model_config = ConfigDict(extra="ignore")

# --- Auth Helpers ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_admin(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username: raise HTTPException(status_code=401, detail="Invalid token")
        db = SessionLocal()
        try:
            admin = db.query(AdminDB).filter(AdminDB.username == username).first()
            if not admin: raise HTTPException(status_code=401, detail="User not found")
            return admin
        finally: db.close()
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- App ---
app = FastAPI(title="Корпоративный справочник + Admin")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@app.on_event("startup")
def seed_data():
    print("🌱 Инициализация БД...")
    db = SessionLocal()
    try:
        admin_user = os.getenv("ADMIN_USERNAME", "admin")
        admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
        if not db.query(AdminDB).first():
            db.add(AdminDB(username=admin_user, hashed_password=get_password_hash(admin_pass)))
            db.commit()
            print(f"✅ Администратор создан: {admin_user} / {admin_pass}")
        else:
            print("ℹ️ Администратор уже существует в БД.")
        print("🚀 Бэкенд успешно запущен. База готова к заполнению.")
    finally: db.close()

def _emp_out(emp: EmployeeDB, db: Session) -> EmployeeOut:
    deputy_name = None
    if emp.deputy_id:
        d = db.query(EmployeeDB).filter(EmployeeDB.id == emp.deputy_id).first()
        if d: deputy_name = d.full_name
    return EmployeeOut(**emp.__dict__, deputy_name=deputy_name)

# --- Public Endpoints ---
@app.get("/api/departments", response_model=List[str])
def get_departments(db: Session = Depends(get_db)):
    return sorted({e.department for e in db.query(EmployeeDB).all()})

@app.get("/api/employees", response_model=List[EmployeeOut])
def get_employees(department: Optional[str] = Query(None), search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    all_employees = db.query(EmployeeDB).all()

    # Фильтрация
    if search:
        s_lower = search.lower()
        all_employees = [e for e in all_employees if s_lower in e.full_name.lower() or s_lower in e.position.lower() or s_lower in e.department.lower()]

    if department:
        all_employees = [e for e in all_employees if e.department == department]

        # 🆕 Сортировка по старшинству, если выбран отдел
        all_employees.sort(key=lambda e: (get_position_weight(e.position), e.full_name.lower()))
    else:
        # Стандартная сортировка по алфавиту, если отдел не выбран
        all_employees.sort(key=lambda e: e.full_name.lower())

    return [_emp_out(e, db) for e in all_employees]

@app.get("/api/employees/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp: raise HTTPException(404, "Не найден")
    return _emp_out(emp, db)

# 🎂 ЭНДПОИНТ ИМЕНИННИКОВ
@app.get("/api/birthdays", response_model=List[EmployeeOut])
def get_birthdays(db: Session = Depends(get_db)):
    current_date = date.today()
    result = []
    for emp in db.query(EmployeeDB).all():
        if not emp.birth_date: continue
        try:
            b = datetime.strptime(emp.birth_date, "%Y-%m-%d").date()
            days_diff = 999
            for yr_offset in [-1, 0, 1]:
                try: test_bday = date(current_date.year + yr_offset, b.month, b.day)
                except ValueError: test_bday = date(current_date.year + yr_offset, 3, 1)
                diff = (test_bday - current_date).days
                if -5 <= diff <= 5 and abs(diff) < abs(days_diff): days_diff = diff
            if days_diff != 999:
                out = _emp_out(emp, db)
                out.days_until_birthday = days_diff
                result.append(out)
        except: continue
    result.sort(key=lambda x: (x.days_until_birthday < 0, abs(x.days_until_birthday)))
    return result

# --- Admin Endpoints ---
@app.post("/api/admin/login")
def admin_login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = db.query(AdminDB).filter(AdminDB.username == form.username).first()
    if not admin or not verify_password(form.password, admin.hashed_password):
        raise HTTPException(401, "Неверный логин или пароль")
    return {"access_token": create_access_token({"sub": admin.username}), "token_type": "bearer"}

@app.get("/api/admin/employees", response_model=List[EmployeeOut])
def admin_get_employees(db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    all_employees = db.query(EmployeeDB).all()
    all_employees.sort(key=lambda e: e.full_name.lower())
    return [_emp_out(e, db) for e in all_employees]

@app.post("/api/admin/employees", status_code=201)
def admin_create_employee(data: EmployeeCreate, db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    new = EmployeeDB(**data.model_dump(exclude_unset=True))
    db.add(new); db.commit(); db.refresh(new)
    return {"id": new.id}

@app.put("/api/admin/employees/{emp_id}")
def admin_update_employee(emp_id: int, data: EmployeeUpdate, db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp: raise HTTPException(404, "Не найден")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(emp, k, v)
    db.commit(); db.refresh(emp)
    return {"id": emp.id}

@app.delete("/api/admin/employees/{emp_id}")
def admin_delete_employee(emp_id: int, db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp: raise HTTPException(404, "Не найден")
    db.delete(emp); db.commit()
    return {"status": "ok"}

@app.delete("/api/admin/departments/{dept_name}")
def admin_delete_department(dept_name: str, db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    emp_count = db.query(EmployeeDB).filter(EmployeeDB.department == dept_name).count()
    if emp_count > 0: raise HTTPException(400, "В отделе есть сотрудники")
    return {"status": "ok"}

@app.post("/api/admin/upload-photo")
async def upload_photo(file: UploadFile = File(...), _: AdminDB = Depends(get_current_admin)):
    if not file.content_type or not file.content_type.startswith("image/"): raise HTTPException(400, "Только изображения")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024: raise HTTPException(400, "Файл > 5 МБ")
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f: f.write(content)
    return {"url": f"/uploads/{filename}"}

@app.post("/api/admin/import-employees")
async def import_employees(file: UploadFile = File(...), _: AdminDB = Depends(get_current_admin)):
    if not file.filename.endswith('.xlsx'): raise HTTPException(400, "Только .xlsx")
    try:
        contents = await file.read()
        wb = openpyxl.load_workbook(BytesIO(contents))
        rows = list(wb.active.iter_rows(min_row=3, values_only=True))
        created_names, warnings = [], []
        excel_emails = set()
        
        db = SessionLocal()
        try:
            all_db_emps = db.query(EmployeeDB).all()
            db_by_email = {emp.email.lower(): emp for emp in all_db_emps}

            for row_idx, row in enumerate(rows, start=3):
                if not any(row): continue
                try:
                    fn = str(row[0]).strip() if row[0] else ""
                    pos = str(row[1]).strip() if row[1] else ""
                    dep = str(row[2]).strip() if row[2] else ""
                    email = str(row[4]).strip().lower() if row[4] else ""
                    bd_raw = row[3]
                    pp = str(row[5]).strip() if row[5] else ""
                    pw = str(row[6]).strip() if row[6] else ""
                    
                    if not fn or not email: warnings.append(f"Строка {row_idx}: Пропущено"); continue
                    
                    bd = ""
                    if bd_raw:
                        try: bd = bd_raw.strftime("%Y-%m-%d") if isinstance(bd_raw, datetime) else datetime.strptime(str(bd_raw), "%d.%m.%Y").strftime("%Y-%m-%d")
                        except: 
                            try: bd = datetime.strptime(str(bd_raw), "%Y-%m-%d").strftime("%Y-%m-%d")
                            except: bd = str(bd_raw)
                    
                    excel_data = {"full_name": fn, "position": pos, "department": dep, "email": email, "phone_personal": pp, "phone_work": pw, "birth_date": bd}
                    excel_emails.add(email)
                    
                    existing = db_by_email.get(email)
                    if existing:
                        # Сверка без перезаписи
                        has_diff = any(str(getattr(existing, k, None) or "").strip() != str(v or "").strip() for k, v in excel_data.items())
                        if has_diff: warnings.append(f"⚠️ {fn}: данные различаются.")
                    else:
                        db.add(EmployeeDB(full_name=fn, email=email, position=pos or "Не указана", department=dep or "Не указан", birth_date=bd or "1900-01-01", phone_personal=pp, phone_work=pw, location="Не указано", photo_url=None, deputy_id=None))
                        created_names.append(fn)
                except Exception as e: warnings.append(f"Строка {row_idx}: Ошибка - {e}")
            
            # Проверка отсутствующих в файле
            for emp_email, emp in db_by_email.items():
                if emp_email not in excel_emails: warnings.append(f"📉 {emp.full_name} ({emp_email}) нет в файле. Возможно уволен.")
            
            db.commit()
        except Exception as e: db.rollback(); raise HTTPException(500, f"Ошибка: {e}")
        finally: db.close()
    except Exception as e: raise HTTPException(400, f"Ошибка чтения: {e}")
    return {"created_count": len(created_names), "updated_count": 0, "created_names": created_names, "warnings": warnings}

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
