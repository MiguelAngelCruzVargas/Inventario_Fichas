// TrabajadorWrapper.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFichas } from '../../context/FichasContext';
import VistaTrabajador from './VistaTrabajador';

const TrabajadorWrapper = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fichasContext = useFichas();

  console.log('🔧 TrabajadorWrapper - Renderizando para usuario:', user ? {
    id: user.id,
    username: user.username,
    tipo_usuario: user.tipo_usuario,
    nombre_completo: user.nombre_completo
  } : 'null');

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Prepare props for VistaTrabajador - solo necesitamos datos básicos
  const props = {
    revendedores: fichasContext.revendedores || [],
    currentUser: user,
    onLogout: handleLogout
  };

  console.log('📦 TrabajadorWrapper - Props para VistaTrabajador:', {
    revendedoresCount: props.revendedores.length,
    currentUser: props.currentUser ? props.currentUser.username : 'null'
  });

  return <VistaTrabajador {...props} />;
};

export default TrabajadorWrapper;
