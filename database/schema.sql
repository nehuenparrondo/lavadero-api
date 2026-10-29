-- ESQUEMA AGREGADO DE REFERENCIA. Usar npm run db:migrate para registrar versiones.
-- MySQL 8.4 LTS, InnoDB, UTF-8. Identidades con borrado lógico.
CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  label VARCHAR(40) NOT NULL,
  CONSTRAINT chk_role_code CHECK (code IN ('client', 'employee', 'admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id TINYINT UNSIGNED NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE COMMENT 'Normalizar a minúsculas antes de persistir',
  password_hash VARCHAR(60) CHARACTER SET ascii NULL COMMENT 'bcrypt, NULL si solo usa OAuth',
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL DEFAULT '',
  phone VARCHAR(30) NULL,
  avatar_url VARCHAR(2048) NULL,
  can_record_payments BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auth_version INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Invalida JWT al cambiar permisos',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT chk_deleted_user CHECK (deleted_at IS NULL OR is_active = FALSE),
  INDEX idx_users_role_active (role_id, is_active, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS social_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  provider_subject VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_social_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT chk_provider CHECK (provider IN ('google', 'discord', 'github')),
  UNIQUE KEY uq_provider_subject (provider, provider_subject),
  UNIQUE KEY uq_user_provider (user_id, provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash BINARY(32) NOT NULL UNIQUE COMMENT 'SHA-256, nunca guardar el token legible',
  family_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  replaced_by_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_refresh_replacement FOREIGN KEY (replaced_by_id) REFERENCES refresh_tokens(id),
  CONSTRAINT chk_refresh_expiration CHECK (expires_at > created_at),
  INDEX idx_refresh_family (family_id),
  INDEX idx_refresh_user_expiry (user_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- statement-breakpoint
-- Catálogos y vehículos. Patentes y servicios permanecen para conservar el historial.
CREATE TABLE IF NOT EXISTS vehicle_types (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS vehicles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id BIGINT UNSIGNED NOT NULL,
  vehicle_type_id SMALLINT UNSIGNED NOT NULL,
  plate VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL UNIQUE,
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(80) NOT NULL,
  color VARCHAR(50) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  CONSTRAINT fk_vehicle_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_vehicle_type FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id),
  INDEX idx_vehicles_owner_deleted (owner_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  CONSTRAINT chk_service_duration CHECK (duration_minutes > 0),
  CONSTRAINT chk_deleted_service CHECK (deleted_at IS NULL OR is_active = FALSE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS service_prices (
  service_id BIGINT UNSIGNED NOT NULL,
  vehicle_type_id SMALLINT UNSIGNED NOT NULL,
  price_cents INT UNSIGNED NOT NULL COMMENT 'Centavos ARS, evitar coma flotante',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (service_id, vehicle_type_id),
  CONSTRAINT fk_price_service FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT fk_price_type FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id),
  CONSTRAINT chk_positive_price CHECK (price_cents > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- statement-breakpoint
-- Estados por código inglés, etiquetas en español.
CREATE TABLE IF NOT EXISTS appointment_statuses (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  label VARCHAR(40) NOT NULL,
  CONSTRAINT chk_status_code CHECK (code IN ('pending','confirmed','in_progress','completed','cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id BIGINT UNSIGNED NOT NULL COMMENT 'Titular histórico al reservar',
  vehicle_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NULL,
  status_id TINYINT UNSIGNED NOT NULL,
  starts_at DATETIME(3) NOT NULL COMMENT 'UTC, convertir horario de negocio en la API',
  ends_at DATETIME(3) NOT NULL,
  currency_code CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_by_id BIGINT UNSIGNED NOT NULL,
  cancelled_by_id BIGINT UNSIGNED NULL,
  cancellation_reason VARCHAR(500) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Control de edición concurrente',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_appointment_client FOREIGN KEY (client_id) REFERENCES users(id),
  CONSTRAINT fk_appointment_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_appointment_employee FOREIGN KEY (employee_id) REFERENCES users(id),
  CONSTRAINT fk_appointment_status FOREIGN KEY (status_id) REFERENCES appointment_statuses(id),
  CONSTRAINT fk_appointment_creator FOREIGN KEY (created_by_id) REFERENCES users(id),
  CONSTRAINT fk_appointment_canceller FOREIGN KEY (cancelled_by_id) REFERENCES users(id),
  CONSTRAINT chk_appointment_time CHECK (ends_at > starts_at),
  INDEX idx_appointments_schedule (starts_at, ends_at, status_id),
  INDEX idx_appointments_client (client_id, starts_at),
  INDEX idx_appointments_employee (employee_id, starts_at),
  INDEX idx_appointments_vehicle (vehicle_id, starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS appointment_services (
  appointment_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  applied_price_cents INT UNSIGNED NOT NULL,
  applied_duration_minutes SMALLINT UNSIGNED NOT NULL,
  applied_service_name VARCHAR(100) NOT NULL COMMENT 'Nombre histórico del servicio contratado',
  PRIMARY KEY (appointment_id, service_id),
  CONSTRAINT fk_item_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_item_service FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT chk_applied_price CHECK (applied_price_cents > 0),
  CONSTRAINT chk_applied_duration CHECK (applied_duration_minutes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS appointment_notes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  body VARCHAR(2000) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_note_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_note_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS appointment_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id BIGINT UNSIGNED NOT NULL,
  status_id TINYINT UNSIGNED NOT NULL,
  changed_by_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_history_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_history_status FOREIGN KEY (status_id) REFERENCES appointment_statuses(id),
  CONSTRAINT fk_history_actor FOREIGN KEY (changed_by_id) REFERENCES users(id),
  INDEX idx_status_history (appointment_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id BIGINT UNSIGNED NOT NULL,
  recorded_by_id BIGINT UNSIGNED NOT NULL,
  amount_cents INT UNSIGNED NOT NULL,
  method VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reference VARCHAR(100) NULL,
  idempotency_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  paid_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_payment_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_payment_actor FOREIGN KEY (recorded_by_id) REFERENCES users(id),
  CONSTRAINT chk_payment_amount CHECK (amount_cents > 0),
  CONSTRAINT chk_payment_method CHECK (method IN ('cash', 'transfer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- statement-breakpoint
-- Configuración de una única sucursal, tipada para evitar claves JSON ambiguas.
CREATE TABLE IF NOT EXISTS business_settings (
  id TINYINT UNSIGNED PRIMARY KEY,
  currency_code CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'ARS',
  time_zone VARCHAR(80) NOT NULL,
  cancellation_notice_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 120,
  simultaneous_capacity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  slot_step_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_single_business CHECK (id = 1),
  CONSTRAINT chk_capacity CHECK (simultaneous_capacity > 0),
  CONSTRAINT chk_slot_step CHECK (slot_step_minutes > 0),
  CONSTRAINT chk_currency CHECK (currency_code REGEXP '^[A-Z]{3}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS business_hours (
  weekday TINYINT UNSIGNED PRIMARY KEY COMMENT 'ISO 1=lunes, 7=domingo',
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  CONSTRAINT chk_weekday CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT chk_business_hours CHECK (opens_at >= '00:00:00' AND closes_at <= '24:00:00' AND closes_at > opens_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS booking_day_locks (
  business_date DATE PRIMARY KEY COMMENT 'Fila para SELECT FOR UPDATE al reservar/reprogramar',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
