-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 07-08-2025 a las 22:57:20
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `inventario_fichas_wifi`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `abastecimientos`
--

CREATE TABLE `abastecimientos` (
  `id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `proveedor` varchar(255) DEFAULT NULL,
  `numero_factura` varchar(100) DEFAULT NULL,
  `costo_total` decimal(10,2) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha_abastecimiento` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `abastecimientos`
--

INSERT INTO `abastecimientos` (`id`, `tipo_ficha_id`, `cantidad`, `proveedor`, `numero_factura`, `costo_total`, `observaciones`, `usuario_id`, `fecha_abastecimiento`) VALUES
(1, 29, 200, 'Stock Manual', NULL, 1000.00, 'Stock agregado manualmente', 1, '2025-08-02 06:02:27'),
(2, 29, 50, 'Stock Manual', NULL, 250.00, 'Stock agregado manualmente', 1, '2025-08-02 06:17:01');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ajustes_stock`
--

CREATE TABLE `ajustes_stock` (
  `id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `cantidad_ajuste` int(11) NOT NULL,
  `comentario` text DEFAULT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha_ajuste` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuraciones`
--

CREATE TABLE `configuraciones` (
  `id` int(11) NOT NULL,
  `clave` varchar(100) NOT NULL,
  `valor` text NOT NULL,
  `descripcion` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuraciones`
--

INSERT INTO `configuraciones` (`id`, `clave`, `valor`, `descripcion`, `updated_at`) VALUES
(1, 'empresa_nombre', 'Sistema de Fichas WiFi', 'Nombre de la empresa', '2025-07-19 01:47:13'),
(2, 'moneda', 'MXN', 'Moneda utilizada', '2025-07-19 01:47:13'),
(3, 'timezone', 'America/Mexico_City', 'Zona horaria', '2025-07-19 01:47:13'),
(4, 'backup_enabled', 'true', 'Habilitar respaldos automáticos', '2025-07-19 01:47:13'),
(5, 'version', '1.0.0', 'Versión del sistema', '2025-07-19 01:47:13'),
(6, 'porcentaje_ganancia_creador', '20', 'Porcentaje de ganancia del creador de fichas sobre las ventas', '2025-07-28 02:16:23');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_global`
--

CREATE TABLE `configuracion_global` (
  `id` int(11) NOT NULL,
  `clave` varchar(50) NOT NULL,
  `valor` text NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('string','number','boolean','json') DEFAULT 'string',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuracion_global`
--

INSERT INTO `configuracion_global` (`id`, `clave`, `valor`, `descripcion`, `tipo`, `created_at`, `updated_at`) VALUES
(1, 'porcentaje_comision_defecto', '20', 'Porcentaje de comisión por defecto aplicado a todos los revendedores', 'number', '2025-07-19 06:43:41', '2025-07-20 03:56:02'),
(2, 'nombre_sistema', 'Sistema de Fichas WiFi', 'Nombre del sistema', 'string', '2025-07-20 03:52:42', '2025-07-20 03:52:42'),
(3, 'version_sistema', '1.0.0', 'Versión actual del sistema', 'string', '2025-07-20 03:52:42', '2025-07-20 03:54:36');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cortes_caja`
--

CREATE TABLE `cortes_caja` (
  `id` int(11) NOT NULL,
  `fecha_corte` date NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `usuario_nombre` varchar(255) NOT NULL,
  `total_ingresos` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_ganancias` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_revendedores` decimal(10,2) NOT NULL DEFAULT 0.00,
  `detalle_tipos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detalle_tipos`)),
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cortes_caja_backup`
--

CREATE TABLE `cortes_caja_backup` (
  `id` int(11) NOT NULL DEFAULT 0,
  `fecha_corte` date NOT NULL,
  `total_fichas_vendidas` int(11) NOT NULL,
  `total_subtotal` decimal(10,2) NOT NULL,
  `total_comisiones` decimal(10,2) NOT NULL,
  `total_neto` decimal(10,2) NOT NULL,
  `detalles_json` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `entregas`
--

CREATE TABLE `entregas` (
  `id` int(11) NOT NULL,
  `revendedor_id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `tipo_movimiento` enum('entrega','devolucion') NOT NULL DEFAULT 'entrega',
  `nota` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventarios`
--

CREATE TABLE `inventarios` (
  `id` int(11) NOT NULL,
  `revendedor_id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `fichas_entregadas` int(11) NOT NULL DEFAULT 0,
  `fichas_vendidas` int(11) NOT NULL DEFAULT 0,
  `stock_actual` int(11) NOT NULL DEFAULT 0,
  `stock_minimo` int(11) NOT NULL DEFAULT 10,
  `ubicacion` varchar(100) DEFAULT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventarios_revendedor`
--

CREATE TABLE `inventarios_revendedor` (
  `id` int(11) NOT NULL,
  `revendedor_id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `fichas_entregadas` int(11) DEFAULT 0,
  `fichas_vendidas` int(11) DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `precios`
--

CREATE TABLE `precios` (
  `id` int(11) NOT NULL,
  `revendedor_id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `precio_compra` decimal(10,2) NOT NULL,
  `precio_venta` decimal(10,2) NOT NULL,
  `fecha_vigencia_desde` date NOT NULL,
  `fecha_vigencia_hasta` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `precios_revendedor`
--

CREATE TABLE `precios_revendedor` (
  `id` int(11) NOT NULL,
  `revendedor_id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `comision` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportes_inventario`
--

CREATE TABLE `reportes_inventario` (
  `id` int(11) NOT NULL,
  `revendedor_id` int(11) NOT NULL,
  `fecha_reporte` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` enum('pendiente','verificado','rechazado') DEFAULT 'pendiente',
  `inventario_detalle` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`inventario_detalle`)),
  `observaciones` text DEFAULT NULL,
  `motivo_rechazo` text DEFAULT NULL,
  `fecha_verificacion` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `revendedores`
--

CREATE TABLE `revendedores` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `nombre_negocio` varchar(200) NOT NULL,
  `nombre` varchar(100) NOT NULL COMMENT 'Nombre del negocio',
  `responsable` varchar(100) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `porcentaje_comision` decimal(5,2) NOT NULL DEFAULT 20.00 COMMENT 'Porcentaje de comisión sobre el total de ventas (ej: 20.00 = 20%)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `revendedores`
--

INSERT INTO `revendedores` (`id`, `usuario_id`, `nombre_negocio`, `nombre`, `responsable`, `telefono`, `direccion`, `activo`, `porcentaje_comision`, `created_at`, `updated_at`) VALUES
(0, 0, 'cafe maria', 'maria juana', 'maria juana', '', '', 1, 20.00, '2025-08-07 18:04:24', '2025-08-07 18:04:24');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `stock_global`
--

CREATE TABLE `stock_global` (
  `id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `cantidad_total` int(11) DEFAULT 0,
  `cantidad_disponible` int(11) DEFAULT 0,
  `cantidad_entregada` int(11) DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `stock_global`
--

INSERT INTO `stock_global` (`id`, `tipo_ficha_id`, `cantidad_total`, `cantidad_disponible`, `cantidad_entregada`, `updated_at`) VALUES
(1, 29, 250, 48, 202, '2025-08-02 18:51:46');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tareas_mantenimiento`
--

CREATE TABLE `tareas_mantenimiento` (
  `id` int(11) NOT NULL,
  `revendedor_id` int(11) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `prioridad` enum('Baja','Media','Alta','Urgente') NOT NULL,
  `estado` enum('Pendiente','En Progreso','Completado','Cancelado') NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `fecha_completado` date DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `trabajador_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos_ficha`
--

CREATE TABLE `tipos_ficha` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `duracion_horas` int(11) NOT NULL,
  `precio_base` decimal(10,2) NOT NULL DEFAULT 0.00,
  `comision_base` decimal(10,2) NOT NULL DEFAULT 0.00,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos_fichas`
--

CREATE TABLE `tipos_fichas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `duracion_horas` int(11) NOT NULL,
  `precio_compra` decimal(10,2) NOT NULL,
  `precio_venta` decimal(10,2) NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tipos_fichas`
--

INSERT INTO `tipos_fichas` (`id`, `nombre`, `descripcion`, `duracion_horas`, `precio_compra`, `precio_venta`, `activo`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(29, '1 hora', 'Ficha de 1 hora', 1, 0.00, 5.00, 1, '2025-08-02 06:02:14', '2025-08-02 06:02:14');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `trabajadores_mantenimiento`
--

CREATE TABLE `trabajadores_mantenimiento` (
  `id` int(11) NOT NULL,
  `nombre_completo` varchar(255) NOT NULL,
  `especialidad` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `usuario_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre_completo` varchar(100) NOT NULL,
  `tipo_usuario` enum('admin','revendedor','trabajador') NOT NULL,
  `revendedor_id` int(11) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `ultimo_login` timestamp NULL DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `telefono` varchar(20) DEFAULT NULL,
  `role` enum('admin','trabajador','revendedor') NOT NULL DEFAULT 'revendedor',
  `especialidad` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `username`, `email`, `password_hash`, `nombre_completo`, `tipo_usuario`, `revendedor_id`, `activo`, `ultimo_login`, `fecha_creacion`, `created_at`, `updated_at`, `telefono`, `role`, `especialidad`) VALUES
(1, 'admin', 'admin@fichas.com', '$2b$10$vLnz3rDLw9NpaByJZsuIBOg94PGxNK7qnLk5gBeJqhGlYPVqUlct2', 'Administrador Principal', 'admin', NULL, 1, '2025-08-07 18:28:26', '2025-07-29 03:15:23', '2025-08-02 04:34:50', '2025-08-07 18:28:26', NULL, 'admin', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id` int(11) NOT NULL,
  `revendedor_id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `comision_unitaria` decimal(10,2) NOT NULL,
  `comision_total` decimal(10,2) NOT NULL,
  `total_neto` decimal(10,2) NOT NULL,
  `fecha_venta` date NOT NULL,
  `nota` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `monto_total` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Disparadores `ventas`
--
DELIMITER $$
CREATE TRIGGER `actualizar_inventario_venta` AFTER INSERT ON `ventas` FOR EACH ROW BEGIN
                INSERT INTO inventarios_revendedor 
                (revendedor_id, tipo_ficha_id, fichas_entregadas, fichas_vendidas, updated_at)
                VALUES (
                    NEW.revendedor_id,
                    NEW.tipo_ficha_id,
                    0,
                    NEW.cantidad,
                    NOW()
                )
                ON DUPLICATE KEY UPDATE
                fichas_vendidas = fichas_vendidas + NEW.cantidad,
                updated_at = NOW();
            END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_resumen_financiero`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_resumen_financiero` (
`revendedor_id` int(11)
,`nombre_negocio` varchar(100)
,`responsable` varchar(100)
,`tipo_ficha` varchar(50)
,`fichas_entregadas` int(11)
,`fichas_vendidas` int(11)
,`fichas_existentes` bigint(12)
,`precio` decimal(10,2)
,`comision` decimal(10,2)
,`subtotal` decimal(20,2)
,`comision_total` decimal(20,2)
,`total_neto` decimal(21,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_stock_global`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_stock_global` (
`tipo_ficha` varchar(50)
,`precio_base` decimal(10,2)
,`comision_base` decimal(10,2)
,`cantidad_total` int(11)
,`cantidad_disponible` int(11)
,`cantidad_entregada` int(11)
,`cantidad_consumida` bigint(13)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `v_resumen_financiero`
--
DROP TABLE IF EXISTS `v_resumen_financiero`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_resumen_financiero`  AS SELECT `r`.`id` AS `revendedor_id`, `r`.`nombre` AS `nombre_negocio`, `r`.`responsable` AS `responsable`, `tf`.`nombre` AS `tipo_ficha`, `ir`.`fichas_entregadas` AS `fichas_entregadas`, `ir`.`fichas_vendidas` AS `fichas_vendidas`, `ir`.`fichas_entregadas`- `ir`.`fichas_vendidas` AS `fichas_existentes`, `pr`.`precio` AS `precio`, `pr`.`comision` AS `comision`, `ir`.`fichas_vendidas`* `pr`.`precio` AS `subtotal`, `ir`.`fichas_vendidas`* `pr`.`comision` AS `comision_total`, `ir`.`fichas_vendidas`* `pr`.`precio` - `ir`.`fichas_vendidas` * `pr`.`comision` AS `total_neto` FROM (((`revendedores` `r` join `inventarios_revendedor` `ir` on(`r`.`id` = `ir`.`revendedor_id`)) join `tipos_ficha` `tf` on(`ir`.`tipo_ficha_id` = `tf`.`id`)) join `precios_revendedor` `pr` on(`r`.`id` = `pr`.`revendedor_id` and `tf`.`id` = `pr`.`tipo_ficha_id`)) WHERE `r`.`activo` = 1 AND `tf`.`activo` = 1 ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_stock_global`
--
DROP TABLE IF EXISTS `v_stock_global`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_stock_global`  AS SELECT `tf`.`nombre` AS `tipo_ficha`, `tf`.`precio_base` AS `precio_base`, `tf`.`comision_base` AS `comision_base`, `sg`.`cantidad_total` AS `cantidad_total`, `sg`.`cantidad_disponible` AS `cantidad_disponible`, `sg`.`cantidad_entregada` AS `cantidad_entregada`, `sg`.`cantidad_total`- `sg`.`cantidad_disponible` - `sg`.`cantidad_entregada` AS `cantidad_consumida` FROM (`tipos_ficha` `tf` join `stock_global` `sg` on(`tf`.`id` = `sg`.`tipo_ficha_id`)) WHERE `tf`.`activo` = 1 ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `abastecimientos`
--
ALTER TABLE `abastecimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tipo_ficha_id` (`tipo_ficha_id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `ajustes_stock`
--
ALTER TABLE `ajustes_stock`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tipo_ficha_id` (`tipo_ficha_id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `configuraciones`
--
ALTER TABLE `configuraciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `tareas_mantenimiento`
--
ALTER TABLE `tareas_mantenimiento`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `tareas_mantenimiento`
--
ALTER TABLE `tareas_mantenimiento`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
