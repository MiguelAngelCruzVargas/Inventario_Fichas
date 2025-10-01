// Barrel exports for shared modules
export * from '@context/AuthContext';
export * from '@context/FichasContext';
export * from '@context/UsersContext';

export { default as LoadingScreen } from '@components/common/LoadingScreen';
export { default as SessionChangeNotification } from '@components/common/SessionChangeNotification';
export { default as SessionExpirationWarning } from '@components/common/SessionExpirationWarning';

// Cliente helpers
export const formatClienteNombre = (r) => {
	if (!r) return '—';
	return r.responsable || r.nombre || r.nombre_negocio || '—';
};

export const formatClienteLargo = (r) => {
	if (!r) return '—';
	const persona = r.responsable || r.nombre || r.nombre_negocio || '—';
	const negocio = r.nombre_negocio && r.nombre_negocio !== persona ? ` — ${r.nombre_negocio}` : '';
	return `${persona}${negocio}`;
};
