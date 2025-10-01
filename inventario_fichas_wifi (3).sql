-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 22-08-2025 a las 05:55:46
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
(1, 1, 100, 'Stock Manual', NULL, 500.00, 'Stock agregado manualmente', 1, '2025-08-09 03:01:01'),
(2, 3, 50, 'Stock Manual', NULL, 1250.00, 'Stock agregado manualmente', 1, '2025-08-09 03:14:48'),
(3, 4, 98, 'Stock Manual', NULL, 1274.00, 'Stock agregado manualmente', 1, '2025-08-09 15:11:10');

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
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `tipo` enum('servicio','ocasional') NOT NULL,
  `nombre_completo` varchar(150) NOT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `plan` varchar(100) DEFAULT NULL,
  `velocidad_mbps` int(11) DEFAULT NULL,
  `cuota_mensual` decimal(10,2) DEFAULT NULL,
  `fecha_instalacion` date DEFAULT NULL,
  `dia_corte` tinyint(3) UNSIGNED DEFAULT NULL,
  `estado` enum('activo','suspendido','cancelado') DEFAULT 'activo',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes_pagos`
--

CREATE TABLE `clientes_pagos` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `periodo_year` smallint(6) NOT NULL,
  `periodo_month` tinyint(4) NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `estado` enum('pendiente','pagado','vencido','suspendido') NOT NULL DEFAULT 'pendiente',
  `pagado_at` datetime DEFAULT NULL,
  `corte_servicio_at` datetime DEFAULT NULL,
  `notas` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(6, 'porcentaje_ganancia_creador', '80', 'Porcentaje de ganancia del creador de fichas sobre las ventas', '2025-08-10 03:06:33');

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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `revendedor_id` int(11) DEFAULT NULL,
  `revendedor_nombre` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `cortes_caja`
--

INSERT INTO `cortes_caja` (`id`, `fecha_corte`, `usuario_id`, `usuario_nombre`, `total_ingresos`, `total_ganancias`, `total_revendedores`, `detalle_tipos`, `observaciones`, `created_at`, `updated_at`, `revendedor_id`, `revendedor_nombre`) VALUES
(0, '2025-08-09', 1, 'admin', 100.00, 20.00, 80.00, '[{\"tipo\":\"1 hora\",\"inventarioActual\":50,\"vendidas\":20,\"inventarioResultante\":30,\"valorVendido\":100,\"valor_total\":100,\"precio\":\"5.00\"},{\"tipo\":\"3 horas\",\"inventarioActual\":0,\"vendidas\":0,\"inventarioResultante\":0,\"valorVendido\":0,\"valor_total\":0,\"precio\":\"9.00\"},{\"tipo\":\"5 horas\",\"inventarioActual\":0,\"vendidas\":0,\"inventarioResultante\":0,\"valorVendido\":0,\"valor_total\":0,\"precio\":\"25.00\"}]', 'Corte para abarrotes', '2025-08-09 03:45:38', '2025-08-09 04:22:19', 7, 'abarrotes'),
(0, '2025-08-09', 1, 'admin', 130.00, 26.00, 104.00, '[{\"tipo\":\"1 hora\",\"inventarioActual\":25,\"vendidas\":0,\"inventarioResultante\":25,\"valorVendido\":0,\"valor_total\":0,\"precio\":\"5.00\"},{\"tipo\":\"3 horas\",\"inventarioActual\":0,\"vendidas\":0,\"inventarioResultante\":0,\"valorVendido\":0,\"valor_total\":0,\"precio\":\"9.00\"},{\"tipo\":\"5 horas\",\"inventarioActual\":0,\"vendidas\":0,\"inventarioResultante\":0,\"valorVendido\":0,\"valor_total\":0,\"precio\":\"25.00\"},{\"tipo\":\"10 horas\",\"inventarioActual\":50,\"vendidas\":10,\"inventarioResultante\":40,\"valorVendido\":130,\"valor_total\":130,\"precio\":\"13.00\"}]', 'Corte para abarrotes', '2025-08-09 15:13:11', '2025-08-09 15:13:11', 7, NULL),
(0, '2025-08-10', 1, 'admin', 10.00, 2.00, 8.00, '[{\"tipo\":\"1 hora\",\"inventarioActual\":25,\"vendidas\":2,\"inventarioResultante\":23,\"valorVendido\":10,\"valor_total\":10,\"precio\":\"5.00\"},{\"tipo\":\"3 horas\",\"inventarioActual\":0,\"vendidas\":0,\"inventarioResultante\":0,\"valorVendido\":0,\"valor_total\":0,\"precio\":\"9.00\"},{\"tipo\":\"5 horas\",\"inventarioActual\":0,\"vendidas\":0,\"inventarioResultante\":0,\"valorVendido\":0,\"valor_total\":0,\"precio\":\"25.00\"},{\"tipo\":\"10 horas\",\"inventarioActual\":40,\"vendidas\":0,\"inventarioResultante\":40,\"valorVendido\":0,\"valor_total\":0,\"precio\":\"13.00\"},{\"tipo\":\"1 semana\",\"inventarioActual\":0,\"vendidas\":0,\"inventarioResultante\":0,\"valorVendido\":0,\"valor_total\":0,\"precio\":\"100.00\"}]', 'Corte para abarrotes', '2025-08-09 16:11:33', '2025-08-09 16:11:33', 7, NULL);

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

--
-- Volcado de datos para la tabla `entregas`
--

INSERT INTO `entregas` (`id`, `revendedor_id`, `tipo_ficha_id`, `cantidad`, `tipo_movimiento`, `nota`, `created_by`, `created_at`, `updated_at`) VALUES
(0, 7, 1, 50, 'entrega', 'Entrega desde stock global', 1, '2025-08-09 03:43:09', '2025-08-09 03:43:09'),
(0, 7, 4, 50, 'entrega', 'Entrega desde stock global', 1, '2025-08-09 15:12:44', '2025-08-09 15:12:44');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `equipos`
--

CREATE TABLE `equipos` (
  `id` int(11) NOT NULL,
  `revendedor_id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `returned_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gastos`
--

CREATE TABLE `gastos` (
  `id` int(11) NOT NULL,
  `tipo` enum('prestado','viaticos') NOT NULL,
  `persona` varchar(150) NOT NULL,
  `monto` decimal(10,2) NOT NULL CHECK (`monto` >= 0),
  `motivo` varchar(255) DEFAULT NULL,
  `pagado` tinyint(1) NOT NULL DEFAULT 0,
  `pagado_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

--
-- Volcado de datos para la tabla `inventarios`
--

INSERT INTO `inventarios` (`id`, `revendedor_id`, `tipo_ficha_id`, `fichas_entregadas`, `fichas_vendidas`, `stock_actual`, `stock_minimo`, `ubicacion`, `fecha_actualizacion`, `activo`) VALUES
(0, 7, 1, 50, 27, 23, 10, NULL, '2025-08-09 16:11:33', 1),
(0, 7, 4, 50, 10, 40, 10, NULL, '2025-08-09 15:13:11', 1);

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
-- Estructura de tabla para la tabla `notas_trabajadores`
--

CREATE TABLE `notas_trabajadores` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `revendedor_id` int(11) DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `contenido` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `porcentaje_comision` decimal(5,2) NOT NULL DEFAULT 20.00 COMMENT 'Porcentaje de comisión sobre el total de ventas (ej: 20.00 = 20%)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `revendedores`
--

INSERT INTO `revendedores` (`id`, `usuario_id`, `nombre_negocio`, `nombre`, `responsable`, `telefono`, `direccion`, `latitud`, `longitud`, `activo`, `porcentaje_comision`, `created_at`, `updated_at`) VALUES
(7, 33, 'abarrotes', 'maria juana', 'maria juana', '', '', NULL, NULL, 1, 20.00, '2025-08-08 22:36:53', '2025-08-10 04:09:15');

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
(1, 29, 250, 48, 202, '2025-08-02 18:51:46'),
(0, 1, 100, 50, 50, '2025-08-09 03:43:09'),
(0, 2, 100, 100, 0, '2025-08-09 03:01:31'),
(0, 3, 50, 50, 0, '2025-08-09 03:14:48'),
(0, 4, 98, 48, 50, '2025-08-09 15:12:44');

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

--
-- Volcado de datos para la tabla `tareas_mantenimiento`
--

INSERT INTO `tareas_mantenimiento` (`id`, `revendedor_id`, `titulo`, `descripcion`, `prioridad`, `estado`, `fecha_asignacion`, `fecha_vencimiento`, `fecha_completado`, `notas`, `created_at`, `updated_at`, `created_by`, `trabajador_id`) VALUES
(1, 6, 'reivision de modem', 'revisa el modem', 'Media', 'Completado', '2025-08-08', '2025-08-09', '2025-08-08', 'solo era un clable', '2025-08-08 22:08:45', '2025-08-08 22:10:41', 1, 13),
(2, 7, 'revisar el moden', 'revisar el moden que se apaga', 'Media', 'Completado', '2025-08-08', '2025-08-09', '2025-08-08', 'solo era un cable mal conectado', '2025-08-08 22:39:27', '2025-08-08 22:48:50', 1, 14),
(3, 7, 'jbbb', 'iuhjhiih', 'Media', 'Completado', '2025-08-09', '2025-08-14', '2025-08-09', 'tdrtdr', '2025-08-09 15:14:31', '2025-08-09 15:16:13', 1, 14);

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
  `descripcion` varchar(255) DEFAULT NULL,
  `duracion_horas` int(11) NOT NULL,
  `precio_compra` decimal(10,2) NOT NULL DEFAULT 0.00,
  `precio_venta` decimal(10,2) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tipos_fichas`
--

INSERT INTO `tipos_fichas` (`id`, `nombre`, `descripcion`, `duracion_horas`, `precio_compra`, `precio_venta`, `activo`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, '1 hora', 'Ficha de 1 hora', 1, 0.00, 5.00, 1, '2025-08-09 02:54:48', '2025-08-09 02:54:48'),
(2, '3 horas', 'Ficha de 3 horas', 3, 0.00, 9.00, 1, '2025-08-09 02:54:48', '2025-08-09 02:54:48'),
(3, '5 horas', 'Ficha de 5 horas', 5, 0.00, 25.00, 1, '2025-08-09 03:06:29', '2025-08-09 03:06:29'),
(4, '10 horas', 'Ficha de 10 horas', 10, 0.00, 13.00, 1, '2025-08-09 15:10:22', '2025-08-09 15:10:22'),
(5, '1 semana', 'Ficha de 1 semana', 168, 0.00, 100.00, 1, '2025-08-09 15:46:20', '2025-08-09 15:46:20'),
(6, '2 horas', 'Ficha de 2 horas', 2, 0.00, 8.00, 1, '2025-08-10 03:08:39', '2025-08-10 03:08:39');

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
  `cliente_id` int(11) DEFAULT NULL,
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

INSERT INTO `usuarios` (`id`, `username`, `email`, `password_hash`, `nombre_completo`, `tipo_usuario`, `revendedor_id`, `cliente_id`, `activo`, `ultimo_login`, `fecha_creacion`, `created_at`, `updated_at`, `telefono`, `role`, `especialidad`) VALUES
(1, 'admin', 'admin@fichas.com', '$2b$10$vLnz3rDLw9NpaByJZsuIBOg94PGxNK7qnLk5gBeJqhGlYPVqUlct2', 'Administrador Principal', 'admin', NULL, NULL, 1, '2025-08-10 03:24:55', '2025-07-29 03:15:23', '2025-08-02 04:34:50', '2025-08-10 03:24:55', NULL, 'admin', NULL),
(33, 'maria', 'maria@empresa.com', '$2b$10$SeDJuFDYyguMKqmpP.BeW.Y4mdcEesgI18ZJqwWqh21/HbsqkuPb.', 'maria juana', 'revendedor', 7, NULL, 1, '2025-08-09 16:08:54', '2025-08-08 22:36:53', '2025-08-08 22:36:53', '2025-08-09 16:08:54', NULL, 'revendedor', NULL);

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
-- Estructura de tabla para la tabla `ventas_ocasionales`
--

CREATE TABLE `ventas_ocasionales` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `tipo_ficha_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `nota` varchar(255) DEFAULT NULL,
  `fecha_venta` date NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_clientes_tipo` (`tipo`),
  ADD KEY `idx_clientes_activo` (`activo`),
  ADD KEY `idx_clientes_estado` (`estado`),
  ADD KEY `idx_clientes_lat` (`latitud`),
  ADD KEY `idx_clientes_lng` (`longitud`);

--
-- Indices de la tabla `clientes_pagos`
--
ALTER TABLE `clientes_pagos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_cliente_periodo` (`cliente_id`,`periodo_year`,`periodo_month`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_estado` (`estado`);

--
-- Indices de la tabla `configuraciones`
--
ALTER TABLE `configuraciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `cortes_caja`
--
ALTER TABLE `cortes_caja`
  ADD KEY `idx_cortes_revendedor` (`revendedor_id`);

--
-- Indices de la tabla `equipos`
--
ALTER TABLE `equipos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_revendedor` (`revendedor_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_equipos_returned_at` (`returned_at`);

--
-- Indices de la tabla `gastos`
--
ALTER TABLE `gastos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_gastos_tipo` (`tipo`),
  ADD KEY `idx_gastos_persona` (`persona`),
  ADD KEY `idx_gastos_pagado` (`pagado`),
  ADD KEY `idx_gastos_created_at` (`created_at`);

--
-- Indices de la tabla `notas_trabajadores`
--
ALTER TABLE `notas_trabajadores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_revendedor` (`revendedor_id`);

--
-- Indices de la tabla `revendedores`
--
ALTER TABLE `revendedores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_revendedor_usuario` (`usuario_id`),
  ADD KEY `idx_revendedores_lat` (`latitud`),
  ADD KEY `idx_revendedores_lng` (`longitud`);

--
-- Indices de la tabla `tareas_mantenimiento`
--
ALTER TABLE `tareas_mantenimiento`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `tipos_fichas`
--
ALTER TABLE `tipos_fichas`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `trabajadores_mantenimiento`
--
ALTER TABLE `trabajadores_mantenimiento`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_trabajador_usuario` (`usuario_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuarios_cliente` (`cliente_id`);

--
-- Indices de la tabla `ventas_ocasionales`
--
ALTER TABLE `ventas_ocasionales`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_tipo_ficha` (`tipo_ficha_id`),
  ADD KEY `idx_fecha` (`fecha_venta`),
  ADD KEY `fk_vo_usuario` (`usuario_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `abastecimientos`
--
ALTER TABLE `abastecimientos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clientes_pagos`
--
ALTER TABLE `clientes_pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `equipos`
--
ALTER TABLE `equipos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `gastos`
--
ALTER TABLE `gastos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `notas_trabajadores`
--
ALTER TABLE `notas_trabajadores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `revendedores`
--
ALTER TABLE `revendedores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `tareas_mantenimiento`
--
ALTER TABLE `tareas_mantenimiento`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `tipos_fichas`
--
ALTER TABLE `tipos_fichas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `trabajadores_mantenimiento`
--
ALTER TABLE `trabajadores_mantenimiento`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT de la tabla `ventas_ocasionales`
--
ALTER TABLE `ventas_ocasionales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `clientes_pagos`
--
ALTER TABLE `clientes_pagos`
  ADD CONSTRAINT `fk_clientes_pagos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `equipos`
--
ALTER TABLE `equipos`
  ADD CONSTRAINT `fk_equipos_revendedor` FOREIGN KEY (`revendedor_id`) REFERENCES `revendedores` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `notas_trabajadores`
--
ALTER TABLE `notas_trabajadores`
  ADD CONSTRAINT `fk_notas_revendedor` FOREIGN KEY (`revendedor_id`) REFERENCES `revendedores` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `revendedores`
--
ALTER TABLE `revendedores`
  ADD CONSTRAINT `fk_revendedor_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `trabajadores_mantenimiento`
--
ALTER TABLE `trabajadores_mantenimiento`
  ADD CONSTRAINT `fk_trabajador_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `ventas_ocasionales`
--
ALTER TABLE `ventas_ocasionales`
  ADD CONSTRAINT `fk_vo_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  ADD CONSTRAINT `fk_vo_tipo_ficha` FOREIGN KEY (`tipo_ficha_id`) REFERENCES `tipos_fichas` (`id`),
  ADD CONSTRAINT `fk_vo_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
