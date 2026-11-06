-- Catálogos idempotentes. No cambia precios ni desactiva registros existentes.
INSERT INTO roles (code, label) VALUES
('client','Cliente'),('employee','Empleado'),('admin','Administrador')
ON DUPLICATE KEY UPDATE code = roles.code;

-- statement-breakpoint
INSERT INTO appointment_statuses (code, label) VALUES
('pending','Pendiente'),('confirmed','Confirmado'),('in_progress','En proceso'),
('completed','Finalizado'),('cancelled','Cancelado'),('awaiting_review','En verificación')
ON DUPLICATE KEY UPDATE code = appointment_statuses.code;

-- statement-breakpoint
INSERT INTO vehicle_types (code, name) VALUES
('car','Auto'),('pickup','Camioneta'),('suv','SUV'),('motorcycle','Moto')
ON DUPLICATE KEY UPDATE code = vehicle_types.code;

-- statement-breakpoint
INSERT INTO services (code, name, description, duration_minutes) VALUES
('exterior','Lavado exterior','Carrocería, llantas y secado manual.',35),
('interior','Limpieza interior','Aspirado y limpieza de superficies interiores.',30),
('complete','Lavado completo','Lavado exterior y limpieza interior.',40),
('wax','Encerado','Protección y brillo de la carrocería. Agregalo al lavado exterior o completo.',15),
('upholstery','Limpieza de tapizados','Limpieza de asientos y superficies textiles.',35)
ON DUPLICATE KEY UPDATE code = services.code;

-- statement-breakpoint
-- Tarifas iniciales en centavos ARS. Las motos conservan sus valores anteriores.
INSERT INTO service_prices (service_id, vehicle_type_id, price_cents)
SELECT s.id, v.id,
  CASE v.code
    WHEN 'car' THEN IF(s.code = 'complete', 2800000, 1500000)
    WHEN 'pickup' THEN IF(s.code = 'complete', 4400000, 2000000)
    WHEN 'suv' THEN IF(s.code = 'complete', 3400000, 1700000)
    ELSE CASE s.code WHEN 'exterior' THEN 800000 WHEN 'interior' THEN 700000 ELSE 1400000 END
  END
FROM services s CROSS JOIN vehicle_types v
WHERE s.code IN ('exterior','interior','complete') AND v.code IN ('car','pickup','suv','motorcycle')
ON DUPLICATE KEY UPDATE price_cents = service_prices.price_cents;

-- statement-breakpoint
INSERT INTO service_prices (service_id,vehicle_type_id,price_cents)
SELECT s.id,t.id,IF(s.code='wax',1500000,2000000)
FROM services s CROSS JOIN vehicle_types t
WHERE s.code IN ('wax','upholstery') AND t.code IN ('car','suv','pickup')
ON DUPLICATE KEY UPDATE price_cents=service_prices.price_cents;
