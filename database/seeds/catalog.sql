-- Catálogos idempotentes. No cambia precios ni desactiva registros existentes.
INSERT INTO roles (code, label) VALUES
('client','Cliente'),('employee','Empleado'),('admin','Administrador')
ON DUPLICATE KEY UPDATE code = roles.code;

-- statement-breakpoint
INSERT INTO appointment_statuses (code, label) VALUES
('pending','Pendiente'),('confirmed','Confirmado'),('in_progress','En proceso'),
('completed','Finalizado'),('cancelled','Cancelado')
ON DUPLICATE KEY UPDATE code = appointment_statuses.code;

-- statement-breakpoint
INSERT INTO vehicle_types (code, name) VALUES
('car','Auto'),('pickup','Camioneta'),('suv','SUV'),('motorcycle','Moto')
ON DUPLICATE KEY UPDATE code = vehicle_types.code;

-- statement-breakpoint
INSERT INTO services (code, name, description, duration_minutes) VALUES
('exterior','Lavado exterior','Carrocería, llantas y secado manual.',35),
('interior','Limpieza interior','Aspirado y limpieza de superficies interiores.',30),
('complete','Lavado completo','Lavado exterior y limpieza interior.',40)
ON DUPLICATE KEY UPDATE code = services.code;

-- statement-breakpoint
-- Precios ficticios de ejemplo en centavos ARS, no son una cotización comercial.
INSERT INTO service_prices (service_id, vehicle_type_id, price_cents)
SELECT s.id, v.id,
  CASE s.code WHEN 'exterior' THEN 800000 WHEN 'interior' THEN 700000 ELSE 1400000 END
  + CASE v.code WHEN 'pickup' THEN 300000 WHEN 'suv' THEN 200000 WHEN 'motorcycle' THEN 0 ELSE 100000 END
FROM services s CROSS JOIN vehicle_types v
WHERE s.code IN ('exterior','interior','complete') AND v.code IN ('car','pickup','suv','motorcycle')
ON DUPLICATE KEY UPDATE price_cents = service_prices.price_cents;
